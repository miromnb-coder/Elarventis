import { supabaseServer } from "./server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export function configured() { return Boolean(url && key); }
export function baseUrl() { if (!url || !key) throw new Error("Supabase ei ole määritetty"); return url; }
export function publicKey() { if (!key) throw new Error("Supabase-avain puuttuu"); return key; }
export type AuthUser = { id: string; email: string; email_confirmed_at?: string };
export async function accessToken() { const client = await supabaseServer(); const { data } = await client.auth.getSession(); return data.session?.access_token; }
export async function currentUser(): Promise<AuthUser | null> {
  if (!configured()) return null;
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : { id: data.user.id, email: data.user.email || "", email_confirmed_at: data.user.email_confirmed_at };
}
export async function db<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Kirjautuminen vaaditaan");
  const res = await fetch(baseUrl() + "/rest/v1/" + path, {
    ...init, cache: "no-store",
    headers: { apikey: publicKey(), Authorization: "Bearer " + token, "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error("Tietokantapyyntö epäonnistui (" + res.status + ")");
  const content = await res.text();
  return content ? JSON.parse(content) as T : undefined as T;
}
export async function storage(path: string, init?: RequestInit) {
  const token = await accessToken();
  if (!token) throw new Error("Kirjautuminen vaaditaan");
  return fetch(baseUrl() + "/storage/v1/object/" + path, { ...init, cache: "no-store", headers: { apikey: publicKey(), Authorization: "Bearer " + token, ...(init?.headers || {}) } });
}

export async function canManage(orgId: string) {
  const user = await currentUser();
  if (!user) return false;
  try {
    const rows = await db<{ role: string }[]>("memberships?select=role&org_id=eq." + orgId + "&user_id=eq." + user.id + "&status=eq.active&limit=1");
    return rows.length > 0 && ["owner", "admin"].includes(rows[0].role);
  } catch { return false; }
}
