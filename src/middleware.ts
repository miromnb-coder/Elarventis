import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export async function middleware(request: NextRequest) {
  // The database schema and tenant isolation must be verified in the target
  // project before any authenticated workspace endpoint is exposed.
  const path = request.nextUrl.pathname;
  const api = path.startsWith("/api/");
  if (process.env.ELARVENTIS_MVP_ENABLED !== "enabled") {
    if (api) {
      return NextResponse.json({ error: "Työtila ei ole vielä käytettävissä" }, { status: 503 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }
  // Auth entry points must be reachable without an existing session.
  if (path === "/kirjaudu" || path === "/rekisteroidy" || path === "/palauta" || path.startsWith("/auth/callback") || path === "/api/auth") return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return api ? NextResponse.json({ error: "Yhteys puuttuu" }, { status: 503 }) : NextResponse.redirect(new URL("/kirjaudu", request.url));
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
  if (api) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  return NextResponse.redirect(new URL("/kirjaudu", request.url));
}
export const config = { matcher: ["/app/:path*", "/api/workspace/:path*", "/api/auth/:path*", "/auth/:path*", "/kirjaudu", "/rekisteroidy", "/palauta"] };

