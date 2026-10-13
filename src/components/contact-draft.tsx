"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

export function ContactDraft() {
  const [saved, setSaved] = useState(false);
  return <form className="contact-form" onSubmit={event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    localStorage.setItem("elarventis-contact-draft", JSON.stringify(Object.fromEntries(data)));
    setSaved(true);
  }}>
    <div className="form-header"><span>VIESTILUONNOS</span><span>01 — 03</span></div>
    <div className="form-row"><label>Nimi<input name="name" autoComplete="name" placeholder="Etunimi Sukunimi" required onChange={() => setSaved(false)} /></label><label>Sähköposti<input name="email" type="email" autoComplete="email" placeholder="nimi@yritys.fi" required onChange={() => setSaved(false)} /></label></div>
    <label>Viestisi<textarea name="message" rows={3} placeholder="Kerro lyhyesti kuljetuslaskujen tarkastuksen tarpeistanne..." required onChange={() => setSaved(false)} /></label>
    <div className="form-end"><button type="submit" className="button button-dark">{saved ? "Luonnos tallennettu" : "Tallenna luonnos"}{saved ? <Check size={17} /> : <ArrowRight size={17} />}</button><p role="status">{saved ? "Luonnos tallentui tähän selaimeen. Sitä ei lähetetty." : "Viestiluonnos tallentuu vain tähän selaimeen. Lähetys ei ole vielä käytössä."}</p></div>
  </form>;
}
