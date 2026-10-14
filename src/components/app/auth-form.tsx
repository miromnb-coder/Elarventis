"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

type Action = "login" | "signup" | "recovery" | "update-password";
const content = {
  login: { eyebrow: "TERVETULOA TAKAISIN", title: "Kirjaudu työtilaan", intro: "Jatka yrityksesi kuljetuslaskujen tarkastusta.", button: "Kirjaudu sisään" },
  signup: { eyebrow: "ALOITA ELARVENTIKSELLÄ", title: "Luo käyttäjätili", intro: "Luo tili ja perusta yrityksellesi oma työtila.", button: "Luo tili" },
  recovery: { eyebrow: "TILIN PALAUTUS", title: "Palauta salasanasi", intro: "Lähetämme palautusohjeen, jos osoitteeseen liittyy käyttäjätili.", button: "Lähetä ohje" },
  "update-password": { eyebrow: "UUSI SALASANA", title: "Aseta uusi salasana", intro: "Valitse tilillesi vähintään kahdeksan merkin salasana.", button: "Tallenna salasana" },
};
export function AuthForm({ action, invalidLink = false }: { action: Action; invalidLink?: boolean }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const copy = content[action];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (typeof data.email === "string") setEmail(data.email);
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
      const result = await response.json();
      if (!response.ok) { setError(result.error || "Toiminto epäonnistui. Yritä uudelleen."); return; }
      if (action === "login" || action === "update-password" || (action === "signup" && !result.confirmationRequired)) {
        router.replace("/app"); router.refresh(); return;
      }
      setSent(true);
      setMessage(action === "signup" ? "Tarkista sähköpostisi ja vahvista osoitteesi viestin linkistä. Voit myöhemmin palata kirjautumaan." : "Jos tili on olemassa, palautusohje lähetetään sähköpostiin. Tarkista myös roskapostikansio.");
    } catch { setError("Verkkoyhteys katkesi. Yritä uudelleen."); }
    finally { setBusy(false); }
  }
  async function resend() {
    if (busy || !email) return;
    setBusy(true);
    try {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "resend", email }) });
      setMessage("Jos vahvistus on vielä kesken, uusi viesti on pyydetty. Tarkista sähköpostisi.");
    } catch { setError("Verkkoyhteys katkesi. Yritä uudelleen."); }
    finally { setBusy(false); }
  }
  return <main className="auth-page">
    <div className="auth-top"><Link href="/" className="workspace-logo">Elarventis<span>.</span></Link><Link href="/" className="auth-home">Takaisin etusivulle ↗</Link></div>
    <div className="auth-layout"><div className="auth-story"><p className="workspace-kicker">ELARVENTIS / TYÖTILA</p><h2>Selkeä näkymä jokaiseen veloitukseen.</h2><p>Työtila kokoaa sopimukset, laskut, tarkastukset ja perustellut havainnot saman yrityksen käyttöön.</p><div className="auth-story-line">SOPIMUS <span>→</span> LASKU <span>→</span> TARKASTUS</div></div>
      <div className="auth-panel"><p className="workspace-kicker">{copy.eyebrow}</p><h1>{copy.title}</h1><p className="auth-intro">{copy.intro}</p>
        {invalidLink && <div className="auth-alert" role="alert">Linkki on virheellinen tai vanhentunut. Pyydä uusi palautusviesti.</div>}
        {error && <div className="auth-alert" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}
        {(!sent || action === "recovery") && <form onSubmit={submit} className="auth-form">
          {action !== "update-password" && <label>Sähköpostiosoite<input name="email" type="email" placeholder="nimi@yritys.fi" autoComplete="email" maxLength={254} required /></label>}
          {action !== "recovery" && <label>Salasana<div className="auth-password"><input name="password" type={visible ? "text" : "password"} autoComplete={action === "login" ? "current-password" : "new-password"} minLength={8} maxLength={256} required /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? "Piilota salasana" : "Näytä salasana"}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>}
          <button type="submit" className="workspace-primary" disabled={busy}>{busy ? "Odota…" : copy.button} <ArrowRight size={17} /></button>
        </form>}
        <div className="auth-links">{action !== "login" && <Link href="/kirjaudu">Kirjaudu sisään</Link>}{action === "login" && <><Link href="/palauta">Unohtuiko salasana?</Link><Link href="/rekisteroidy">Luo käyttäjätili</Link></>}{action === "signup" && sent && <button type="button" disabled={busy} onClick={resend}>Pyydä vahvistusviesti uudelleen</button>}{action === "update-password" && <Link href="/palauta">Pyydä uusi palautuslinkki</Link>}</div>
        <p className="auth-note">Yrityksen tiedot näkyvät vain sen aktiivisille jäsenille.</p>
      </div></div>
  </main>;
}
