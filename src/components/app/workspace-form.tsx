"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WorkspaceForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="workspace-card workspace-form" onSubmit={async event => { event.preventDefault(); if (busy) return; setBusy(true); setError(""); const name = new FormData(event.currentTarget).get("name"); try { const res = await fetch("/api/workspace/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); if (res.ok) router.refresh(); else setError("Työtilan luonti epäonnistui. Tarkista nimi ja yritä uudelleen."); } catch { setError("Verkkoyhteys katkesi. Yritä uudelleen."); } finally { setBusy(false); } }}><p className="workspace-kicker">01 / YRITYKSEN TIEDOT</p><label>Yrityksen nimi<input name="name" minLength={2} maxLength={160} placeholder="Esim. Yritys Oy" required /></label><button disabled={busy} className="workspace-primary">{busy ? "Luodaan…" : "Luo työtila →"}</button>{error && <p role="alert">{error}</p>}</form>;
}
