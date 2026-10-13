import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  if (typeof input.orgId !== "string" || !/^[0-9a-f-]{36}$/.test(input.orgId)) return NextResponse.json({ error: "Virheellinen työtila" }, { status: 400 });
  const rows = await db<{ org_id: string }[]>("memberships?select=org_id&org_id=eq." + input.orgId + "&status=eq.active&limit=1");
  if (!rows.length) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("elarventis-org", input.orgId, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/" });
  return response;
}
