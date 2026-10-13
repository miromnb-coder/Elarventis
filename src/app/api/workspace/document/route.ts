import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, canManage } from "@/lib/supabase/rest";
import { storeDocument } from "@/lib/documents/upload";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  const user = await currentUser(); if (!user) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return NextResponse.json({ error: "Valitse työtila" }, { status: 400 });
  if (!await canManage(orgId)) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file"); const versionId = form?.get("versionId");
  if (!(file instanceof File) || typeof versionId !== "string" || !uuid.test(versionId) || !file.name.toLowerCase().endsWith(".pdf") || file.size < 8 || file.size > 10_485_760) return NextResponse.json({ error: "Vain enintään 10 Mt PDF on sallittu" }, { status: 400 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.subarray(0,5).toString() !== "%PDF-" || !bytes.subarray(-2048).includes(Buffer.from("%%EOF"))) return NextResponse.json({ error: "PDF-rakenne on virheellinen" }, { status: 400 });
  try {
    const versions = await db<{ id: string; state: string }[]>("contract_versions?select=id,state&id=eq." + versionId + "&org_id=eq." + orgId);
    if (!versions.length || versions[0].state !== "draft") return NextResponse.json({ error: "Versiota ei voi muokata" }, { status: 403 });
    const { id: documentId } = await storeDocument({ orgId, userId: user.id, kind: "contract_pdf", name: file.name, mime: "application/pdf", bytes });
    await db("contract_versions?org_id=eq." + orgId + "&id=eq." + versionId, { method: "PATCH", body: JSON.stringify({ document_id: documentId }) });
    return NextResponse.json({ id: documentId });
  } catch { return NextResponse.json({ error: "Dokumentin tallennus epäonnistui" }, { status: 400 }); }
}

