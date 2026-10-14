import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Empty, Status } from "@/components/app/shell";
import { Invoices } from "@/components/app/invoices";
import { currentUser, db } from "@/lib/supabase/rest";

const pages: Record<string, { title: string; description: string }> = {
  laskut: { title: "Kuljetuslaskut", description: "Tuo laskut, seuraa käsittelyä ja tarkista tunnistetut rivit." },
  hinnastot: { title: "Hinnastot", description: "Hinnastosäännöt kuuluvat sopimusten versioihin." },
  tarkastukset: { title: "Tarkastukset", description: "Suoritetut laskujen tarkastukset ja niiden tila." },
  poikkeamat: { title: "Poikkeamat", description: "Tarkistettavat veloituserot ja laskennan perusteet." },
  raportit: { title: "Raportit", description: "Valmiista tarkastuksista muodostetut raportit." },
};
type Row = Record<string, string | number | null>;
const dataSets: Record<string, { table: string; columns: string; headers: [string, string][] }> = {
  hinnastot: { table: "rate_rules", columns: "id,service_code,zone,price_minor,contract_version_id,created_at", headers: [["service_code", "Palvelu"], ["zone", "Alue"], ["price_minor", "Hinta"], ["contract_version_id", "Sopimusversio"]] },
  tarkastukset: { table: "audit_runs", columns: "id,invoice_id,state,engine_version,created_at", headers: [["invoice_id", "Lasku"], ["state", "Tila"], ["engine_version", "Moottori"], ["created_at", "Luotu"]] },
  poikkeamat: { table: "audit_results", columns: "id,status,billed_minor,expected_minor,difference_minor,run_id,created_at", headers: [["status", "Tila"], ["billed_minor", "Laskutettu"], ["expected_minor", "Sovittu"], ["difference_minor", "Ero"], ["created_at", "Luotu"]] },
  raportit: { table: "audit_runs", columns: "id,invoice_id,state,created_at", headers: [["invoice_id", "Lasku"], ["state", "Tila"], ["created_at", "Luotu"]] },
};
const money = (minor: number) => new Intl.NumberFormat("fi-FI", { style: "currency", currency: "EUR" }).format(minor / 100);
function format(key: string, value: string | number | null) {
  if (value === null) return "—";
  if (key.endsWith("_minor")) return money(Number(value));
  if (key === "created_at") return new Date(String(value)).toLocaleDateString("fi-FI");
  if (key === "state" || key === "status") return <Status tone={["completed", "OK"].includes(String(value)) ? "success" : ["partial", "DISCREPANCY_REVIEW"].includes(String(value)) ? "warn" : "neutral"}>{String(value)}</Status>;
  return String(value);
}
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pages[section];
  if (!page) notFound();
  if (section === "laskut") return <Invoices />;
  const user = await currentUser();
  const choice = (await cookies()).get("elarventis-org")?.value;
  if (!user) return <Empty title="Istunto vanhentui" text="Kirjaudu uudelleen nähdäksesi yrityksen tiedot." />;
  try {
    const memberships = await db<{ org_id: string }[]>("memberships?select=org_id&user_id=eq." + user.id + "&status=eq.active");
    const org = memberships.find(m => m.org_id === choice) || memberships[0];
    if (!org) return <Empty title="Luo yrityksen työtila" text="Aloita yleiskatsauksesta." />;
    const config = dataSets[section];
    const rows = await db<Row[]>(config.table + "?select=" + config.columns + "&org_id=eq." + org.org_id + (section === "poikkeamat" ? "&status=eq.DISCREPANCY_REVIEW" : "") + "&order=created_at.desc&limit=100");
    return <div className="workspace-stack"><header><p className="workspace-kicker">TYÖTILA / {page.title.toUpperCase()}</p><h1>{page.title}</h1><p>{page.description}</p></header>
      {section === "hinnastot" && <p className="workspace-card">Tuo ja hyväksy hinnastoversiot <Link href="/app/sopimukset">sopimuksen kautta →</Link></p>}
      {rows.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr>{config.headers.map(([, label]) => <th key={label} scope="col">{label}</th>)}{section === "raportit" && <th scope="col">Lataa</th>}</tr></thead><tbody>{rows.map(row => <tr key={String(row.id)}>{config.headers.map(([key]) => <td key={key}>{format(key, row[key])}</td>)}{section === "raportit" && <td>{["completed", "partial"].includes(String(row.state)) ? <div className="report-links">{(["pdf", "csv", "xlsx"] as const).map(f => <a key={f} href={"/api/workspace/reports?runId=" + row.id + "&format=" + f}>{f.toUpperCase()}</a>)}</div> : "Ei vielä saatavilla"}</td>}</tr>)}</tbody></table></div> : <Empty title="Ei vielä tietoja" text={section === "raportit" ? "Raportit ovat ladattavissa valmiista tarkastuksista." : page.description} />}
    </div>;
  } catch { return <div className="workspace-card" role="alert">Tietoja ei voitu ladata. Tarkista yhteys ja yritä uudelleen.</div>; }
}
