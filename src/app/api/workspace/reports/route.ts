import { NextRequest, NextResponse } from "next/server";
import { currentUser, db } from "@/lib/supabase/rest";
import { reportCsv, reportPdf, reportXlsx, type Report } from "@/lib/reporting";
import { ENGINE_VERSION, type Result, type Status } from "@/lib/audit-engine";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses: Status[] = ["OK", "DISCREPANCY_REVIEW", "MISSING_DATA", "UNSUPPORTED_RULE", "PARSER_REVIEW", "ERROR"];
type Run = { id: string; invoice_id: string; engine_version: string; created_at: string; state: string };
type Invoice = { id: string; invoice_number: string; invoice_date: string; carrier_id: string };
type StoredResult = { id: string; invoice_line_id: string; status: Status; billed_minor: number; expected_minor: number | null; difference_minor: number | null; contract_version_id: string | null; rate_rule_id: string | null; calculation_trace: { formula?: string; reason?: string }; evidence_refs: Result["sources"] };
export async function GET(request: NextRequest) {
  if (!await currentUser()) return NextResponse.json({ error: "Kirjautuminen vaaditaan" }, { status: 401 });
  const orgId = request.cookies.get("elarventis-org")?.value;
  const runId = request.nextUrl.searchParams.get("runId");
  const format = request.nextUrl.searchParams.get("format");
  if (!orgId || !uuid.test(orgId) || !runId || !uuid.test(runId) || !["pdf", "csv", "xlsx"].includes(format ?? "")) return NextResponse.json({ error: "Virheellinen raporttipyyntö" }, { status: 400 });
  try {
    const runs = await db<Run[]>(`audit_runs?select=id,invoice_id,engine_version,created_at,state&org_id=eq.${orgId}&id=eq.${runId}`);
    if (runs.length !== 1 || !["completed", "partial"].includes(runs[0].state)) return NextResponse.json({ error: "Tarkastusta ei löytynyt" }, { status: 404 });
    const [invoices, organizations, rawResults] = await Promise.all([
      db<Invoice[]>(`invoices?select=id,invoice_number,invoice_date,carrier_id&org_id=eq.${orgId}&id=eq.${runs[0].invoice_id}`),
      db<{ name: string }[]>(`organizations?select=name&id=eq.${orgId}`),
      db<StoredResult[]>(`audit_results?select=id,invoice_line_id,status,billed_minor,expected_minor,difference_minor,contract_version_id,rate_rule_id,calculation_trace,evidence_refs&org_id=eq.${orgId}&run_id=eq.${runId}&order=created_at.asc`),
    ]);
    if (invoices.length !== 1 || organizations.length !== 1 || !rawResults.length) return NextResponse.json({ error: "Raporttidata on puutteellinen" }, { status: 422 });
    const [carriers, decisions] = await Promise.all([
      db<{ name: string }[]>(`carriers?select=name&org_id=eq.${orgId}&id=eq.${invoices[0].carrier_id}`),
      db<{ result_id: string; decision: string; created_at: string }[]>(`finding_decisions?select=result_id,decision,created_at&org_id=eq.${orgId}&order=created_at.asc`),
    ]);
    const latest = new Map<string, string>();
    for (const decision of decisions) latest.set(decision.result_id, decision.decision);
    const acceptedLineIds = rawResults.filter(row => latest.get(row.id) === "accepted").map(row => row.invoice_line_id);
    const results: Result[] = rawResults.map(row => {
      if (!statuses.includes(row.status) || !Number.isSafeInteger(row.billed_minor) || (row.expected_minor !== null && !Number.isSafeInteger(row.expected_minor)) || !Array.isArray(row.evidence_refs) || typeof row.calculation_trace?.reason !== "string") throw new Error("Invalid result");
      return { lineId: row.invoice_line_id, status: row.status, billedMinor: row.billed_minor, expectedMinor: row.expected_minor,
        differenceMinor: row.difference_minor, contractVersionId: row.contract_version_id, ruleId: row.rate_rule_id,
        formula: row.calculation_trace.formula ?? "", reason: row.calculation_trace.reason, sources: row.evidence_refs,
        engineVersion: runs[0].engine_version || ENGINE_VERSION };
    });
    const report: Report = { organization: organizations[0].name, runId, invoiceNumber: invoices[0].invoice_number, invoiceDate: invoices[0].invoice_date,
      carrier: carriers[0]?.name ?? "Tuntematon kuljetusliike", contractVersion: [...new Set(results.map(r => r.contractVersionId).filter(Boolean))].join(", ") || "Ei valittua sopimusversiota",
      auditedAt: runs[0].created_at, generatedAt: new Date().toISOString(), results, acceptedLineIds, version: "1" };
    const bytes = format === "pdf" ? reportPdf(report) : format === "xlsx" ? reportXlsx(report) : reportCsv(report);
    const mime = format === "pdf" ? "application/pdf" : format === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "text/csv; charset=utf-8";
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": mime, "Content-Disposition": `attachment; filename="elarventis-${runId}.${format}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "X-Elarventis-Report-Status": "not-persisted" } });
  } catch { return NextResponse.json({ error: "Raportin muodostus epäonnistui" }, { status: 422 }); }
}
