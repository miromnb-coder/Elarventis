import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { baseUrl, configured, publicKey } from "@/lib/supabase/rest";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (!configured() || (!code && !(hash && ["signup", "recovery", "email"].includes(type || "")))) return NextResponse.redirect(new URL("/kirjaudu?error=linkki", request.url));
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const client = createServerClient(baseUrl(), publicKey(), { cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(items) { pending.push(...items); },
  } });
  const result = code ? await client.auth.exchangeCodeForSession(code) : await client.auth.verifyOtp({ token_hash: hash!, type: type as "signup" | "recovery" | "email" });
  if (result.error) return NextResponse.redirect(new URL("/kirjaudu?error=linkki", request.url));
  const response = NextResponse.redirect(new URL((type === "recovery" || request.nextUrl.searchParams.get("mode") === "recovery") ? "/palauta?mode=new" : "/app", request.url));
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  return response;
}
