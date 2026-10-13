"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function MobileNav({ links }: { links: { label: string; href: string }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);
  return <div className="mobile-nav">
    <button className="menu-toggle" type="button" aria-label={open ? "Sulje valikko" : "Avaa valikko"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}>{open ? <X size={24} /> : <Menu size={24} />}</button>
    {open && <nav id="mobile-menu" className="mobile-menu" aria-label="Mobiilinavigaatio">{links.map((link, i) => <a href={link.href} key={link.href} onClick={() => setOpen(false)}><span>0{i + 1}</span>{link.label}<ArrowUpRight size={20} /></a>)}</nav>}
  </div>;
}
