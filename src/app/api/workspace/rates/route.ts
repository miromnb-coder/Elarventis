import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, canManage } from "@/lib/supabase/rest";
import { storeDocument } from "@/lib/documents/upload";
import { parseRates, RateRow } from "@/lib/rates/parse";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return error("Virheellinen alkuperä", 403);
  const user = await currentUser(); if (!user) return error("Kirjautuminen vaaditaan", 401);
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return error("Valitse työtila");
  if (!await canManage(orgId)) return error("Ei käyttöoikeutta", 403);
  const input = await request.formData().catch(() => null);
  const file = input?.get("file"); const versionId = input?.get("versionId"); const rowsText = input?.get("rows");
  if (!(file instanceof File) || file.size > 10_485_760 || typeof versionId !== "string" || !uuid.test(versionId)) return error("Virheellinen tiedosto tai versio");
  const bytes = Buffer.from(await file.arrayBuffer());
  let parsed: RateRow[];
  try { parsed = parseRates(bytes, file.name); } catch (cause) { return error(cause instanceof Error ? cause.message : "Tiedoston käsittely epäonnistui"); }
  if (!rowsText) return NextResponse.json({ rows: parsed });
  let edited: RateRow[];
  try { edited = JSON.parse(String(rowsText)); } catch { return error("Virheellinen esikatselu"); }
  if (!Array.isArray(edited) || edited.length !== parsed.length || edited.some((r, index) => r.source_row !== parsed[index].source_row || !Number.isInteger(r.price_minor) || r.price_minor < 0 || r.price_minor > 2147483647 || !Number.isInteger(r.min_weight_g) || !Number.isInteger(r.max_weight_g) || r.min_weight_g < 0 || r.max_weight_g <= r.min_weight_g || r.max_weight_g > 100000000 || !["including_vat","excluding_vat"].includes(r.vat_basis) || typeof r.service_code !== "string" || !r.service_code.trim() || r.service_code.length > 80 || typeof r.zone !== "string" || !r.zone.trim() || r.zone.length > 80)) return error("Korjatut hintarivit ovat virheellisiä");
  try {
    const versions = await db<{ id: string; state: string }[]>("contract_versions?select=id,state&id=eq." + versionId + "&org_id=eq." + orgId);
    if (!versions.length || !["draft","pending_review"].includes(versions[0].state)) return error("Versiota ei voi muokata", 403);
    const mime = file.name.toLowerCase().endsWith(".csv") ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    const { id: documentId } = await storeDocument({ orgId, userId: user.id, kind: mime === "text/csv" ? "rate_csv" : "rate_xlsx", name: file.name, mime, bytes });
    await db("rpc/save_rate_draft", { method: "POST", body: JSON.stringify({ p_org: orgId, p_version: versionId, p_document: documentId, p_rows: edited }) });
    return NextResponse.json({ count: edited.length });
  } catch { return error("Hinnaston tallennus epäonnistui", 400); }
}

