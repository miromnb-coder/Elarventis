import { createHash } from "node:crypto";
import { audit, ENGINE_VERSION, type AuditInput } from "./index";
import { trustedRpc } from "@/lib/supabase/trusted";

/** Only reviewed database rows are passed here; the RPC commits all rows in one transaction. */
export async function persistAudit(orgId: string, invoiceId: string, actorId: string, input: AuditInput) {
  const results = audit(input);
  const snapshot = JSON.stringify({ invoiceId, engineVersion: ENGINE_VERSION, input });
  const digest = createHash("sha256").update(snapshot).digest("hex");
  const runId = await trustedRpc<string>("commit_audit_run", {
    p_org: orgId, p_invoice: invoiceId, p_actor: actorId, p_engine: ENGINE_VERSION,
    p_input: snapshot, p_hash: digest, p_results: results,
  });
  return { runId, results };
}
