import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  const input = await request.json().catch(() => ({}));
  if (!orgId || !uuid.test(orgId) || !uuid.test(input.lineId) || typeof input.shipmentRef !== "string" || typeof input.serviceCode !== "string" || !["base_freight","fuel","discount","minimum","other"].includes(input.chargeType) || !["including_vat","excluding_vat"].includes(input.vatBasis) || !/^\d{4}-\d{2}-\d{2}$/.test(input.serviceDate) || !Number.isSafeInteger(input.billedMinor) || input.billedMinor<0 || (input.weightG !== null && input.weightG !== undefined && (!Number.isInteger(input.weightG) || input.weightG<0))) return NextResponse.json({ error: "Virheellinen laskurivi" }, { status: 400 });
  try {
    await db("rpc/review_invoice_line", { method: "POST", body: JSON.stringify({ p_org: orgId, p_line: input.lineId, p_shipment: input.shipmentRef, p_service: input.serviceCode, p_date: input.serviceDate, p_charge: input.chargeType, p_weight: input.weightG ?? null, p_zone: input.zone ?? null, p_amount: input.billedMinor, p_vat: input.vatBasis }) });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Rivin tarkistus epäonnistui" }, { status: 403 }); }
}
