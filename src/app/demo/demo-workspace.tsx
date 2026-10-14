"use client";
import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, FileText, ScrollText, Table2, ScanSearch, CircleAlert, ChartNoAxesCombined, Settings, Search } from "lucide-react";

const nav = [
  { id:"yleiskatsaus", label:"Yleiskatsaus", icon:LayoutDashboard },
  { id:"laskut", label:"Kuljetuslaskut", icon:FileText },
  { id:"sopimukset", label:"Sopimukset", icon:ScrollText },
  { id:"hinnastot", label:"Hinnastot", icon:Table2 },
  { id:"tarkastukset", label:"Tarkastukset", icon:ScanSearch },
  { id:"poikkeamat", label:"Poikkeamat", icon:CircleAlert },
  { id:"raportit", label:"Raportit", icon:ChartNoAxesCombined },
  { id:"asetukset", label:"Asetukset", icon:Settings },
] as const;
type Section = (typeof nav)[number]["id"];
type Invoice = {number:string;carrier:string;date:string;billed:number;expected:number;status:"Poikkeama"|"Tarkistettu"|"Kesken";reason:string};
const invoices:Invoice[] = [
  {number:"KL-2048",carrier:"Kuljetus A",date:"12.10.2026",billed:1840,expected:1690,status:"Poikkeama",reason:"Rahdin perusmaksu ylittää hyväksytyn hinnaston 150 eurolla."},
  {number:"KL-2047",carrier:"Logistiikka B",date:"11.10.2026",billed:980,expected:980,status:"Tarkistettu",reason:"Ei tarkistettavaa hintaeroa."},
  {number:"KL-2046",carrier:"Kuljetus C",date:"10.10.2026",billed:2420,expected:2305,status:"Poikkeama",reason:"Sopimushintaan verrattuna 115 euron ero."},
  {number:"KL-2045",carrier:"Logistiikka D",date:"9.10.2026",billed:1360,expected:1360,status:"Kesken",reason:"Tarkastus on vielä kesken."},
];
const eur=(n:number)=>new Intl.NumberFormat("fi-FI",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(n);
function Status({value}:{value:Invoice["status"]}){return <span className="demo-status" data-kind={value==="Poikkeama"?"issue":value==="Kesken"?"progress":"ok"}>{value}</span>;}
function Summary() {
  return <div className="demo-metrics">
    {[["Kuljetuslaskut","4","Esimerkkiaineistossa"],["Tarkastettavat erot","2","Vaatii käyttäjän tarkistuksen"],["Mahdollinen ero","265 €","Ei vahvistettu säästö"],["Tarkastettu","1 / 4","Yksi lasku käsitelty"]].map(([name,value,note])=><div className="demo-stat" key={name}><span>{name}</span><strong>{value}</strong><small>{note}</small></div>)}
  </div>;
}
export function DemoWorkspace(){
  const [section,setSection]=useState<Section>("yleiskatsaus");
  const [chosen,setChosen]=useState(invoices[0]);
  const [query,setQuery]=useState("");
  const active=nav.find(x=>x.id===section)!;
  const filtered=invoices.filter(x=>(x.number+" "+x.carrier+" "+x.status).toLowerCase().includes(query.toLowerCase()));
  const selectInvoice=(invoice:Invoice)=>{setChosen(invoice);setSection("laskut");};
  const invoiceTable=(rows:Invoice[])=><div className="demo-table-wrapper"><table className="demo-table"><thead><tr><th>LASKU</th><th>KULJETUSLIIKE</th><th>SUMMA</th><th>TILA</th></tr></thead><tbody>{rows.map(x=><tr key={x.number} data-selected={chosen.number===x.number}><td><button onClick={()=>selectInvoice(x)} type="button" aria-label={"Näytä lasku "+x.number}>{x.number}</button></td><td>{x.carrier}</td><td>{eur(x.billed)}</td><td><Status value={x.status}/></td></tr>)}</tbody></table>{rows.length===0&&<p>Hakua vastaavaa laskua ei löytynyt.</p>}</div>;
  const compare=<section className="demo-card"><h2>Hintavertailu</h2><p>{chosen.number} · {chosen.carrier} · {chosen.date}</p><div className="demo-compare"><div><span>Laskutettu</span><strong>{eur(chosen.billed)}</strong></div><div><span>Sopimushinta</span><strong>{eur(chosen.expected)}</strong></div><div><span>Mahdollinen ero</span><strong>{eur(Math.max(0,chosen.billed-chosen.expected))}</strong></div></div><div className="demo-note"><strong>{chosen.status==="Poikkeama"?"Tarkistettava havainto":chosen.status==="Kesken"?"Käsittely kesken":"Ei poikkeamaa"}</strong><div>{chosen.reason}</div></div><div className="demo-actions"><button className="demo-button secondary" type="button" onClick={()=>setSection("poikkeamat")}>Näytä poikkeamat</button></div></section>;
  const title=active.label;
  const descriptions:Record<Section,string>={
    yleiskatsaus:"Tarkastusten kokonaistilanne ja seuraavat käsiteltävät laskut.",
    laskut:"Vertaa esimerkkilaskuja hyväksyttyihin sopimushintoihin.",
    sopimukset:"Kuljetussopimukset ja niiden hinnastoversiot yhdessä paikassa.",
    hinnastot:"Hyväksytyt hintasäännöt muodostavat tarkastuksen perusteen.",
    tarkastukset:"Seuraa laskujen tarkastuksia ja niiden tiloja.",
    poikkeamat:"Avaa tarkistettavat veloituserot ja niiden laskentaperusteet.",
    raportit:"Tarkastusten raportit ja tulosten yhteenveto.",
    asetukset:"Yrityksen työtilan asetukset ja käyttäjäroolit."
  };
  return <div className="demo">
    <div className="demo-banner"><strong>ESIKATSELU</strong> · Vain kuvitteellista aineistoa · Ei kirjautumista eikä yhteyttä tuotantotietokantaan</div>
    <div className="demo-shell">
      <aside className="demo-sidebar"><div className="demo-brand">Elarventis<small>DEMO</small></div><nav className="demo-navigation" aria-label="Demon osiot">{nav.map(x=><button key={x.id} type="button" aria-current={section===x.id?"page":undefined} onClick={()=>setSection(x.id)}><x.icon size={18}/>{x.label}</button>)}</nav><div className="demo-side-footer">Pure Monochrome -tyylin esikatselu.<Link href="/">Takaisin etusivulle ↗</Link></div></aside>
      <div className="demo-content">
        <header className="demo-header"><div><small>Työtila / {active.label}</small><strong>{active.label}</strong></div><span className="demo-company">Esimerkki Oy</span></header>
        <nav className="demo-mobile" aria-label="Demon mobiilinavigaatio">{nav.map(x=><button key={x.id} type="button" aria-current={section===x.id?"page":undefined} onClick={()=>setSection(x.id)}>{x.label}</button>)}</nav>
        <main className="demo-main">
          <div className="demo-kicker">ELARVENTIS / ESIMERKKIYRITYS</div><h1 className="demo-title">{section==="yleiskatsaus"?"Työtilasi yhdessä näkymässä.":title}</h1><p className="demo-lead">{descriptions[section]}</p>
          {section==="yleiskatsaus"&&<><Summary/><div className="demo-columns"><section className="demo-card"><h2>Viimeisimmät laskut</h2><p>Tutki yhden esimerkkilaskun vertailua valitsemalla lasku.</p>{invoiceTable(invoices)}<div className="demo-actions"><button className="demo-button" onClick={()=>setSection("laskut")}>Kaikki kuljetuslaskut →</button></div></section>{compare}</div></>}
          {section==="laskut"&&<div className="demo-columns"><section className="demo-card"><h2>Laskut</h2><p>Valitse lasku, jotta näet sopimushinnan ja mahdollisen eron.</p><label className="demo-search"><Search size={17}/><span className="sr-only">Hae esimerkkilaskuja</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Hae laskua tai kuljetusliikettä"/></label>{invoiceTable(filtered)}</section>{compare}</div>}
          {section==="poikkeamat"&&<div className="demo-columns"><section className="demo-card"><h2>Tarkistettavat veloituserot</h2><p>Havainnot ovat vasta tarkistettavia, eivät hyväksyttyjä reklamaatioita.</p>{invoiceTable(invoices.filter(x=>x.status==="Poikkeama"))}</section>{compare}</div>}
          {section==="sopimukset"&&<section className="demo-card"><h2>Kuljetussopimukset</h2><p>Hyväksyttyihin sopimuksiin sidotaan voimassa olevat hinnastot.</p><ul className="demo-list"><li><span><strong>Kotimaan rahtisopimus</strong><small>Kuljetus A · voimassa 2026</small></span><span className="demo-status">Hyväksytty</span></li><li><span><strong>Jakelusopimus</strong><small>Logistiikka B · versio 2</small></span><span className="demo-status">Hyväksytty</span></li></ul><div className="demo-actions"><button className="demo-button" onClick={()=>setSection("hinnastot")}>Avaa hinnastot →</button></div></section>}
          {section==="hinnastot"&&<section className="demo-card"><h2>Hinnastojen perustiedot</h2><p>Hintaa verrataan oikeaa palvelua ja sopimusversiota vasten.</p><div className="demo-table-wrapper"><table className="demo-table"><thead><tr><th>PALVELU</th><th>KULJETUSLIIKE</th><th>SOPIMUSHINTA</th><th>TILA</th></tr></thead><tbody><tr><td>Rahdin perusmaksu</td><td>Kuljetus A</td><td>1 690 €</td><td><span className="demo-status">Hyväksytty</span></td></tr><tr><td>Jakelu</td><td>Logistiikka B</td><td>980 €</td><td><span className="demo-status">Hyväksytty</span></td></tr></tbody></table></div></section>}
          {section==="tarkastukset"&&<section className="demo-card"><h2>Tarkastusten tilanne</h2><p>Esimerkkiaineistossa kaksi laskua vaatii jatkokäsittelyä.</p>{invoiceTable(invoices)}<div className="demo-actions"><button className="demo-button" onClick={()=>setSection("poikkeamat")}>Tarkastele havaintoja →</button></div></section>}
          {section==="raportit"&&<section className="demo-card"><h2>Raporttien yhteenveto</h2><p>Raporttien vienti ei ole käytössä tässä julkisessa demossa.</p><div className="demo-metrics"><div className="demo-stat"><span>Laskuja</span><strong>4</strong><small>Synteettiset tiedot</small></div><div className="demo-stat"><span>Poikkeamia</span><strong>2</strong><small>Vaatii tarkistuksen</small></div></div><div className="demo-note">Oikeassa työtilassa valmiista tarkastuksista voidaan muodostaa raportteja vasta hyväksytyn käsittelyn perusteella.</div></section>}
          {section==="asetukset"&&<section className="demo-card"><h2>Esimerkki Oy</h2><p>Yrityksen asetusten havainnollistava näkymä. Täällä ei voi muokata oikeita käyttäjiä.</p><ul className="demo-list"><li><span><strong>Työtilan nimi</strong><small>Esimerkki Oy</small></span><span className="demo-status">Aktiivinen esimerkki</span></li><li><span><strong>Oma rooli</strong><small>Omistaja</small></span><span className="demo-status">Demo</span></li><li><span><strong>Tiimin kutsut</strong><small>Ei käytössä tässä demossa</small></span><span className="demo-status">Ei aktivoitu</span></li></ul></section>}
        </main>
      </div>
    </div>
  </div>;
}
