import { ArrowDownRight, ArrowRight, Check, CircleHelp, ClipboardList, FileCheck2, FileText, Layers3, Search, SlidersHorizontal } from "lucide-react";
import { ContactDraft } from "@/components/contact-draft";
import { MobileNav } from "@/components/mobile-nav";
import { SoftwarePreview } from "@/components/software-preview";

const links = [
  { label: "Ratkaisu", href: "#ratkaisu" },
  { label: "Miten toimii", href: "#miten-toimii" },
  { label: "Ominaisuudet", href: "#ominaisuudet" },
  { label: "Ota yhteyttä", href: "#yhteys" },
];

const benefits = [
  { icon: Layers3, title: "Sopimusperusteinen tarkastus", text: "Vertaile laskujen veloituksia sovittuihin hintoihin ja ehtoihin." },
  { icon: Search, title: "Poikkeamien tunnistaminen", text: "Nosta mahdolliset liikaveloitukset ja epäselvät rivit tarkistettaviksi." },
  { icon: ClipboardList, title: "Perustellut tarkastustulokset", text: "Näe, mistä havainto syntyy ja mikä sen rahallinen vaikutus voi olla." },
];

const steps = [
  { number: "01", icon: FileText, title: "Lisää laskut ja sopimukset", text: "Tuo tarkastettavat laskut ja niitä vastaavat kuljetussopimukset samaan näkymään." },
  { number: "02", icon: SlidersHorizontal, title: "Vertaile ja tunnista poikkeamat", text: "Ohjelmiston tavoitteena on verrata veloituksia sopimusehtoihin ja nostaa erot esiin." },
  { number: "03", icon: FileCheck2, title: "Tarkista havainnot ja käsittele tulokset", text: "Käy havainnot läpi, arvioi vaikutus ja valmistele tarvittaessa reklamaatio." },
];

function Wordmark({ small = false }: { small?: boolean }) {
  return <a href="#alku" className={`wordmark ${small ? "wordmark-small" : ""}`} aria-label="Elarventis, etusivulle">Elarventis<span className="wordmark-period">.</span></a>;
}

export default function Home() {
  return <>
    <div className="page-shell" id="alku">
      <header className="site-header wrap">
        <Wordmark />
        <nav className="desktop-nav" aria-label="Päänavigaatio">{links.map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav>
        <a className="header-cta" href="#yhteys">Kerro tarpeestasi <ArrowRight size={16} strokeWidth={1.8} /></a>
        <MobileNav links={links} />
      </header>

      <main>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-content">
            <p className="eyebrow"><span className="eyebrow-dot" /> KULJETUSKUSTANNUSTEN UUSI NÄKYMÄ <span className="eyebrow-rule" /></p>
            <h1 id="hero-title">Kuljetuslaskujen<br /> tarkastus. <em>Uudella</em><br /> tavalla.</h1>
            <p className="hero-lead">Tunnista mahdollisia liikaveloituksia, vertaile laskuja sopimushintoihin ja hallitse kuljetuskustannusten tarkastuksia yhdessä paikassa.</p>
            <div className="hero-actions"><a className="button button-dark" href="#ratkaisu">Tutustu ratkaisuun <ArrowRight size={17} /></a><a className="text-link" href="#miten-toimii">Miten se toimii <ArrowDownRight size={16} /></a></div>
          </div>
          <div className="hero-side-note" aria-hidden="true"><span /> PAREMPI NÄKYVYYS<br /> HARKITUMMAT PÄÄTÖKSET</div>
          <div className="hero-bottom"><span>01 / 04</span><span>SELAA ALASPÄIN <ArrowDownRight size={15} /></span></div>
        </section>

        <section className="benefit-section" id="ratkaisu" aria-labelledby="benefits-title">
          <div className="wrap"><div className="section-topline"><span>MIKSI ELARVENTIS</span><span>RAKENTEILLA OLEVA RATKAISU</span></div>
            <div className="benefit-heading"><h2 id="benefits-title">Jokainen veloitus<br /><em>ansaitsee tulla nähdyksi.</em></h2><p>Kuljetuslaskuissa on paljon yksityiskohtia. Elarventiksen tavoitteena on tehdä niiden tarkastuksesta selkeämpää ja hallittavampaa.</p></div>
            <div className="benefit-grid" id="ominaisuudet">{benefits.map((item, i) => <article className="benefit" key={item.title}><div className="benefit-top"><span className="icon-circle"><item.icon size={24} strokeWidth={1.5} /></span><span className="tiny-index">0{i + 1}</span></div><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
          </div>
        </section>

        <section className="process-section wrap" id="miten-toimii" aria-labelledby="process-title">
          <div className="section-topline"><span>MITEN SE TOIMII</span><span>AJATUS KOLMESSA VAIHEESSA</span></div>
          <div className="process-intro"><div><p className="mini-label">SELKEÄ POLKU LASKUSTA HAVAINTOON</p><h2 id="process-title">Tarkastus, joka etenee<br /><em>loogisesti.</em></h2></div><p>Yhdistä lähtötiedot, löydä tarkistettavat erot ja käsittele tulokset hallitusti. Alla on suunniteltu työnkulku — tuote on kehityksen alkuvaiheessa.</p></div>
          <div className="steps">{steps.map(step => <article className="step" key={step.number}><div className="step-head"><span>{step.number} / 03</span><step.icon size={25} strokeWidth={1.4} /></div><div><h3>{step.title}</h3><p>{step.text}</p></div><ArrowRight className="step-arrow" size={19} strokeWidth={1.5} /></article>)}</div>
        </section>

        <section className="preview-section" aria-labelledby="preview-title"><div className="wrap">
          <div className="section-topline"><span>OHJELMISTON ESIKATSELU</span><span>ESIMERKKINÄKYMÄ</span></div>
          <div className="preview-intro"><div><p className="mini-label">SUUNNITTEILLA OLEVA KÄYTTÖLIITTYMÄ</p><h2 id="preview-title">Näe poikkeama.<br /><em>Ymmärrä vaikutus.</em></h2></div><p>Yksi näkymä laskuihin, tarkastuksen etenemiseen ja havaintojen taustalla oleviin hintaeroihin.</p></div>
          <SoftwarePreview />
          <p className="preview-caption"><CircleHelp size={15} /> Konseptiesikatselu. Kaikki nimet, laskut ja summat ovat kuvitteellista esimerkkiaineistoa. Esitetty käyttöliittymä ei kuvaa valmista tuotetta.</p>
        </div></section>

        <section className="contact-section wrap" id="yhteys" aria-labelledby="contact-title"><div className="contact-glow" aria-hidden="true" /><div className="section-topline"><span>OTA YHTEYTTÄ</span><span>RAKENNETAAN PAREMPI NÄKYMÄ</span></div><div className="contact-content"><div><p className="mini-label">KESKUSTELLAAN TARPEESTASI</p><h2 id="contact-title">Parempi näkyvyys<br /><em>kuljetuskustannuksiin.</em></h2><p>Kiinnostaisiko selkeämpi tapa tarkastaa kuljetuslaskuja? Voit valmistella viestiluonnoksen tällä sivulla. Julkaisemme lähetyskanavan, kun se on määritelty.</p><div className="contact-points"><span><Check size={16} /> Sopimusperusteinen tarkastus</span><span><Check size={16} /> Havainnot päätösten tueksi</span></div></div><ContactDraft /></div></section>
      </main>

      <footer className="site-footer"><div className="wrap"><div className="footer-main"><div><Wordmark small /><p>Kehitteillä oleva ratkaisu kuljetuslaskujen tarkastukseen.</p></div><nav aria-label="Alatunnisteen navigaatio">{links.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}</nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Elarventis</span><span>Tietosuojaseloste ja yritystiedot lisätään, kun ne ovat saatavilla.</span><a href="#alku">Takaisin ylös ↑</a></div></div></footer>
    </div>
  </>;
}
