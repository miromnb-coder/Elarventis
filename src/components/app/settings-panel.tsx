"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
type Role = "owner" | "admin" | "analyst" | "viewer";
type Member = { user_id: string; role: Role; status: string; created_at: string };
type Invite = { id: string; invited_email: string; role: string; state: string; expires_at: string };
const roles: Record<Role, string> = { owner: "Omistaja", admin: "Ylläpitäjä", analyst: "Tarkastaja", viewer: "Katselija" };
export function SettingsPanel({ orgId, orgName, role, members, invites, userId, email, displayName }: { orgId: string; orgName: string; role: Role; members: Member[]; invites: Invite[]; userId: string; email: string; displayName: string }) {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  async function post(path: string, body: object) {
    if (busy) return;
    setBusy(true); setNotice("");
    try {
      const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId, ...body }) });
      const data = await res.json();
      setNotice(res.ok ? "Muutokset tallennettu." : data.error || "Tallennus epäonnistui.");
      if (res.ok) router.refresh();
    } catch { setNotice("Verkkoyhteys katkesi."); }
    finally { setBusy(false); }
  }
  const manager = role === "owner" || role === "admin";
  return <div className="workspace-stack settings-page">
    <header><p className="workspace-kicker">TYÖTILA / ASETUKSET</p><h1>Yrityksen asetukset</h1><p>Hallitse aktiivista työtilaa ja omaa käyttäjätiliäsi.</p></header>
    {notice && <p className="settings-notice" role="status">{notice}</p>}
    <div className="settings-grid"><section className="workspace-card"><p className="workspace-kicker">01 / AKTIIVINEN YRITYS</p><h2>{orgName}</h2><p>Roolisi: <strong>{roles[role]}</strong></p><p>Vaihda yritystä yläpalkin valitsimesta. Työtilan tietoja voivat käsitellä vain sen aktiiviset jäsenet.</p></section>
      <section className="workspace-card"><p className="workspace-kicker">02 / OMA PROFIILI</p><h2>Käyttäjätili</h2><p>{email}</p><form className="settings-form" onSubmit={e => { e.preventDefault(); post("/api/workspace/profile", { displayName: new FormData(e.currentTarget).get("displayName") }); }}><label>Näyttönimi<input name="displayName" defaultValue={displayName} maxLength={120} /></label><button disabled={busy} className="workspace-primary">Tallenna profiili</button></form><a href="/palauta">Vaihda salasana →</a></section></div>
    <section className="workspace-card"><div className="settings-heading"><div><p className="workspace-kicker">03 / KÄYTTÖOIKEUDET</p><h2>Yrityksen jäsenet</h2></div><span>{members.length} aktiivista</span></div><div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Käyttäjä</th><th>Rooli</th><th>Hallinta</th></tr></thead><tbody>{members.map(member => <tr key={member.user_id}><td>{member.user_id === userId ? "Sinä" : member.user_id}<small className="settings-subtle">Käyttäjätunnus</small></td><td>{roles[member.role]}</td><td>{manager && member.user_id !== userId && (role === "owner" || !["owner", "admin"].includes(member.role)) ? <div className="settings-actions"><label className="sr-only" htmlFor={"role-" + member.user_id}>Vaihda rooli</label><select id={"role-" + member.user_id} aria-label="Vaihda rooli" defaultValue={member.role} disabled={busy} onChange={e => post("/api/workspace/members", { action: "role", userId: member.user_id, role: e.target.value })}>{(["owner", "admin", "analyst", "viewer"] as Role[]).filter(value => role === "owner" || !["owner", "admin"].includes(value)).map(value => <option value={value} key={value}>{roles[value]}</option>)}</select><button type="button" disabled={busy} onClick={() => { if (window.confirm("Poistetaanko jäsenen pääsy tähän työtilaan?")) post("/api/workspace/members", { action: "remove", userId: member.user_id }); }}>Poista</button></div> : <span className="settings-subtle">—</span>}</td></tr>)}</tbody></table></div><p className="settings-subtle">Jäsenen sähköpostiosoitetta ei näytetä, koska nykyinen tietomalli ei tarjoa siihen turvallista organisaatiokohtaista näkymää.</p></section>
    {manager && <section className="workspace-card"><p className="workspace-kicker">04 / KUTSUT</p><h2>Keskeneräiset kutsut</h2><p>Kutsujen toimitus ja hyväksyminen vaativat vielä erillisen tietokantamuutoksen ja sähköpostin toimitustestin. Uusien kutsujen lähetys avataan vasta niiden jälkeen.</p>{invites.length > 0 && <div className="workspace-table-wrap"><table className="workspace-table"><thead><tr><th>Vastaanottaja</th><th>Rooli</th><th>Tila</th><th>Voimassa</th></tr></thead><tbody>{invites.map(invite => <tr key={invite.id}><td>{invite.invited_email}</td><td>{roles[invite.role as Role] || invite.role}</td><td>{invite.state}</td><td>{new Date(invite.expires_at).toLocaleDateString("fi-FI")}</td></tr>)}</tbody></table></div>}</section>}
  </div>;
}
