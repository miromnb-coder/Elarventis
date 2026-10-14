import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  const org = input.orgId;
  if (!org || !uuid.test(org)) return NextResponse.json({ error: "Valitse yritys" }, { status: 400 });
  if (!uuid.test(input.userId || "") || !["role", "remove"].includes(input.action) ||
    (input.action === "role" && !["owner", "admin", "analyst", "viewer"].includes(input.role))) return NextResponse.json({ error: "Virheellinen pyyntö" }, { status: 400 });
  try {
    const rows = await db<{ role: string }[]>("memberships?select=role&org_id=eq." + org + "&user_id=eq." + user.id + "&status=eq.active&limit=1");
    if (!rows.length || !["owner", "admin"].includes(rows[0].role)) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
    await db(input.action === "role" ? "rpc/change_member_role" : "rpc/remove_member", {
      method: "POST", body: JSON.stringify(input.action === "role"
        ? { p_org: org, p_user: input.userId, p_role: input.role }
        : { p_org: org, p_user: input.userId }),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Muutosta ei voitu tehdä. Tarkista rooli ja viimeisen omistajan suoja." }, { status: 403 });
  }
}
