import type { Result } from "../audit-engine/index.ts";
export type Report = { organization: string; runId: string; invoiceNumber: string; invoiceDate: string; carrier: string; contractVersion: string;
  auditedAt: string; generatedAt: string; results: Result[]; acceptedLineIds: string[]; version: "1" };
function safeCell(value: unknown): string {
  const text = String(value ?? "");
  return /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? "'" + text : text;
}
function rows(report: Report): string[][] {
  const confirmed = new Set(report.acceptedLineIds);
  const coverage = report.results.filter(r => r.status === "OK" || r.status === "DISCREPANCY_REVIEW").length;
  const potential = report.results.reduce((n, r) => n + (r.status === "DISCREPANCY_REVIEW" ? Math.max(0, r.differenceMinor ?? 0) : 0), 0);
  return [
    ["Elarventis tarkastusraportti", "versio", report.version], ["Yritys", report.organization], ["Tarkastus", report.runId],
    ["Lasku", report.invoiceNumber], ["Laskupäivä", report.invoiceDate], ["Kuljetusliike", report.carrier],
    ["Sopimusversio", report.contractVersion], ["Tarkastettu", report.auditedAt], ["Muodostettu", report.generatedAt],
    ["Kattavuus", `${coverage}/${report.results.length}`], ["Mahdollinen hintaero sentteinä", String(potential)],
    ["Rivi", "Tila", "Laskutettu snt", "Sopimus snt", "Mahdollinen ero snt", "Päätös", "Peruste", "Kaava", "Sopimusversio", "Hintasääntö", "Laskulähde", "Sopimuslähde"],
    ...report.results.map(r => [r.lineId, r.status, String(r.billedMinor), r.expectedMinor === null ? "" : String(r.expectedMinor), r.differenceMinor === null ? "" : String(r.differenceMinor), confirmed.has(r.lineId) ? "hyväksytty" : "odottaa", r.reason, r.formula, r.contractVersionId ?? "", r.ruleId ?? "", r.sources[0] ? `${r.sources[0].documentId}:${r.sources[0].row ?? r.sources[0].page ?? ""}` : "", r.sources[1] ? `${r.sources[1].documentId}:${r.sources[1].row ?? r.sources[1].page ?? ""}` : ""]),
  ];
}
export function reportCsv(report: Report): Buffer {
  return Buffer.from("\uFEFF" + rows(report).map(row => row.map(value => `"${safeCell(value).replaceAll('"', '""')}"`).join(";")).join("\r\n") + "\r\n", "utf8");
}
export function complaintSummary(report: Report): string {
  const approved = new Set(report.acceptedLineIds);
  const lines = report.results.filter(r => approved.has(r.lineId) && r.status === "DISCREPANCY_REVIEW" && (r.differenceMinor ?? 0) > 0);
  const plain = (value: unknown) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 500);
  return [
    `Kuljetusliike: ${plain(report.carrier)}`,
    `Lasku: ${plain(report.invoiceNumber)}`,
    `Tarkastus: ${plain(report.runId)}`,
    ...lines.map(r => `Veloituserä ${plain(r.lineId)}: mahdollinen hintaero ${r.differenceMinor} snt. Sopimusversio ${plain(r.contractVersionId ?? "puuttuu")}, sääntö ${plain(r.ruleId ?? "puuttuu")}. Laskenta ${plain(r.formula)}. Lähteet ${r.sources.map(s => `${plain(s.documentId)}:${s.row ?? s.page ?? ""}`).join(", ")}.`),
  ].join("\n");
}
function xml(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function crc32(data: Buffer): number { let crc = 0xffffffff; for (const byte of data) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function zip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const file = Buffer.from(content); const key = Buffer.from(name); const crc = crc32(file);
    const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt32LE(crc, 14); local.writeUInt32LE(file.length, 18); local.writeUInt32LE(file.length, 22); local.writeUInt16LE(key.length, 26);
    locals.push(local, key, file);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt32LE(crc, 16); dir.writeUInt32LE(file.length, 20); dir.writeUInt32LE(file.length, 24); dir.writeUInt16LE(key.length, 28); dir.writeUInt32LE(offset, 42);
    central.push(dir, key); offset += local.length + key.length + file.length;
  }
  const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
export function reportXlsx(report: Report): Buffer {
  const sheet = `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows(report).map((row, i) => `<row r="${i + 1}">${row.map((cell, j) => `<c r="${String.fromCharCode(65 + j)}${i + 1}" t="inlineStr"><is><t>${xml(safeCell(cell))}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;
  return zip({ "[Content_Types].xml": '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    "_rels/.rels": '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Tarkastus" sheetId="1" r:id="rId1"/></sheets></workbook>',
    "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
    "xl/worksheets/sheet1.xml": sheet });
}
export function reportPdf(report: Report): Buffer {
  const lines = rows(report).flatMap(row => {
    const line = row.join("  ").normalize("NFKD").replace(/[^\x20-\x7e]/g, "?");
    return line.match(/.{1,100}/g) ?? [""];
  });
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += 50) pages.push(lines.slice(i, i + 50));
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids: string[] = [];
  pages.forEach(page => {
    const pageId = objects.length + 1; const contentId = pageId + 1;
    kids.push(`${pageId} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    const escaped = page.map(line => line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)"));
    const stream = `BT /F1 9 Tf 40 800 Td 14 TL ${escaped.map((line, i) => `${i ? "T* " : ""}(${line}) Tj`).join(" ")} ET`;
    objects.push(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
  });
  objects[1] = `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`;
  let output = "%PDF-1.4\n"; const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(output)); output += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = Buffer.byteLength(output); output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(output);
}
