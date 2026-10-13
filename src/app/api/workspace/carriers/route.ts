import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, canManage } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return NextResponse.json({ error: "Valitse työtila" }, { status: 400 });
  if (!await canManage(orgId)) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  const input = await request.json().catch(() => ({}));
  if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 160) return NextResponse.json({ error: "Virheellinen nimi" }, { status: 400 });
  try {
    const rows = await db<{ id: string }[]>("carriers?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ org_id: orgId, name: input.name.trim() }) });
    return NextResponse.json({ id: rows[0].id });
  } catch { return NextResponse.json({ error: "Kuljetusliikkeen lisäys epäonnistui" }, { status: 400 }); }
}
export async function GET(request: NextRequest) {
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return NextResponse.json({ error: "Valitse työtila" }, { status: 400 });
  try { return NextResponse.json(await db<{ id: string; name: string }[]>(`carriers?select=id,name&org_id=eq.${orgId}&archived_at=is.null&order=name.asc`)); }
  catch { return NextResponse.json({ error: "Kuljetusliikkeiden haku epäonnistui" }, { status: 500 }); }
}

