import { zipEntry } from "./zip-fixture.mjs";
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { parseRates, cents } from "../src/lib/rates/parse.ts";
test("exact cents reject extra decimals and malformed amounts", () => {
  assert.equal(cents("100,05"), 10005);
  assert.throws(() => cents("1,005"));
  assert.throws(() => cents("-1"));
});
test("CSV parser rejects missing fields and accepts a bounded weight band", () => {
  const valid = Buffer.from("palvelu;vyohyke;paino_alku_g;paino_loppu_g;hinta_eur;alv\nPaketti;1;0;1000;12,50;ei_sisalla\n");
  assert.deepEqual(parseRates(valid, "rates.csv")[0], { service_code: "Paketti", zone: "1", min_weight_g: 0, max_weight_g: 1000, price_minor: 1250, vat_basis: "excluding_vat", source_row: 2 });
  assert.throws(() => parseRates(Buffer.from("palvelu;hinta_eur\nPaketti;12,50"), "bad.csv"));
});
test("weight boundaries, formulas and incomplete headers are rejected", () => {
  const header = "palvelu;vyohyke;paino_alku_g;paino_loppu_g;hinta_eur;alv\n";
  assert.throws(() => parseRates(Buffer.from(header + "Paketti;1;1000;1000;12,50;ei_sisalla\n"), "bad.csv"));
  assert.throws(() => parseRates(Buffer.from(header + "Paketti;1;0;1000;12,500;ei_sisalla\n"), "bad.csv"));
  assert.throws(() => parseRates(Buffer.from(header + "Paketti;1;0;1000;=1+1;ei_sisalla\n"), "bad.csv"));
});

test("limited XLSX first sheet imports synthetic values", () => {
  const labels = ["palvelu","vyohyke","paino_alku_g","paino_loppu_g","hinta_eur","alv"];
  const values = ["Paketti","1","0","1000","12.50","ei_sisalla"];
  const cells = row => row.map((value, index) => '<c r="' + String.fromCharCode(65 + index) + '1" t="inlineStr"><is><t>' + value + '</t></is></c>').join("");
  const sheet = '<worksheet><sheetData><row r="1">' + cells(labels) + '</row><row r="2">' + cells(values).replaceAll('1"','2"') + '</row></sheetData></worksheet>';
  const bytes = zipEntry("xl/worksheets/sheet1.xml", sheet);
  assert.equal(parseRates(bytes, "rates.xlsx")[0].price_minor, 1250);
});
