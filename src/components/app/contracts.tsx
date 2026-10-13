"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty, Status } from "@/components/app/shell";
type Carrier = { id: string; name: string };
type Contract = { id: string; label: string; state: string; updated_at: string; carriers: { name: string }; contract_versions: { version_number: number; state: string }[] };
export function Contracts({ carriers, contracts }: { carriers: Carrier[]; contracts: Contract[] }) {
  const [query, setQuery] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>, endpoint: string) {
    event.preventDefault(); setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(endpoint.endsWith("contracts") ? { label: data.label, carrierId: data.carrierId, effectiveFrom: data.effectiveFrom, effectiveTo: data.effectiveTo } : { name: data.name }) });
    setBusy(false);
    if (!res.ok) { setError((await res.json()).error || "Tallennus epäonnistui"); return; }
    event.currentTarget.reset();
    router.refresh();
  }
  const filtered = contracts.filter(c => (c.label + " " + c.carriers?.name).toLocaleLowerCase("fi").includes(query.toLocaleLowerCase("fi")));
  return <div className="workspace-stack"><div><p className="workspace-kicker">SOPIMUKSET / HALLINTA</p><h1>Sopimukset</h1><p>Hallitse kuljetusliikkeitä, sopimuksia ja hyväksyttyjä hinnastoja.</p></div>
    <div className="workspace-toolbar"><input aria-label="Hae sopimuksia" type="search" placeholder="Hae sopimusta tai kuljetusliikettä" value={query} onChange={e => setQuery(e.target.value)} /></div>
    {filtered.length ? <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Sopimus</th><th>Kuljetusliike</th><th>Tila</th><th>Hyväksytty versio</th><th>Muokattu</th></tr></thead><tbody>{filtered.map(c => <tr key={c.id}><td><Link href={"/app/sopimukset/" + c.id}>{c.label}</Link></td><td>{c.carriers?.name}</td><td><Status>{c.state}</Status></td><td>{c.contract_versions?.find(v => v.state === "approved")?.version_number ?? "—"}</td><td>{new Date(c.updated_at).toLocaleDateString("fi-FI")}</td></tr>)}</tbody></table></div> : <Empty title="Sopimuksia ei löytynyt" text="Lisää ensin kuljetusliike ja luo sitten sopimus." />}
    <div className="workspace-two-columns"><form className="workspace-card workspace-form" onSubmit={e => submit(e, "/api/workspace/carriers")}><h2>Lisää kuljetusliike</h2><label>Nimi<input name="name" minLength={2} maxLength={160} required /></label><button className="workspace-primary" disabled={busy}>Tallenna kuljetusliike</button></form><form className="workspace-card workspace-form" onSubmit={e => submit(e, "/api/workspace/contracts")}><h2>Uusi sopimus</h2><label>Nimi<input name="label" minLength={2} maxLength={160} required /></label><label>Kuljetusliike<select name="carrierId" required><option value="">Valitse</option>{carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Voimassa alkaen<input name="effectiveFrom" type="date" required /></label><label>Voimassa asti<input name="effectiveTo" type="date" /></label><button className="workspace-primary" disabled={busy || !carriers.length}>Luo sopimusluonnos</button></form></div>{error && <p role="alert">{error}</p>}</div>;
}
