import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { currentUser, db, storage } from "@/lib/supabase/rest";
import { parseInvoice, DEFAULT_COLUMNS, type ColumnMap } from "@/lib/invoices/parse";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Job = { id: string; payload: { document_id: string; carrier_id: string; columns?: ColumnMap } };
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Virheellinen alkuperä" }, { status: 403 });
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  if (!orgId || !uuid.test(orgId)) return NextResponse.json({ error: "Valitse työtila" }, { status: 400 });
  let job: Job | null;
  try { job = await db<Job | null>("rpc/claim_invoice_job", { method: "POST", body: JSON.stringify({ p_org: orgId }) }); }
  catch { return NextResponse.json({ error: "Työjonoon ei ole käyttöoikeutta" }, { status: 403 }); }
  if (!job) return NextResponse.json({ state: "empty" });
  try {
    const documentId = job.payload.document_id;
    const docs = await db<{ storage_path: string; original_name: string; state: string }[]>(`documents?select=storage_path,original_name,state&org_id=eq.${orgId}&id=eq.${documentId}`);
    if (docs.length !== 1 || docs[0].state !== "stored") throw new Error("DOCUMENT_UNAVAILABLE");
    const object = await storage(`authenticated/elarventis-documents/${docs[0].storage_path}`);
    if (!object.ok) throw new Error("STORAGE_UNAVAILABLE");
    const extracted = parseInvoice(Buffer.from(await object.arrayBuffer()), docs[0].original_name, documentId, job.payload.columns ?? DEFAULT_COLUMNS);
    const priorExtraction = await db<{ id: string }[]>(`document_extractions?select=id&org_id=eq.${orgId}&document_id=eq.${documentId}&parser_version=eq.${extracted.parserVersion}`);
    if (!priorExtraction.length) await db("document_extractions", { method: "POST", body: JSON.stringify({ org_id: orgId, document_id: documentId, parser_version: extracted.parserVersion, proposed_fields: { number: extracted.number, date: extracted.date, totalMinor: extracted.totalMinor, warnings: extracted.warnings, lines: extracted.lines }, review_state: "draft" }) });
    const existing = await db<{ id: string }[]>(`invoices?select=id&org_id=eq.${orgId}&document_id=eq.${documentId}`);
    const invoiceId = existing[0]?.id ?? randomUUID();
    if (!existing.length) await db("invoices", { method: "POST", body: JSON.stringify({ id: invoiceId, org_id: orgId, carrier_id: job.payload.carrier_id, document_id: documentId, invoice_number: extracted.number, invoice_date: extracted.date, currency: "EUR", total_minor: extracted.totalMinor, extraction_state: "pending" }) });
    const priorLines = await db<{ id: string }[]>(`invoice_lines?select=id&org_id=eq.${orgId}&invoice_id=eq.${invoiceId}&limit=1`);
    if (!priorLines.length) await db("invoice_lines", { method: "POST", body: JSON.stringify(extracted.lines.map(line => ({ id: randomUUID(), org_id: orgId, invoice_id: invoiceId, service_code: line.serviceCode, shipment_ref: line.shipmentRef, service_date: line.serviceDate, charge_type: line.charge, weight_g: line.weightG, zone: line.zone, billed_minor: line.billedMinor, vat_basis: line.vatBasis, source_row: line.source.row, source_page: line.source.page, review_state: "pending" }))) });
    const priorImport = await db<{ id: string }[]>(`invoice_imports?select=id&org_id=eq.${orgId}&document_id=eq.${documentId}&parser_version=eq.${extracted.parserVersion}`);
    if (!priorImport.length) await db("invoice_imports", { method: "POST", body: JSON.stringify({ org_id: orgId, document_id: documentId, invoice_id: invoiceId, parser_version: extracted.parserVersion, column_map: job.payload.columns ?? DEFAULT_COLUMNS, state: "review" }) });
    await db("rpc/finish_invoice_job", { method: "POST", body: JSON.stringify({ p_org: orgId, p_job: job.id, p_ok: true }) });
    return NextResponse.json({ invoiceId, state: "review", warnings: extracted.warnings });
  } catch (cause) {
    const code = cause instanceof Error && /^[A-Z_]+$/.test(cause.message) ? cause.message : "PROCESSING_ERROR";
    await db("rpc/finish_invoice_job", { method: "POST", body: JSON.stringify({ p_org: orgId, p_job: job.id, p_ok: false, p_error: code }) }).catch(() => undefined);
    return NextResponse.json({ error: "Laskun käsittely epäonnistui", code }, { status: 422 });
  }
}
