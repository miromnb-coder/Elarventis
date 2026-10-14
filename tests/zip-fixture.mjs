import { deflateRawSync } from "node:zlib";
export function zipEntry(name, content) {
  const raw=Buffer.from(content), packed=deflateRawSync(raw), filename=Buffer.from(name);
  const local=Buffer.alloc(30); local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20,4); local.writeUInt16LE(8,8);
  local.writeUInt32LE(packed.length,18); local.writeUInt32LE(raw.length,22); local.writeUInt16LE(filename.length,26);
  const central=Buffer.alloc(46); central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20,4); central.writeUInt16LE(20,6); central.writeUInt16LE(8,10);
  central.writeUInt32LE(packed.length,20); central.writeUInt32LE(raw.length,24); central.writeUInt16LE(filename.length,28);
  const head=Buffer.concat([local,filename,packed]);
  const directory=Buffer.concat([central,filename]);
  const end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(1,8); end.writeUInt16LE(1,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(head.length,16);
  return Buffer.concat([head,directory,end]);
}
