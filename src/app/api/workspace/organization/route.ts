import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const input = await request.json().catch(() => ({}));
  if (typeof input.name !== "string" || input.name.trim().length < 2 || input.name.length > 160) return NextResponse.json({ error: "Virheellinen nimi" }, { status: 400 });
  try {
    const id = await db<string>("rpc/create_organization", { method: "POST", body: JSON.stringify({ p_name: input.name.trim() }) });
    const response = NextResponse.json({ id });
    response.cookies.set("elarventis-org", id, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/" });
    return response;
  } catch { return NextResponse.json({ error: "Työtilan luonti epäonnistui" }, { status: 400 }); }
}
