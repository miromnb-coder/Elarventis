"use client";
import { useEffect, useState } from "react";
type Invoice = { id: string; invoice_number: string; invoice_date: string; total_minor: number; extraction_state: string; document_id: string };
type Line = { id: string; shipment_ref: string | null; service_code: string | null; service_date: string | null; charge_type: string; weight_g: number | null; zone: string | null; billed_minor: number; vat_basis: "including_vat" | "excluding_vat"; review_state: string; source_row: number | null };
const defaultColumns = { shipmentRef: "lahetys", serviceCode: "palvelu", serviceDate: "palvelupaiva", charge: "veloitus", billed: "summa_eur", vatBasis: "alv", weightG: "paino_g", zone: "vyohyke" };
export function Invoices() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [carrier, setCarrier] = useState("");
  const [carriers, setCarriers] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [columns, setColumns] = useState(defaultColumns);
  async function refresh() {
    const result = await fetch("/api/workspace/invoices");
    if (result.ok) setItems((await result.json()).invoices);
  }
  useEffect(() => { void refresh(); void fetch("/api/workspace/carriers").then(r => r.ok ? r.json() : []).then(data => setCarriers(Array.isArray(data) ? data : data.carriers ?? [])); }, []);
  async function open(invoice: Invoice) {
    const response = await fetch(`/api/workspace/invoices?id=${invoice.id}`);
    if (!response.ok) { setMessage("Laskun avaaminen epäonnistui"); return; }
    setSelected(invoice); setLines((await response.json()).lines);
  }
  async function upload() {
    if (!file || !carrier) { setMessage("Valitse tiedosto ja kuljetusliike"); return; }
    setBusy(true); setMessage("Ladataan tiedostoa…");
    const form = new FormData(); form.set("file", file); form.set("carrierId", carrier); form.set("columns", JSON.stringify(columns));
    try {
      const response = await fetch("/api/workspace/invoices", { method: "POST", body: form });
      if (!response.ok) throw new Error((await response.json()).error);
      setMessage("Tiedosto tallennettu. Käsittelyjonossa.");
      const processed = await fetch("/api/workspace/invoices/process", { method: "POST" });
      const body = await processed.json();
      setMessage(processed.ok ? "Lasku poimittu. Tarkista jokainen rivi ennen tarkastusta." : body.error || "Käsittely epäonnistui");
      await refresh();
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : "Lataus epäonnistui"); }
    finally { setBusy(false); }
  }
  async function retry() {
    setBusy(true);
    try {
      const response = await fetch("/api/workspace/invoices/process", { method: "POST" });
      const body = await response.json();
      setMessage(response.ok ? body.state === "empty" ? "Jonossa ei ole käsiteltävää laskua." : "Lasku käsitelty. Tarkista rivit." : body.error || "Käsittely epäonnistui");
      await refresh();
    } finally { setBusy(false); }
  }
  async function review(line: Line) {
    const response = await fetch("/api/workspace/invoices/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lineId: line.id, shipmentRef: line.shipment_ref, serviceCode: line.service_code, serviceDate: line.service_date, chargeType: line.charge_type, weightG: line.weight_g, zone: line.zone, billedMinor: line.billed_minor, vatBasis: line.vat_basis }) });
    if (!response.ok) { setMessage((await response.json()).error || "Tarkistus epäonnistui"); return; }
    setMessage("Rivi tarkistettu ja muutos kirjattu."); if (selected) await open(selected);
  }
  return <div className="workspace-stack"><div><p className="workspace-kicker">TYÖTILA / KULJETUSLASKUT</p><h1>Kuljetuslaskut</h1><p>Tuetut synteettiset CSV-, XLSX- ja tekstipohjaiset PDF-laskut. Tarkista poimitut rivit alkuperäistä dokumenttia vasten.</p></div>
    <section className="workspace-card"><h2>Lataa lasku</h2><div className="invoice-form"><label>Kuljetusliike<select value={carrier} onChange={e => setCarrier(e.target.value)}><option value="">Valitse</option>{carriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label>Tiedosto<input type="file" accept=".csv,.xlsx,.pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label><button disabled={busy} onClick={upload}>{busy ? "Käsitellään…" : "Lataa ja käsittele"}</button><button disabled={busy} onClick={retry}>Yritä käsittelyä uudelleen</button></div><details><summary>CSV/XLSX-sarakevastaavuus</summary><div className="invoice-form">{(Object.keys(columns) as (keyof typeof columns)[]).map(key => <label key={key}>{key}<input value={columns[key]} onChange={e => setColumns(old => ({ ...old, [key]: e.target.value }))} /></label>)}</div></details><p role="status">{message}</p></section>
    <section className="workspace-card"><h2>Laskut</h2>{items.length ? <div className="invoice-scroll"><table><thead><tr><th>Lasku</th><th>Päivä</th><th>Summa</th><th>Tila</th><th></th></tr></thead><tbody>{items.map(invoice => <tr key={invoice.id}><td>{invoice.invoice_number}</td><td>{invoice.invoice_date}</td><td>{(invoice.total_minor / 100).toFixed(2)} €</td><td>{invoice.extraction_state}</td><td><button onClick={() => open(invoice)}>Avaa</button></td></tr>)}</tbody></table></div> : <p>Laskuja ei ole vielä ladattu.</p>}</section>
    {selected && <section className="workspace-card"><h2>{selected.invoice_number}</h2><a href={`/api/workspace/document/${selected.document_id}`} target="_blank" rel="noreferrer">Avaa alkuperäinen dokumentti</a><div className="invoice-scroll"><table><thead><tr><th>Lähetys</th><th>Palvelu</th><th>Päivä</th><th>Veloitus</th><th>Summa</th><th>Lähderivi</th><th>Tila</th><th></th></tr></thead><tbody>{lines.map(line => <tr key={line.id}><td><input aria-label="Lähetysviite" value={line.shipment_ref ?? ""} onChange={e => setLines(v => v.map(x => x.id === line.id ? { ...x, shipment_ref: e.target.value } : x))} /></td><td><input aria-label="Palvelu" value={line.service_code ?? ""} onChange={e => setLines(v => v.map(x => x.id === line.id ? { ...x, service_code: e.target.value } : x))} /></td><td><input aria-label="Palvelupäivä" type="date" value={line.service_date ?? ""} onChange={e => setLines(v => v.map(x => x.id === line.id ? { ...x, service_date: e.target.value } : x))} /></td><td>{line.charge_type}</td><td><input aria-label="Summa sentteinä" type="number" min="0" step="1" value={line.billed_minor} onChange={e => setLines(v => v.map(x => x.id === line.id ? { ...x, billed_minor: Number(e.target.value) } : x))} /></td><td>{line.source_row ?? "–"}</td><td>{line.review_state}</td><td><button onClick={() => review(line)}>Hyväksy rivi</button></td></tr>)}</tbody></table></div></section>}
  </div>;
}
