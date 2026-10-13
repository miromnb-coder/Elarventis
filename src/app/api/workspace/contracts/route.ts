import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, canManage } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return NextResponse.json({ error: "Valitse työtila" }, { status: 400 });
  if (!await canManage(orgId)) return NextResponse.json({ error: "Ei käyttöoikeutta" }, { status: 403 });
  const input = await request.json().catch(() => ({}));
  if (typeof input.label !== "string" || input.label.trim().length < 2 || input.label.length > 160 || !uuid.test(input.carrierId)) return NextResponse.json({ error: "Virheellinen sopimus" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveFrom) || (input.effectiveTo && !/^\d{4}-\d{2}-\d{2}$/.test(input.effectiveTo))) return NextResponse.json({ error: "Virheellinen päivämäärä" }, { status: 400 });
  if (input.effectiveTo && input.effectiveTo < input.effectiveFrom) return NextResponse.json({ error: "Voimassaoloaika on virheellinen" }, { status: 400 });
  try {
    const carriers = await db<{ id: string }[]>("carriers?select=id&id=eq." + input.carrierId + "&org_id=eq." + orgId + "&archived_at=is.null");
    if (!carriers.length) return NextResponse.json({ error: "Kuljetusliikettä ei löytynyt" }, { status: 404 });
    const contracts = await db<{ id: string }[]>("contracts?select=id", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ org_id: orgId, carrier_id: input.carrierId, label: input.label.trim() }) });
    const contractId = contracts[0].id;
    await db("contract_versions", { method: "POST", body: JSON.stringify({ org_id: orgId, contract_id: contractId, version_number: 1, effective_from: input.effectiveFrom, effective_to: input.effectiveTo || null }) });
    return NextResponse.json({ id: contractId });
  } catch { return NextResponse.json({ error: "Sopimuksen luonti epäonnistui" }, { status: 400 }); }
}
