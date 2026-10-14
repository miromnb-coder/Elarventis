import { zipEntry } from "./zip-fixture.mjs";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseInvoice } from "../src/lib/invoices/parse.ts";
const head = "INV-1;13.10.2026;EUR;105,00\nlahetys;palvelu;palvelupaiva;veloitus;summa_eur;alv;paino_g;vyohyke\n";
const row = "S1;PACK;12.10.2026;base_freight;105,00;ei_sisalla;500;1\n";
test("bounded CSV invoice keeps source row and requires review", () => {
  const parsed = parseInvoice(Buffer.from(head + row), "invoice.csv", "doc1");
  assert.equal(parsed.totalMinor, 10500);
  assert.equal(parsed.lines[0].source.row, 3);
  assert.equal(parsed.lines[0].serviceDate, "2026-10-12");
  assert.equal(parsed.lines[0].reviewed, false);
});
test("CSV rejects broken date and amount", () => {
  assert.throws(() => parseInvoice(Buffer.from(head + row.replace("12.10.2026", "31.02.2026")), "invoice.csv", "doc1"));
  assert.throws(() => parseInvoice(Buffer.from(head + row.replace("105,00", "105,001")), "invoice.csv", "doc1"));
});
test("limited XLSX invoice format", () => {
  const cells = (values, row) => values.map((value, i) => `<c r="${String.fromCharCode(65 + i)}${row}" t="inlineStr"><is><t>${value}</t></is></c>`).join("");
  const xml = `<worksheet><sheetData><row r="1">${cells(head.split("\n")[0].split(";"), 1)}</row><row r="2">${cells(head.split("\n")[1].split(";"), 2)}</row><row r="3">${cells(row.trim().split(";"), 3)}</row></sheetData></worksheet>`;
  assert.equal(parseInvoice(zipEntry("xl/worksheets/sheet1.xml", xml), "invoice.xlsx", "doc1").lines[0].billedMinor, 10500);
});
test("scanned PDF is clearly unsupported", () => {
  assert.throws(() => parseInvoice(Buffer.from("%PDF-1.4\n/Pages 1\n%%EOF"), "invoice.pdf", "doc1"), /OCR/);
});
test("supported text PDF template", () => {
  const lines = [head.split("\n")[0], head.split("\n")[1], row.trim()];
  const stream = lines.map(x => `(${x.replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj`).join("\n");
  const pdf = `%PDF-1.4\n1 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n%%EOF`;
  assert.equal(parseInvoice(Buffer.from(pdf), "invoice.pdf", "doc1").number, "INV-1");
});
