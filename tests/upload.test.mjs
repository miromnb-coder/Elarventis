import { test } from "node:test";
import { strict as assert } from "node:assert";
import { reconcileUpload } from "../src/lib/documents/upload-core.ts";
function fixture(initial, object = false) {
  let row = initial; let stored = object; let uploads = 0;
  const ports = {
    find: async () => row,
    reserve: async () => { row = { id: "doc", state: "uploading", uploader_id: "user", storage_path: "org/doc" }; return row; },
    retry: async () => { row.state = "uploading"; },
    head: async () => stored,
    upload: async () => { uploads++; stored = true; },
    finish: async () => { row.state = "stored"; },
    fail: async () => { row.state = "failed"; },
  };
  return { ports, get row() { return row; }, get uploads() { return uploads; } };
}
test("new upload finalizes and repeated upload is idempotent", async () => {
  const f = fixture(undefined);
  assert.deepEqual(await reconcileUpload(f.ports, "user"), { id: "doc", reused: false });
  assert.deepEqual(await reconcileUpload(f.ports, "user"), { id: "doc", reused: true });
  assert.equal(f.uploads, 1);
});
test("interrupted upload with existing object reconciles without overwrite", async () => {
  const f = fixture({ id: "doc", state: "uploading", uploader_id: "user", storage_path: "org/doc" }, true);
  await reconcileUpload(f.ports, "user");
  assert.equal(f.uploads, 0); assert.equal(f.row.state, "stored");
});
test("failed upload stays retryable and is retried once", async () => {
  const f = fixture({ id: "doc", state: "uploading", uploader_id: "user", storage_path: "org/doc" });
  const upload = f.ports.upload;
  f.ports.upload = async () => { throw new Error("network"); };
  await assert.rejects(reconcileUpload(f.ports, "user"), /network/);
  assert.equal(f.row.state, "failed");
  f.ports.upload = upload;
  await reconcileUpload(f.ports, "user");
  assert.equal(f.row.state, "stored");
});
test("another uploader cannot hijack a partial upload", async () => {
  const f = fixture({ id: "doc", state: "failed", uploader_id: "other", storage_path: "org/doc" });
  await assert.rejects(reconcileUpload(f.ports, "user"), /another user/);
});
