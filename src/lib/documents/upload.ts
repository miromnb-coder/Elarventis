import { createHash, randomUUID } from "node:crypto";
import { assertDocumentBytes } from "./integrity";
import { db, storage } from "@/lib/supabase/rest";
import { trustedRpc } from "@/lib/supabase/trusted";
import { reconcileUpload, type UploadRow } from "./upload-core";

type Kind = "contract_pdf" | "rate_csv" | "rate_xlsx" | "invoice_pdf" | "invoice_csv" | "invoice_xlsx";
export async function storeDocument(input: { orgId: string; userId: string; kind: Kind; name: string; mime: string; bytes: Buffer }) {
  const { orgId, userId, kind, name, mime, bytes } = input;
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const query = `documents?select=id,state,uploader_id,storage_path&org_id=eq.${orgId}&kind=eq.${kind}&sha256=eq.${sha256}`;
  return reconcileUpload({
    find: async () => (await db<UploadRow[]>(query))[0],
    reserve: async () => {
      const id = randomUUID(); const storage_path = `${orgId}/${id}`;
      await db("documents", { method: "POST", body: JSON.stringify({ id, org_id: orgId, kind, original_name: name.slice(0, 240), storage_path, sha256, mime, size_bytes: bytes.length, uploader_id: userId, state: "uploading" }) });
      return { id, storage_path, uploader_id: userId, state: "uploading" };
    },
    retry: async id => { await db("rpc/retry_document", { method: "POST", body: JSON.stringify({ p_org: orgId, p_document: id }) }); },
    head: async path => (await storage(`authenticated/elarventis-documents/${path}`, { method: "HEAD" })).ok,
    upload: async path => {
      const response = await storage(`elarventis-documents/${path}`, { method: "POST", headers: { "Content-Type": mime }, body: new Blob([new Uint8Array(bytes)], { type: mime }) });
      if (!response.ok) throw new Error(`Storage ${response.status}`);
    },
    remove: async path => {
      const response = await storage(`elarventis-documents/${path}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to remove corrupt upload");
    },
    finish: async id => {
      // Download the actual object; neither upload acknowledgement nor HEAD proves its contents.
      const row = (await db<UploadRow[]>(`documents?select=id,state,uploader_id,storage_path&org_id=eq.${orgId}&id=eq.${id}`))[0];
      if (!row || row.uploader_id !== userId || row.storage_path !== `${orgId}/${id}`) throw new Error("Document reservation changed");
      const response = await storage(`authenticated/elarventis-documents/${row.storage_path}`);
      if (!response.ok || Number(response.headers.get("content-length") || 0) > 10_485_760) throw new Error("Storage read failed");
      const stored = Buffer.from(await response.arrayBuffer());
      assertDocumentBytes(stored, bytes.length, sha256);
      await trustedRpc("verify_document", { p_org: orgId, p_document: id, p_actor: userId, p_sha256: sha256, p_size: stored.length });
    },
    fail: async id => { await db("rpc/fail_document", { method: "POST", body: JSON.stringify({ p_org: orgId, p_document: id }) }); },
  }, userId);
}
