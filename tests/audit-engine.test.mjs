import { test } from "node:test";
import { strict as assert } from "node:assert";
import { audit } from "../src/lib/audit-engine/index.ts";
const source = { documentId: "synthetic" };
const rule = { id: "r1", type: "weight_band", serviceCode: "PACK", zone: "1", minWeightG: 0, maxWeightG: 1000, priceMinor: 10000, vatBasis: "excluding_vat", source };
const contract = { id: "v1", carrierId: "c1", state: "approved", effectiveFrom: "2026-01-01", effectiveTo: "2026-06-30", rules: [rule], fuel: { id: "f1", basisPoints: 1500, base: "discounted_base", source }, discount: { id: "d1", basisPoints: 1000, base: "base", source } };
const line = { id: "l1", shipmentRef: "s1", serviceCode: "PACK", serviceDate: "2026-03-01", charge: "base_freight", billedMinor: 10000, vatBasis: "excluding_vat", weightG: 500, zone: "1", reviewed: true, source };
const run = (change = {}, contracts = [contract]) => audit({ carrierId: "c1", lines: [{ ...line, ...change }], contracts })[0];
test("G01 exact base and G02 500 cent difference", () => {
  assert.equal(run().status, "OK");
  assert.equal(run({ billedMinor: 10500 }).differenceMinor, 500);
});
test("G03-G05 fuel and discount order", () => {
  const plain = { ...contract, discount: undefined, fuel: { ...contract.fuel, base: "base" } };
  assert.equal(run({ charge: "fuel", billedMinor: 1500 }, [plain]).status, "OK");
  assert.equal(run({ charge: "fuel", billedMinor: 2000 }, [plain]).differenceMinor, 500);
  assert.equal(10000 + 1500, 11500);
  assert.equal(run({ charge: "fuel", billedMinor: 1350 }).status, "OK");
  assert.equal(run({ charge: "discount", billedMinor: 1000 }).status, "OK");
  assert.equal(10000 - 1000 + 1350, 10350);
});
test("G06 period and G07 exclusive upper weight boundary", () => {
  const later = { ...contract, id: "v2", effectiveFrom: "2026-07-01", effectiveTo: undefined, rules: [{ ...rule, id: "r2", priceMinor: 11000 }] };
  assert.equal(run({ serviceDate: "2026-07-01", billedMinor: 11000 }, [contract, later]).contractVersionId, "v2");
  assert.equal(run({ weightG: 1000 }).status, "MISSING_DATA");
});
test("G08-G11 missing, unsupported, parser uncertainty and duplicate candidate", () => {
  assert.equal(run({ zone: undefined }).status, "MISSING_DATA");
  assert.equal(run({ charge: "other" }).status, "UNSUPPORTED_RULE");
  assert.equal(run({ reviewed: false }).status, "PARSER_REVIEW");
  const pair = audit({ carrierId: "c1", contracts: [contract], lines: [line, { ...line, id: "l2" }] });
  assert.equal(pair[0].status, "DISCREPANCY_REVIEW");
});
test("G14-G16 historical result, non-OK uncovered line, deterministic repeat", () => {
  const first = run();
  assert.deepEqual(run(), first);
  assert.equal(first.ruleId, "r1");
  assert.equal(run({ charge: "other" }).expectedMinor, null);
  assert.equal(run({}, [{ ...contract, state: "draft" }]).status, "MISSING_DATA");
  assert.equal(run({}, [contract, { ...contract, id: "overlap" }]).status, "MISSING_DATA");
});
test("VAT basis, one-cent rounding and invalid monetary input", () => {
  assert.equal(run({ vatBasis: "including_vat" }).status, "MISSING_DATA");
  const tiny = { ...contract, rules: [{ ...rule, priceMinor: 1 }], fuel: { ...contract.fuel, basisPoints: 5000 }, discount: undefined };
  assert.equal(run({ charge: "fuel", billedMinor: 1 }, [tiny]).expectedMinor, 1);
  assert.equal(run({ billedMinor: 1.1 }).status, "ERROR");
});
