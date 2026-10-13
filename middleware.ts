import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return request.nextUrl.pathname.startsWith("/api/") ? NextResponse.json({ error: "Yhteys puuttuu" }, { status: 503 }) : NextResponse.redirect(new URL("/kirjaudu", request.url));
  const client = createServerClient(url, key, { cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(items) {
      items.forEach(({ name, value }) => request.cookies.set(name, value));
      response = NextResponse.next({ request });
      items.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    },
  } });
  const { data, error } = await client.auth.getUser();
  if (!error && data.user) return response;
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  return NextResponse.redirect(new URL("/kirjaudu", request.url));
}
export const config = { matcher: ["/app/:path*", "/api/workspace/:path*"] };
