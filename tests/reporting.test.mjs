import { test } from "node:test";
import { strict as assert } from "node:assert";
import { complaintSummary, reportCsv, reportPdf, reportXlsx } from "../src/lib/reporting/index.ts";
const report = { organization: "=ATTACK()", runId: "run1", invoiceNumber: "INV-1", invoiceDate: "2026-10-13", carrier: "Carrier", contractVersion: "v1", auditedAt: "2026-10-13T12:00:00Z", generatedAt: "2026-10-13T12:00:00Z", version: "1", acceptedLineIds: [], results: [{ lineId: "l1", status: "DISCREPANCY_REVIEW", billedMinor: 10500, expectedMinor: 10000, differenceMinor: 500, contractVersionId: "v1", ruleId: "r1", formula: "10000 × 1", sources: [{ documentId: "invoice", row: 3 }, { documentId: "contract", row: 2 }], engineVersion: "1.0.0", reason: "Difference" }] };
test("CSV includes exact cents and neutralizes spreadsheet formulas", () => {
  const text = reportCsv(report).toString();
  assert.match(text, /"'=ATTACK\(\)"/);
  assert.match(text, /"500"/);
  assert.match(text, /"invoice:3"/);
});
test("XLSX is a ZIP workbook with escaped cells", () => {
  const file = reportXlsx(report);
  assert.equal(file.readUInt32LE(0), 0x04034b50);
  assert.ok(file.includes(Buffer.from("&apos;=ATTACK()")));
});
test("PDF is a bounded readable report", () => {
  const file = reportPdf(report);
  assert.ok(file.toString().startsWith("%PDF-1.4"));
  assert.ok(file.includes(Buffer.from("INV-1")));
});
test("PDF retains all results across pages", () => {
  const many = { ...report, results: Array.from({ length: 80 }, (_, index) => ({ ...report.results[0], lineId: `line-${index}` })) };
  const file = reportPdf(many).toString();
  assert.match(file, /line-79/);
  assert.match(file, /\/Count [2-9]/);
});
test("complaint summary includes only approved positive findings", () => {
  assert.doesNotMatch(complaintSummary(report), /Veloituserä/);
  assert.match(complaintSummary({ ...report, acceptedLineIds: ["l1"] }), /500 snt/);
});
