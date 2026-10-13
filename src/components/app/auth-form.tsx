"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function AuthForm({ action }: { action: "login" | "signup" | "recovery" | "update-password" }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const title = { login: "Kirjaudu sisään", signup: "Luo käyttäjätili", recovery: "Palauta salasana", "update-password": "Aseta uusi salasana" }[action];
  return <div className="workspace-auth"><Link href="/" className="workspace-logo">Elarventis<span>.</span></Link><form className="workspace-card workspace-form" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
    setBusy(false);
    if (!response.ok) { setMessage("Toiminto epäonnistui. Tarkista tiedot."); return; }
    const result = await response.json();
    if (action === "login" || (action === "signup" && !result.confirmationRequired)) { router.replace("/app"); router.refresh(); }
    else if (action === "update-password") { router.replace("/app"); router.refresh(); }
    else setMessage(action === "signup" ? "Vahvista sähköpostiosoitteesi viestin linkistä. Viestin toimitus riippuu projektin sähköpostiasetuksista." : "Jos tili on olemassa, palautusviesti lähetetään projektin sähköpostiasetusten kautta.");
  }}><p className="workspace-kicker">ELARVENTIS / TYÖTILA</p><h1>{title}</h1>{action !== "update-password" && <label>Sähköposti<input name="email" type="email" autoComplete="email" required /></label>}{action !== "recovery" && <label>Salasana<input name="password" type="password" autoComplete={action === "login" ? "current-password" : "new-password"} minLength={8} required /></label>}<button className="workspace-primary" disabled={busy}>{busy ? "Odota…" : title}</button>{message && <p role="status">{message}</p>}<div className="workspace-auth-links"><Link href="/kirjaudu">Kirjaudu</Link><Link href="/rekisteroidy">Luo tili</Link><Link href="/palauta">Unohtuiko salasana?</Link></div></form></div>;
}
