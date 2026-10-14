import Link from "next/link";
import { ArrowRight, ArrowUpRight, CircleHelp } from "lucide-react";
import { MobileNav } from "@/components/mobile-nav";
import { SoftwarePreview } from "@/components/software-preview";
import { ContactDraft } from "@/components/contact-draft";

const links = [
  { label: "Ratkaisu", href: "#ratkaisu" },
  { label: "Työnkulku", href: "#tyonkulku" },
  { label: "Kenelle", href: "#kenelle" },
  { label: "Kysymykset", href: "#kysymykset" },
  { label: "Kirjaudu", href: "/kirjaudu" },
];
const steps = [
  ["01", "Sopimus ja hinnasto", "Tuo sovitut veloitusperusteet ja tarkista, että lähdetiedot ovat oikein."],
  ["02", "Kuljetuslasku", "Lisää tarkastettava lasku. Epäselvät rivit jäävät käsiteltäviksi."],
  ["03", "Automaattinen tarkastus", "Rajatut veloitukset verrataan hyväksyttyihin sopimushintoihin."],
  ["04", "Poikkeamat ja raportti", "Tarkista laskennan peruste, tee päätös ja vie raportti eteenpäin."],
];
const faq = [
  ["Tarkastaako Elarventis kaikki kuljetuslaskut?", "Ei automaattisesti kaikkia. Ensimmäinen versio on tarkoitettu rajattuihin, sopimuksella todennettaviin veloituksiin. Epäselvät tapaukset jäävät ihmisen tarkistettaviksi."],
  ["Mistä mahdollinen poikkeama syntyy?", "Tarkastus vertaa laskun tunnistettua veloitusta hyväksyttyyn hinnastoon ja näyttää laskennan perusteen. Esimerkkiesittely käyttää vain kuvitteellisia tietoja."],
  ["Tarvitaanko heti integraatio toiminnanohjausjärjestelmään?", "Ei ensimmäisessä käyttöönotossa. Dokumentit voidaan käsitellä rajatussa työnkulussa; mahdolliset integraatiot arvioidaan erikseen."],
  ["Voiko ohjelmistoa jo käyttää asiakasdatalla?", "Asiakaskäyttöä ei ole avattu. Kirjautumisen, yrityseristyksen ja integraatioiden hyväksymistestit ovat vielä edessä."],
];
export default function Home() {
  return <div className="premium-home" id="alku">
    <a className="skip-link" href="#sisalto">Siirry sisältöön</a>
    <header className="site-header wrap"><Link href="/" className="wordmark" aria-label="Elarventis, etusivu">Elarventis<span className="wordmark-period">.</span></Link><nav className="desktop-nav" aria-label="Päänavigaatio">{links.slice(0, 4).map(link => <a key={link.href} href={link.href}>{link.label}</a>)}</nav><Link className="home-login" href="/kirjaudu">Kirjaudu</Link><a className="header-cta" href="#yhteys">Ota yhteyttä <ArrowUpRight size={17} /></a><MobileNav links={links} /></header>
    <main id="sisalto">
      <section className="new-hero wrap" aria-labelledby="hero-title">
        <div className="new-hero-copy"><p className="home-kicker"><span /> KULJETUSLASKUJEN TARKASTUS / B2B</p><h1 id="hero-title">Tiedä, mistä <em>kuljetuslaskusi</em> muodostuvat.</h1><p className="new-hero-lead">Elarventis vertaa yrityksen kuljetuslaskujen veloituksia sovittuihin hintoihin ja kokoaa tarkistettavat erot perusteluineen yhteen työtilaan.</p><div className="hero-actions"><a className="button button-dark" href="#ratkaisu">Tutustu ratkaisuun <ArrowRight size={18} /></a><a className="home-text-link" href="#yhteys">Kerro tarpeestasi ↗</a></div><div className="hero-footnotes"><span>01 / SOPIMUSPERUSTEINEN VERTAILU</span><span>02 / IHMISEN VAHVISTUS</span></div></div>
        <div className="hero-proof" aria-label="Havainnollistava vertailu"><div className="hero-proof-top"><span>HAVAINNOLLISTAVA ESIMERKKI</span><span>KL-2048 ↗</span></div><div className="hero-proof-main"><span>YKSITTÄINEN VELOITUS</span><strong>Rahdin perusmaksu</strong><div><span>Laskutettu</span><b>1 840 €</b></div><div><span>Sopimushinta</span><b>1 690 €</b></div></div><div className="hero-proof-result"><div><small>TARKISTETTAVA ERO</small><strong>+150 €</strong></div><p>Hinta ylittää sopimusrivin 150 eurolla. Tarkista ehdot ja lähde ennen päätöstä.</p></div><div className="hero-proof-bottom">SOPIMUS → LASKU → PERUSTELTU HAVAINTO</div></div>
      </section>
      <div className="home-ribbon"><div className="wrap"><span>Yksi selkeä tarkastuspolku</span><span>Hinnastosta havaintoon <ArrowRight size={17} /></span></div></div>
      <section className="home-section wrap" id="ratkaisu"><div className="home-section-heading"><div><p className="home-kicker">01 / RATKAISU</p><h2>Poikkeama näkyy.<br /><em>Peruste on mukana.</em></h2></div><p>Manuaalinen tarkastus vie aikaa, kun sopimus, lasku ja päätös elävät eri paikoissa. Elarventis tuo ne samaan, yrityskohtaiseen näkymään.</p></div><div className="home-benefits"><article><span>01</span><h3>Vähemmän käsin vertailua</h3><p>Rajattu sääntöpohjainen tarkastus nostaa tarkistettavat rivit esiin.</p></article><article><span>02</span><h3>Jäljitettävä havainto</h3><p>Näe laskutettu hinta, sopimushinta ja ero samassa asiayhteydessä.</p></article><article><span>03</span><h3>Yhteinen historia</h3><p>Pidä laskut, sopimusversiot ja tarkistuspäätökset samassa työtilassa.</p></article></div></section>
      <section className="home-product" aria-labelledby="product-title"><div className="wrap"><div className="home-section-heading"><div><p className="home-kicker">02 / TUOTTEEN ESIKATSELU</p><h2 id="product-title">Tarkastelusta <em>ymmärrykseen.</em></h2></div><p>Valitse esimerkkilasku ja katso, miten hintaero ja tarkastuksen tila näkyvät rinnakkain.</p></div><SoftwarePreview /><p className="preview-caption"><CircleHelp size={16} /> Kaikki nimet ja luvut ovat synteettistä esimerkkiaineistoa. Esittely ei ole asiakastulos eikä näyttö tuotantovarmennuksesta.</p></div></section>
      <section className="home-section wrap" id="tyonkulku"><div className="home-section-heading"><div><p className="home-kicker">03 / TYÖNKULKU</p><h2>Viisi askelta.<br /><em>Yksi tarkistettava ketju.</em></h2></div><p>Tuonti, tulkinta ja laskenta pidetään erillään. Käyttäjä tarkistaa havainnon ennen kuin sitä käytetään päätöksen perusteena.</p></div><div className="home-steps">{steps.map(([number, title, body]) => <article key={number}><span>{number} / 04</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="home-audience" id="kenelle"><div className="wrap"><p className="home-kicker">04 / KENELLE</p><div className="home-audience-grid"><h2>Kun kuljetuksia on paljon, jokaisen veloituksen <em>pitää kestää tarkastelu.</em></h2><div><p>Elarventis on suunniteltu yrityksille, jotka vertaavat kuljetuslaskuja omiin kuljetussopimuksiinsa.</p><ul><li>Maahantuojat</li><li>Tukkukaupat</li><li>Valmistavat yritykset</li></ul></div></div></div></section>
      <section className="home-section wrap home-faq" id="kysymykset"><div className="home-section-heading"><div><p className="home-kicker">05 / USEIN KYSYTTYÄ</p><h2>Ennen kuin <em>aloitetaan.</em></h2></div></div><div className="faq-list">{faq.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
      <section className="home-contact" id="yhteys"><div className="wrap home-contact-grid"><div><p className="home-kicker">06 / OTA YHTEYTTÄ</p><h2>Selvitetään, miten laskunne tarkastetaan tänään.</h2><p>Valmistele viesti omassa selaimessasi. Lähetyskanava avataan, kun yhteystiedot ja tietosuojateksti ovat valmiit.</p></div><ContactDraft /></div></section>
    </main><footer className="site-footer"><div className="wrap"><div className="footer-main"><div><Link href="/" className="wordmark wordmark-small">Elarventis<span className="wordmark-period">.</span></Link><p>Kuljetuslaskujen sopimusperusteinen tarkastus yrityksille.</p></div><nav aria-label="Alatunniste">{links.map(link => link.href.startsWith("/") ? <Link key={link.href} href={link.href}>{link.label}</Link> : <a key={link.href} href={link.href}>{link.label}</a>)}</nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Elarventis</span><span>Yritystiedot ja tietosuojateksti julkaistaan niiden valmistuttua.</span><a href="#alku">Takaisin ylös ↑</a></div></div></footer>
  </div>;
}
