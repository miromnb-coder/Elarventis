export type UploadRow = { id: string; state: "uploading" | "stored" | "failed" | "invalid" | "archived"; uploader_id: string; storage_path: string };
export type UploadPorts = {
  find(): Promise<UploadRow | undefined>;
  reserve(): Promise<UploadRow>;
  retry(id: string): Promise<void>;
  head(path: string): Promise<boolean>;
  upload(path: string): Promise<void>;
  finish(id: string): Promise<void>;
  fail(id: string): Promise<void>;
};
/** A failed RPC after a successful Storage write leaves an upload to reconcile. */
export async function reconcileUpload(ports: UploadPorts, userId: string): Promise<{ id: string; reused: boolean }> {
  let row = await ports.find();
  if (row?.state === "stored") return { id: row.id, reused: true };
  if (row && row.uploader_id !== userId) throw new Error("Upload reserved by another user");
  if (row && !["uploading", "failed"].includes(row.state)) throw new Error("Document cannot be retried");
  if (!row) {
    try { row = await ports.reserve(); }
    catch {
      row = await ports.find();
      if (!row || row.uploader_id !== userId) throw new Error("Upload reservation failed");
      if (row.state === "stored") return { id: row.id, reused: true };
      if (!["uploading", "failed"].includes(row.state)) throw new Error("Document cannot be retried");
    }
  }
  if (row.state === "failed") await ports.retry(row.id);
  try {
    if (!await ports.head(row.storage_path)) await ports.upload(row.storage_path);
    await ports.finish(row.id);
    return { id: row.id, reused: false };
  } catch (cause) {
    // Never delete an object here: a timeout can hide a successful write.
    const exists = await ports.head(row.storage_path).catch(() => true);
    if (!exists) await ports.fail(row.id).catch(() => undefined);
    throw cause;
  }
}
