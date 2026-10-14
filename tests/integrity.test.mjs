import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { assertDocumentBytes } from "../src/lib/documents/integrity.ts";
test("stored bytes must equal the reserved length and digest",()=>{
  const content=Buffer.from("synthetic invoice");
  const digest=createHash("sha256").update(content).digest("hex");
  assert.doesNotThrow(()=>assertDocumentBytes(content,content.length,digest));
  assert.throws(()=>assertDocumentBytes(Buffer.from("synthetic invoicE"),content.length,digest),/integrity/);
  assert.throws(()=>assertDocumentBytes(content,content.length+1,digest),/integrity/);
});
