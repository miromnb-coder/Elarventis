import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function GET(request: NextRequest) {
  if (!await currentUser()) return error("Kirjautuminen vaaditaan", 401);
  const orgId = request.cookies.get("elarventis-org")?.value;
  const resultId = request.nextUrl.searchParams.get("resultId");
  if (!orgId || !uuid.test(orgId) || !resultId || !uuid.test(resultId)) return error("Virheellinen havainto");
  try { return NextResponse.json({ history: await db<unknown[]>(`finding_decisions?select=id,decision,comment,actor_id,created_at&org_id=eq.${orgId}&result_id=eq.${resultId}&order=created_at.asc`) }); }
  catch { return error("Käsittelyhistorian haku epäonnistui", 500); }
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return error("Virheellinen alkuperä", 403);
  const user = await currentUser(); if (!user) return error("Kirjautuminen vaaditaan", 401);
  const orgId = request.cookies.get("elarventis-org")?.value;
  const input = await request.json().catch(() => ({}));
  if (!orgId || !uuid.test(orgId) || !uuid.test(input.resultId) || !["accepted", "rejected", "needs_review"].includes(input.decision) || (input.comment !== undefined && (typeof input.comment !== "string" || input.comment.length > 2000))) return error("Virheellinen päätös");
  const roles = await db<{ role: string }[]>(`memberships?select=role&org_id=eq.${orgId}&status=eq.active&limit=1`).catch(() => []);
  if (!roles.length || !["owner", "admin", "analyst"].includes(roles[0].role)) return error("Ei käyttöoikeutta", 403);
  try {
    const result = await db<{ id: string }[]>(`audit_results?select=id&org_id=eq.${orgId}&id=eq.${input.resultId}&status=eq.DISCREPANCY_REVIEW`);
    if (!result.length) return error("Poikkeamahavaintoa ei löytynyt", 404);
    const id = randomUUID();
    await db("finding_decisions", { method: "POST", body: JSON.stringify({ id, org_id: orgId, result_id: input.resultId, decision: input.decision, comment: input.comment?.trim() || null, actor_id: user.id }) });
    return NextResponse.json({ id });
  } catch { return error("Päätöksen tallennus epäonnistui", 403); }
}
