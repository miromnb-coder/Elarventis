"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, FileText, ScrollText, Table2, ScanSearch, CircleAlert, ChartNoAxesCombined, Settings, Menu, X, LogOut } from "lucide-react";
const nav = [
  { href: "/app", name: "Yleiskatsaus", icon: LayoutDashboard },
  { href: "/app/laskut", name: "Kuljetuslaskut", icon: FileText },
  { href: "/app/sopimukset", name: "Sopimukset", icon: ScrollText },
  { href: "/app/hinnastot", name: "Hinnastot", icon: Table2 },
  { href: "/app/tarkastukset", name: "Tarkastukset", icon: ScanSearch },
  { href: "/app/poikkeamat", name: "Poikkeamat", icon: CircleAlert },
  { href: "/app/raportit", name: "Raportit", icon: ChartNoAxesCombined },
  { href: "/app/asetukset", name: "Asetukset", icon: Settings },
];
export function Shell({ children, organizations, active, email }: { children: React.ReactNode; organizations: { id: string; name: string }[]; active?: string; email: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const title = nav.find(item => item.href === path)?.name || (path.includes("/sopimukset/") ? "Sopimus" : "Työtila");
  const [error, setError] = useState("");
  async function logout() { const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }); if (!res.ok) { setError("Uloskirjautuminen epäonnistui."); return; } router.replace("/kirjaudu"); router.refresh(); }
  return <div className="workspace">
    <aside className={"workspace-sidebar " + (open ? "is-open" : "")} aria-label="Sovelluksen navigaatio">
      <Link href="/" className="workspace-logo">Elarventis<span>.</span></Link>
      <p className="workspace-caption">TYÖTILA</p>
      <nav>{nav.map(item => <Link key={item.href} href={item.href} aria-current={path === item.href ? "page" : undefined} className={"workspace-link " + (path === item.href ? "active" : "")} onClick={() => setOpen(false)}><item.icon size={18} />{item.name}</Link>)}</nav>
      <div className="workspace-sidebar-foot">Kuljetuskustannukset selkeämmin.</div>
    </aside>
    {open && <button className="workspace-scrim" aria-label="Sulje valikko" onClick={() => setOpen(false)} />}
    <div className="workspace-content">
      <header className="workspace-topbar">
        <button className="workspace-menu" aria-label={open ? "Sulje valikko" : "Avaa valikko"} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
        <div className="workspace-page-title"><span>Työtila / {title}</span><strong>{title}</strong></div>
        <div className="workspace-top-actions"><label className="workspace-org-label">Yritys <select value={active || ""} onChange={async e => { const res = await fetch("/api/workspace/active", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orgId: e.target.value }) }); if (!res.ok) { setError("Yritystä ei voitu vaihtaa."); return; } setError(""); router.push("/app"); router.refresh(); }}><option value="" disabled>Valitse työtila</option>{organizations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label><Link href="/app/asetukset" className="workspace-user" title={email} aria-label="Omat asetukset">{email.slice(0, 1).toUpperCase()}</Link><button onClick={logout} title="Kirjaudu ulos" aria-label="Kirjaudu ulos"><LogOut size={18} /></button></div>
      </header>
      <main className="workspace-main">{error && <p role="alert" className="settings-notice">{error}</p>}{children}</main>
    </div>
  </div>;
}
export function Empty({ title, text }: { title: string; text: string }) { return <div className="workspace-empty"><span>✳</span><h2>{title}</h2><p>{text}</p></div>; }
export function Status({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warn" }) { return <span className={"workspace-status " + tone}>{children}</span>; }
