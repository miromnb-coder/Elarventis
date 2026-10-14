import "server-only";
import { baseUrl } from "./rest";

/** Privileged calls are restricted to named RPCs after user and tenant checks. */
export async function trustedRpc<T>(name: "verify_document" | "commit_audit_run" | "claim_invoice_job" | "finish_invoice_job", body: Record<string, unknown>): Promise<T> {
  const key = process.env.ELARVENTIS_SERVICE_ROLE_KEY;
  if (!key || process.env.ELARVENTIS_MVP_ENABLED !== "enabled") throw new Error("Trusted processing unavailable");
  const response = await fetch(`${baseUrl()}/rest/v1/rpc/${name}`, {
    method: "POST", cache: "no-store",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Trusted operation failed (${response.status})`);
  const payload = await response.text();
  return (payload ? JSON.parse(payload) : undefined) as T;
}
