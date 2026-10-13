import { createHash, randomUUID } from "node:crypto";
import { db, storage } from "@/lib/supabase/rest";
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
      const response = await storage(`elarventis-documents/${path}`, { method: "POST", headers: { "Content-Type": mime }, body: bytes });
      if (!response.ok) throw new Error(`Storage ${response.status}`);
    },
    finish: async id => { await db("rpc/finish_document", { method: "POST", body: JSON.stringify({ p_org: orgId, p_document: id }) }); },
    fail: async id => { await db("rpc/fail_document", { method: "POST", body: JSON.stringify({ p_org: orgId, p_document: id }) }); },
  }, userId);
}
