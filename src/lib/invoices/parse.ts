import { inflateSync } from "node:zlib";
import { cents, parseCsv, parseXlsx } from "../rates/parse.ts";
import type { InvoiceLine } from "../audit-engine/index.ts";

export type ExtractedInvoice = { number: string; date: string; currency: "EUR"; totalMinor: number; lines: InvoiceLine[]; warnings: string[]; parserVersion: string };
export type ColumnMap = Record<"shipmentRef" | "serviceCode" | "serviceDate" | "charge" | "billed" | "vatBasis" | "weightG" | "zone", string>;
export const DEFAULT_COLUMNS: ColumnMap = { shipmentRef: "lahetys", serviceCode: "palvelu", serviceDate: "palvelupaiva", charge: "veloitus", billed: "summa_eur", vatBasis: "alv", weightG: "paino_g", zone: "vyohyke" };
function date(raw: string): string {
  const value = raw.trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(value);
  const normalized = m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number.isNaN(Date.parse(normalized)) || new Date(normalized).toISOString().slice(0, 10) !== normalized) throw new Error("Virheellinen päivämäärä");
  return normalized;
}
function fromMatrix(matrix: string[][], documentId: string, map: ColumnMap): ExtractedInvoice {
  if (matrix.length < 3 || matrix.length > 1002) throw new Error("Laskun rivimäärä ei ole sallittu");
  // First row: laskunumero,laskupaiva,valuutta,kokonaissumma_eur; second row is the line header.
  const [number, rawDate, currency, total] = matrix[0].map(v => v?.trim());
  if (!number || number.length > 100 || currency !== "EUR") throw new Error("Laskun otsake ei vastaa tuettua mallia");
  const header = matrix[1].map(v => v.trim().toLowerCase());
  const required: (keyof ColumnMap)[] = ["shipmentRef", "serviceCode", "serviceDate", "charge", "billed", "vatBasis"];
  if (required.some(key => !header.includes(map[key].toLowerCase()))) throw new Error("Laskun sarakevastaavuus on puutteellinen");
  const lines: InvoiceLine[] = [];
  const warnings: string[] = [];
  for (let index = 2; index < matrix.length; index++) {
    const row = matrix[index]; if (!row.some(Boolean)) continue;
    const get = (key: keyof ColumnMap) => (row[header.indexOf(map[key].toLowerCase())] ?? "").trim();
    const charge = get("charge");
    const vat = get("vatBasis");
    if (!vat || !["sisaltaa", "ei_sisalla"].includes(vat)) throw new Error(`Virheellinen ALV rivillä ${index + 1}`);
    const weight = get("weightG");
    if (weight && (!/^\d+$/.test(weight) || Number(weight) > 100000000)) throw new Error(`Virheellinen paino rivillä ${index + 1}`);
    const serviceDate = get("serviceDate");
    const parsedCharge = ["base_freight", "fuel", "discount", "minimum"].includes(charge) ? charge as InvoiceLine["charge"] : "other";
    const reviewed = Boolean(get("shipmentRef") && get("serviceCode") && serviceDate && charge && get("billed"));
    if (!reviewed || parsedCharge === "other") warnings.push(`Rivi ${index + 1} vaatii tarkistuksen`);
    lines.push({ id: `${documentId}:${index + 1}`, shipmentRef: get("shipmentRef") || undefined, serviceCode: get("serviceCode") || undefined,
      serviceDate: serviceDate ? date(serviceDate) : undefined, charge: parsedCharge, billedMinor: cents(get("billed")),
      vatBasis: vat === "sisaltaa" ? "including_vat" : "excluding_vat", weightG: weight ? Number(weight) : undefined,
      zone: get("zone") || undefined, reviewed: false, source: { documentId, row: index + 1 } });
  }
  if (!lines.length) throw new Error("Laskurivit puuttuvat");
  const totalMinor = cents(total ?? "");
  const sum = lines.reduce((n, l) => n + l.billedMinor, 0);
  if (sum !== totalMinor) warnings.push("Rivisumma poikkeaa laskun kokonaissummasta; tarkista verokäsittely");
  return { number, date: date(rawDate ?? ""), currency: "EUR", totalMinor, lines, warnings, parserVersion: "tabular-v1" };
}
function pdfText(bytes: Buffer): string {
  const raw = bytes.toString("latin1");
  if (!raw.startsWith("%PDF-") || !raw.slice(-2048).includes("%%EOF")) throw new Error("Virheellinen PDF");
  const parts: string[] = [];
  for (const match of raw.matchAll(/<<(.*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/gs)) {
    const data = Buffer.from(match[2], "latin1");
    const decoded = /FlateDecode/.test(match[1]) ? inflateSync(data, { maxOutputLength: 2_000_000 }).toString("latin1") : data.toString("latin1");
    for (const text of decoded.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj/g)) parts.push(text[0].slice(1, text[0].lastIndexOf(")")).replace(/\\([()\\])/g, "$1"));
  }
  return parts.join("\n");
}
export function parseInvoice(bytes: Buffer, filename: string, documentId: string, columns: ColumnMap = DEFAULT_COLUMNS): ExtractedInvoice {
  if (bytes.length < 10 || bytes.length > 10_485_760) throw new Error("Tiedoston koko ei ole sallittu");
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) return fromMatrix(parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "")), documentId, columns);
  if (lower.endsWith(".xlsx")) return fromMatrix(parseXlsx(bytes), documentId, columns);
  if (lower.endsWith(".pdf")) {
    const text = pdfText(bytes);
    if (!text.trim()) throw new Error("PDF ei sisällä tuettua tekstikerrosta; OCR vaaditaan");
    // Supported template embeds one UTF-8-safe, semicolon-delimited record per PDF text object.
    return fromMatrix(parseCsv(text), documentId, columns);
  }
  throw new Error("Tiedostomuotoa ei tueta");
}

export interface AiExtractionAdapter {
  propose(input: { documentId: string; untrustedText: string }): Promise<{ proposal: unknown; confidence: number }>;
}
