"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function WorkspaceForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return <form className="workspace-card workspace-form" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(""); const name = new FormData(event.currentTarget).get("name"); const res = await fetch("/api/workspace/organization", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }); setBusy(false); if (res.ok) router.refresh(); else setError("Työtilan luonti epäonnistui."); }}><label>Yrityksen nimi<input name="name" minLength={2} maxLength={160} required /></label><button disabled={busy} className="workspace-primary">Luo työtila</button>{error && <p role="alert">{error}</p>}</form>;
}
