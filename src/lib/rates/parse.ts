import { inflateRawSync } from "node:zlib";
export type RateRow = { service_code: string; zone: string; min_weight_g: number; max_weight_g: number; price_minor: number; vat_basis: "including_vat" | "excluding_vat"; source_row: number };
export function cents(text: string): number {
  const value = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value)) throw new Error("Virheellinen hinta");
  const [whole, fraction = ""] = value.split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 2147483647) throw new Error("Hinta ylittää sallitun rajan");
  return result;
}
function parseCsv(text: string): string[][] {
  const delimiter = text.split("\n", 1)[0].includes(";") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quote = false; else cell += ch; }
    else if (ch === '"') quote = true;
    else if (ch === delimiter) { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (quote) throw new Error("CSV-lainaus jäi avoimeksi");
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function xmlUnescape(s: string) { return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&"); }
function entry(bytes: Buffer, wanted: string): string {
  let offset = 0; let count = 0; let expanded = 0;
  while (offset + 30 < bytes.length && count++ < 200) {
    if (bytes.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = bytes.readUInt16LE(offset + 6);
    const method = bytes.readUInt16LE(offset + 8);
    const packed = bytes.readUInt32LE(offset + 18);
    const unpacked = bytes.readUInt32LE(offset + 22);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    if (flags & 8 || unpacked > 5_000_000 || expanded + unpacked > 10_000_000) throw new Error("Excel-rakenne ei ole tuettu");
    const start = offset + 30 + nameLength + extraLength;
    if (start + packed > bytes.length) throw new Error("Rikkoutunut Excel-tiedosto");
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    expanded += unpacked;
    if (name === wanted) {
      const data = bytes.subarray(start, start + packed);
      const output = method === 0 ? data : method === 8 ? inflateRawSync(data, { maxOutputLength: 5_000_000 }) : null;
      if (!output || output.length !== unpacked) throw new Error("Rikkoutunut Excel-sisältö");
      return new TextDecoder("utf-8", { fatal: true }).decode(output);
    }
    offset = start + packed;
  }
  throw new Error("Excel-taulukko puuttuu");
}
function parseXlsx(bytes: Buffer): string[][] {
  if (bytes.subarray(0, 4).toString("hex") !== "504b0304") throw new Error("Virheellinen Excel-tiedosto");
  const strings: string[] = [];
  try {
    const shared = entry(bytes, "xl/sharedStrings.xml");
    for (const match of shared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) strings.push(xmlUnescape([...match[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(part => part[1]).join("")));
  } catch { /* A workbook may use inline strings only. */ }
  const sheet = entry(bytes, "xl/worksheets/sheet1.xml");
  if (/<f\b/.test(sheet)) throw new Error("Kaavoja sisältävää hinnastoa ei tueta");
  const rows: string[][] = [];
  for (const row of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cell of row[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cell[1])?.[1];
      if (!ref) throw new Error("Virheellinen solun viite");
      let index = 0; for (const letter of ref) index = index * 26 + letter.charCodeAt(0) - 64;
      if (index > 32) throw new Error("Liikaa sarakkeita");
      const raw = /<v>([\s\S]*?)<\/v>/.exec(cell[2])?.[1] || /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(cell[2])?.[1] || "";
      cells[index - 1] = /\bt="s"/.test(cell[1]) ? strings[Number(raw)] : xmlUnescape(raw);
    }
    rows.push(cells.map(v => v || ""));
    if (rows.length > 1001) throw new Error("Liikaa hintarivejä");
  }
  return rows;
}
export function parseRates(bytes: Buffer, filename: string): RateRow[] {
  if (bytes.length < 10 || bytes.length > 10_485_760) throw new Error("Tiedoston koko ei ole sallittu");
  const matrix = filename.toLowerCase().endsWith(".csv") ? parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "")) : filename.toLowerCase().endsWith(".xlsx") ? parseXlsx(bytes) : (() => { throw new Error("Tiedostomuoto ei ole tuettu"); })();
  const required = ["palvelu", "vyohyke", "paino_alku_g", "paino_loppu_g", "hinta_eur", "alv"];
  const header = (matrix.shift() || []).map(v => v.trim().toLowerCase());
  if (required.some(h => !header.includes(h)) || header.length !== required.length) throw new Error("Hinnaston sarakeotsikot eivät vastaa tuettua mallia");
  if (!matrix.length || matrix.length > 1000) throw new Error("Hinnaston rivimäärä ei ole sallittu");
  return matrix.filter(row => row.some(Boolean)).map((row, index) => {
    const get = (name: string) => (row[header.indexOf(name)] || "").trim();
    const min = get("paino_alku_g"); const max = get("paino_loppu_g"); const vat = get("alv");
    if (!/^\d+$/.test(min) || !/^\d+$/.test(max) || Number(max) <= Number(min) || Number(max) > 100000000) throw new Error("Virheellinen painoluokka rivillä " + (index + 2));
    if (!["sisaltaa", "ei_sisalla"].includes(vat)) throw new Error("Virheellinen ALV-käsittely rivillä " + (index + 2));
    if (!get("palvelu") || !get("vyohyke") || get("palvelu").length > 80 || get("vyohyke").length > 80) throw new Error("Puuttuva palvelu tai vyöhyke rivillä " + (index + 2));
    return { service_code: get("palvelu"), zone: get("vyohyke"), min_weight_g: Number(min), max_weight_g: Number(max), price_minor: cents(get("hinta_eur")), vat_basis: vat === "sisaltaa" ? "including_vat" : "excluding_vat", source_row: index + 2 };
  });
}
