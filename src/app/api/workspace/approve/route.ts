import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, canManage } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  const { versionId } = await request.json().catch(() => ({}));
  if (!orgId || !uuid.test(orgId) || typeof versionId !== "string" || !uuid.test(versionId)) return NextResponse.json({ error: "Virheellinen pyyntö" }, { status: 400 });
  if (!await canManage(orgId)) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  try { await db("rpc/approve_version", { method: "POST", body: JSON.stringify({ p_org: orgId, p_version: versionId }) }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Hyväksyntä epäonnistui. Tarkista hinnat ja päällekkäiset voimassaoloajat." }, { status: 400 }); }
}
