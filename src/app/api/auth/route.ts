import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { baseUrl, configured, publicKey } from "@/lib/supabase/rest";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!configured()) return NextResponse.json({ error: "Kirjautumista ei ole määritetty" }, { status: 503 });
  let input: Record<string, string>;
  try { input = await request.json(); } catch { return NextResponse.json({ error: "Virheellinen pyyntö" }, { status: 400 }); }
  if (!["login", "signup", "recovery", "logout", "update-password"].includes(input.action)) return NextResponse.json({ error: "Tuntematon toiminto" }, { status: 400 });
  if ((input.email && (!/^\S+@\S+\.\S+$/.test(input.email) || input.email.length > 254)) || (input.password && (input.password.length < 8 || input.password.length > 256))) return NextResponse.json({ error: "Virheellinen syöte" }, { status: 400 });
  const pending: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const client = createServerClient(baseUrl(), publicKey(), { cookies: {
    getAll() { return request.cookies.getAll(); },
    setAll(items) { pending.push(...items); },
  } });
  let result;
  let confirmationRequired = false;
  if (input.action === "login") result = await client.auth.signInWithPassword({ email: input.email, password: input.password });
  else if (input.action === "signup") { const signed = await client.auth.signUp({ email: input.email, password: input.password, options: { emailRedirectTo: request.nextUrl.origin + "/auth/callback" } }); result = signed; confirmationRequired = !signed.data.session; }
  else if (input.action === "recovery") result = await client.auth.resetPasswordForEmail(input.email, { redirectTo: request.nextUrl.origin + "/auth/callback?mode=recovery" });
  else if (input.action === "update-password") result = await client.auth.updateUser({ password: input.password });
  else result = await client.auth.signOut();
  if (result.error) return NextResponse.json({ error: "Toiminto epäonnistui. Tarkista tiedot ja yritä uudelleen." }, { status: 400 });
  const response = NextResponse.json({ ok: true, confirmationRequired });
  pending.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
  if (input.action === "logout") response.cookies.delete("elarventis-org");
  return response;
}
