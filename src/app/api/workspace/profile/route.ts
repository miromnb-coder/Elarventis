import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  if (typeof input.displayName !== "string" || input.displayName.length > 120) return NextResponse.json({ error: "Virheellinen nimi" }, { status: 400 });
  try {
    await db("profiles?on_conflict=user_id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: user.id, display_name: input.displayName.trim() || null }) });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Profiilin tallennus epäonnistui" }, { status: 400 }); }
}
