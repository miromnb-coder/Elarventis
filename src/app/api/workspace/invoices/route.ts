import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
import { storeDocument } from "@/lib/documents/upload";
import { DEFAULT_COLUMNS, type ColumnMap } from "@/lib/invoices/parse";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function error(message: string, status = 400) { return NextResponse.json({ error: message }, { status }); }
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return error("Virheellinen alkuperä", 403);
  const user = await currentUser(); if (!user) return error("Kirjautuminen vaaditaan", 401);
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return error("Valitse työtila");
  const roles = await db<{ role: string }[]>(`memberships?select=role&org_id=eq.${orgId}&user_id=eq.${user.id}&status=eq.active&limit=1`).catch(() => []);
  if (!roles.length || !["owner", "admin", "analyst"].includes(roles[0].role)) return error("Ei käyttöoikeutta", 403);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file"); const carrierId = form?.get("carrierId");
  const rawColumns = form?.get("columns");
  let columns: ColumnMap = DEFAULT_COLUMNS;
  if (typeof rawColumns === "string") {
    try {
      const proposed = JSON.parse(rawColumns) as Record<string, unknown>;
      if (!proposed || typeof proposed !== "object" || Object.keys(DEFAULT_COLUMNS).some(key => typeof proposed[key] !== "string" || !(proposed[key] as string).trim() || (proposed[key] as string).length > 80)) return error("Virheellinen sarakevastaavuus");
      columns = proposed as ColumnMap;
    } catch { return error("Virheellinen sarakevastaavuus"); }
  }
  if (!(file instanceof File) || file.size < 10 || file.size > 10_485_760 || typeof carrierId !== "string" || !uuid.test(carrierId)) return error("Virheellinen tiedosto tai kuljetusliike");
  const extension = /\.(csv|xlsx|pdf)$/i.exec(file.name)?.[1]?.toLowerCase();
  if (!extension) return error("Tiedostomuoto ei ole tuettu");
  const carriers = await db<{ id: string }[]>(`carriers?select=id&org_id=eq.${orgId}&id=eq.${carrierId}&archived_at=is.null`).catch(() => []);
  if (!carriers.length) return error("Kuljetusliikettä ei löytynyt", 404);
  const bytes = Buffer.from(await file.arrayBuffer());
  const mime = extension === "csv" ? "text/csv" : extension === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  try {
    const document = await storeDocument({ orgId, userId: user.id, kind: `invoice_${extension}` as "invoice_csv" | "invoice_pdf" | "invoice_xlsx", name: file.name, mime, bytes });
    const jobId = await db<string>("rpc/enqueue_invoice_extract", { method: "POST", body: JSON.stringify({ p_org: orgId, p_document: document.id, p_carrier: carrierId, p_columns: columns }) });
    return NextResponse.json({ documentId: document.id, jobId, state: "queued" });
  } catch { return error("Laskun lataus epäonnistui", 400); }
}
export async function GET(request: NextRequest) {
  if (!await currentUser()) return error("Kirjautuminen vaaditaan", 401);
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return error("Valitse työtila");
  const invoiceId = request.nextUrl.searchParams.get("id");
  if (invoiceId && !uuid.test(invoiceId)) return error("Virheellinen lasku");
  try {
    const invoices = await db<unknown[]>(`invoices?select=id,invoice_number,invoice_date,total_minor,extraction_state,audit_state,carrier_id,document_id&org_id=eq.${orgId}${invoiceId ? `&id=eq.${invoiceId}` : ""}&order=created_at.desc&limit=100`);
    if (!invoiceId) return NextResponse.json({ invoices });
    const lines = await db<unknown[]>(`invoice_lines?select=id,service_code,shipment_ref,service_date,charge_type,weight_g,zone,billed_minor,vat_basis,source_row,source_page,review_state&org_id=eq.${orgId}&invoice_id=eq.${invoiceId}&order=created_at.asc`);
    return NextResponse.json({ invoice: invoices[0] ?? null, lines });
  } catch { return error("Laskujen haku epäonnistui", 500); }
}
