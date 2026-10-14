import { test } from "node:test";
import { strict as assert } from "node:assert";
import { zipEntry } from "./zip-fixture.mjs";
import { validateWorkbookZip } from "../src/lib/rates/zip.ts";
test("XLSX requires a matching central directory and rejects inflated-size lies",()=>{
  const zip=zipEntry("xl/worksheets/sheet1.xml","<worksheet/>");
  assert.doesNotThrow(()=>validateWorkbookZip(zip));
  assert.throws(()=>validateWorkbookZip(zip.subarray(0,zip.length-22)),/hakemisto/);
  const forged=Buffer.from(zip); forged.writeUInt32LE(1,22);
  assert.throws(()=>validateWorkbookZip(forged),/otsake/);
});
test("XLSX rejects XML entities and unsafe names",()=>{
  assert.throws(()=>validateWorkbookZip(zipEntry("xl/worksheets/sheet1.xml","<!DOCTYPE foo>")),/XML/);
  assert.throws(()=>validateWorkbookZip(zipEntry("../xl/worksheets/sheet1.xml","x")),/Turvaton/);
});
