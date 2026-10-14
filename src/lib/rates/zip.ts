import { inflateRawSync } from "node:zlib";

/** Bound every ZIP entry before parsing worksheet XML; no ZIP64 or descriptors. */
export function validateWorkbookZip(bytes: Buffer) {
  if (bytes.length < 22 || bytes.length > 10_485_760) throw new Error("Virheellinen XLSX-koko");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new Error("XLSX-keskushakemisto puuttuu");
  const count=bytes.readUInt16LE(end+10), dirSize=bytes.readUInt32LE(end+12), start=bytes.readUInt32LE(end+16);
  if (!count || count>200 || bytes.readUInt16LE(end+4) || bytes.readUInt16LE(end+6) || bytes.readUInt16LE(end+8)!==count || start+dirSize!==end) throw new Error("Virheellinen XLSX-hakemisto");
  let offset=start, expanded=0, lastEnd=0; const seen=new Set<string>();
  for(let i=0;i<count;i++) {
    if(offset+46>end || bytes.readUInt32LE(offset)!==0x02014b50) throw new Error("Virheellinen XLSX-merkintä");
    const flags=bytes.readUInt16LE(offset+8), method=bytes.readUInt16LE(offset+10), packed=bytes.readUInt32LE(offset+20), size=bytes.readUInt32LE(offset+24);
    const nameSize=bytes.readUInt16LE(offset+28), extra=bytes.readUInt16LE(offset+30), comment=bytes.readUInt16LE(offset+32), local=bytes.readUInt32LE(offset+42);
    const next=offset+46+nameSize+extra+comment;
    if(next>end || local+30>start) throw new Error("Virheellinen XLSX-osoite");
    const name=bytes.subarray(offset+46,offset+46+nameSize).toString("utf8");
    if(!name || name.startsWith("/") || name.includes("..") || seen.has(name) || flags!==0 || ![0,8].includes(method) || size>5_000_000 || size>Math.max(1_048_576,packed*100) || expanded+size>10_000_000) throw new Error("Turvaton XLSX-sisältö");
    if(bytes.readUInt32LE(local)!==0x04034b50 || bytes.readUInt16LE(local+6)!==flags || bytes.readUInt16LE(local+8)!==method || bytes.readUInt32LE(local+18)!==packed || bytes.readUInt32LE(local+22)!==size) throw new Error("XLSX-otsake ei täsmää");
    const localName=bytes.subarray(local+30,local+30+bytes.readUInt16LE(local+26)).toString("utf8");
    if(localName!==name) throw new Error("XLSX-nimi ei täsmää");
    const dataStart=local+30+bytes.readUInt16LE(local+26)+bytes.readUInt16LE(local+28);
    if(local<lastEnd || dataStart+packed>start) throw new Error("Päällekkäiset XLSX-tiedostot");
    const payload=bytes.subarray(dataStart,dataStart+packed);
    const output=method===8 ? inflateRawSync(payload,{maxOutputLength:5_000_000}) : payload;
    if(output.length!==size || /<!DOCTYPE|<!ENTITY/i.test(output.toString("utf8"))) throw new Error("Virheellinen XLSX-XML");
    expanded+=output.length; lastEnd=dataStart+packed; seen.add(name); offset=next;
  }
  if(offset!==end || !seen.has("xl/worksheets/sheet1.xml")) throw new Error("XLSX-taulukko puuttuu");
}
