import { createHash, timingSafeEqual } from "node:crypto";

export function assertDocumentBytes(stored: Buffer, size: number, digest: string) {
  if (stored.length !== size || size < 1 || size > 10_485_760 || !/^[a-f0-9]{64}$/.test(digest)) throw new Error("Document integrity failed");
  const actual = createHash("sha256").update(stored).digest();
  if (!timingSafeEqual(actual, Buffer.from(digest, "hex"))) throw new Error("Document integrity failed");
}
