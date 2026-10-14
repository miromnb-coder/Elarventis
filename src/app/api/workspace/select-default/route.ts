import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL("/kirjaudu", request.url));
  try {
    const rows = await db<{ org_id: string }[]>("memberships?select=org_id&user_id=eq." + user.id + "&status=eq.active&order=created_at.asc&limit=1");
    const response = NextResponse.redirect(new URL("/app", request.url));
    if (rows[0]) response.cookies.set("elarventis-org", rows[0].org_id, { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax", path: "/" });
    else response.cookies.delete("elarventis-org");
    return response;
  } catch { return NextResponse.redirect(new URL("/app?workspace=unavailable", request.url)); }
}
