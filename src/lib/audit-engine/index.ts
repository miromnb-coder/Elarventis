/** Pure, deterministic EUR minor-unit freight pricing. No database or parser calls. */
export const ENGINE_VERSION = "1.0.0";
export type Status = "OK" | "DISCREPANCY_REVIEW" | "MISSING_DATA" | "UNSUPPORTED_RULE" | "PARSER_REVIEW" | "ERROR";
export type Source = { documentId: string; row?: number; page?: number };
export type Charge = "base_freight" | "fuel" | "discount" | "minimum" | "other";
export type InvoiceLine = {
  id: string; shipmentRef?: string; serviceCode?: string; serviceDate?: string;
  charge: Charge; billedMinor: number; vatBasis: "including_vat" | "excluding_vat";
  weightG?: number; zone?: string; quantity?: number; reviewed: boolean; source: Source;
};
export type PriceRule = {
  id: string; type: "base_freight" | "weight_band" | "zone_price" | "service_price";
  serviceCode: string; zone?: string; minWeightG?: number; maxWeightG?: number;
  priceMinor: number; vatBasis: "including_vat" | "excluding_vat"; effectiveFrom?: string; effectiveTo?: string; source: Source;
};
export type PercentageRule = { id: string; basisPoints: number; base: "base" | "discounted_base"; source: Source };
export type Contract = {
  id: string; carrierId: string; state: "approved" | "draft" | "pending_review" | "superseded";
  effectiveFrom: string; effectiveTo?: string; rules: PriceRule[];
  discount?: PercentageRule; fuel?: PercentageRule; minimumMinor?: number;
};
export type Result = {
  lineId: string; status: Status; billedMinor: number; expectedMinor: number | null;
  differenceMinor: number | null; contractVersionId: string | null; ruleId: string | null;
  formula: string; sources: Source[]; engineVersion: string; reason: string;
};
export type AuditInput = { carrierId: string; lines: InvoiceLine[]; contracts: Contract[] };

function validMinor(n: number): boolean { return Number.isSafeInteger(n) && n >= 0; }
function roundHalfUp(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || denominator <= 0) throw new Error("Money overflow");
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}
function percent(base: number, basisPoints: number): number {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10000) throw new Error("Invalid percentage");
  return roundHalfUp(base * basisPoints, 10000);
}
function result(line: InvoiceLine, status: Status, reason: string, contract?: Contract, rule?: PriceRule, expected?: number, formula = ""): Result {
  return { lineId: line.id, status, billedMinor: line.billedMinor, expectedMinor: expected ?? null,
    differenceMinor: expected === undefined ? null : line.billedMinor - expected,
    contractVersionId: contract?.id ?? null, ruleId: rule?.id ?? null, formula,
    sources: [line.source, ...(rule ? [rule.source] : []), ...(contract?.discount ? [contract.discount.source] : []), ...(contract?.fuel ? [contract.fuel.source] : [])],
    engineVersion: ENGINE_VERSION, reason };
}
function chooseRule(line: InvoiceLine, contract: Contract): PriceRule | Status {
  const candidates = contract.rules.filter(rule => rule.serviceCode === line.serviceCode && rule.vatBasis === line.vatBasis &&
    (!rule.effectiveFrom || rule.effectiveFrom <= line.serviceDate!) && (!rule.effectiveTo || line.serviceDate! <= rule.effectiveTo));
  if (!candidates.length) return contract.rules.some(r => r.serviceCode === line.serviceCode) ? "MISSING_DATA" : "UNSUPPORTED_RULE";
  const matched = candidates.filter(rule => {
    if (rule.type === "weight_band") return line.weightG !== undefined && line.zone !== undefined && rule.zone === line.zone && rule.minWeightG !== undefined && rule.maxWeightG !== undefined && line.weightG >= rule.minWeightG && line.weightG < rule.maxWeightG;
    if (rule.type === "zone_price") return line.zone !== undefined && line.zone === rule.zone;
    return true;
  });
  if (matched.length !== 1) return matched.length ? "UNSUPPORTED_RULE" : "MISSING_DATA";
  return matched[0];
}
export function audit(input: AuditInput): Result[] {
  const keys = new Map<string, number>();
  for (const line of input.lines) if (line.shipmentRef && line.charge !== "other") {
    const key = `${line.shipmentRef}\u0000${line.charge}\u0000${line.serviceCode ?? ""}`;
    keys.set(key, (keys.get(key) ?? 0) + 1);
  }
  return input.lines.map(line => {
    if (!validMinor(line.billedMinor) || (line.quantity !== undefined && (!Number.isSafeInteger(line.quantity) || line.quantity < 1))) return result(line, "ERROR", "Virheellinen rahamäärä tai määrä");
    if (!line.reviewed) return result(line, "PARSER_REVIEW", "Laskuriviä ei ole tarkistettu");
    if (!line.shipmentRef || !line.serviceCode || !line.serviceDate) return result(line, "MISSING_DATA", "Lähetysviite, palvelu tai palvelupäivä puuttuu");
    if (line.charge === "other") return result(line, "UNSUPPORTED_RULE", "Veloitustyyppiä ei tueta");
    const matches = input.contracts.filter(c => c.carrierId === input.carrierId && c.state === "approved" && c.effectiveFrom <= line.serviceDate! && (!c.effectiveTo || line.serviceDate! <= c.effectiveTo));
    if (matches.length !== 1) return result(line, "MISSING_DATA", matches.length ? "Useita soveltuvia hyväksyttyjä versioita" : "Hyväksytty sopimusversio puuttuu");
    const contract = matches[0];
    const rule = chooseRule(line, contract);
    if (typeof rule === "string") return result(line, rule, rule === "MISSING_DATA" ? "Hinta-, vyöhyke-, paino- tai verotieto puuttuu" : "Yksiselitteistä hintasääntöä ei löytynyt", contract);
    if (!validMinor(rule.priceMinor)) return result(line, "ERROR", "Virheellinen sopimushinta", contract, rule);
    const qty = line.quantity ?? 1;
    let expected: number;
    let formula: string;
    const base = rule.priceMinor * qty;
    if (!Number.isSafeInteger(base)) return result(line, "ERROR", "Rahalaskennan ylivuoto", contract, rule);
    try {
      if (line.charge === "base_freight") { expected = base; formula = `${rule.priceMinor} × ${qty}`; }
      else if (line.charge === "discount") {
        if (!contract.discount) return result(line, "UNSUPPORTED_RULE", "Alennusehtoa ei ole", contract, rule);
        expected = percent(base, contract.discount.basisPoints); formula = `round_half_up(${base} × ${contract.discount.basisPoints} / 10000)`;
      } else if (line.charge === "fuel") {
        if (!contract.fuel) return result(line, "UNSUPPORTED_RULE", "Polttoainelisän ehtoa ei ole", contract, rule);
        const discounted = contract.discount ? base - percent(base, contract.discount.basisPoints) : base;
        const fuelBase = contract.fuel.base === "discounted_base" ? discounted : base;
        expected = percent(fuelBase, contract.fuel.basisPoints); formula = `round_half_up(${fuelBase} × ${contract.fuel.basisPoints} / 10000)`;
      } else {
        if (contract.minimumMinor === undefined || !validMinor(contract.minimumMinor)) return result(line, "UNSUPPORTED_RULE", "Vähimmäisveloituksen ehto puuttuu", contract, rule);
        expected = Math.max(0, contract.minimumMinor - base); formula = `max(0, ${contract.minimumMinor} - ${base})`;
      }
    } catch { return result(line, "ERROR", "Laskenta epäonnistui", contract, rule); }
    if (!validMinor(expected)) return result(line, "ERROR", "Rahalaskennan ylivuoto", contract, rule);
    const key = `${line.shipmentRef}\u0000${line.charge}\u0000${line.serviceCode}`;
    const duplicate = (keys.get(key) ?? 0) > 1;
    const status = duplicate || expected !== line.billedMinor ? "DISCREPANCY_REVIEW" : "OK";
    return result(line, status, duplicate ? "Mahdollinen kaksoisveloitus; käyttäjän tarkistus vaaditaan" : expected === line.billedMinor ? "Sopimushinta vastaa laskua" : "Laskutettu summa poikkeaa sopimushinnasta", contract, rule, expected, formula);
  });
}
