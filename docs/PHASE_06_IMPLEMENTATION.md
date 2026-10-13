# Vaihe 6 — sopimukset ja hinnastot

Tila: **osittain toteutettu, ei hyväksytty** (13.10.2026).

## Vaiheiden 5–9 jatkotarkistus 13.10.2026

Hyväksytyn sopimusversion muutostriggeri korjattiin niin, että `approved → superseded` sallii vain `state`-kentän muutoksen. Muut hyväksytyn version sisältömuutokset estetään. Siirtymä tehdään roolilla rajatun `supersede_version`-RPC:n kautta ja siitä kirjataan audit-tapahtuma. Hinnastosääntöjen muutos estyy edelleen hyväksytyssä ja syrjäytetyssä versiossa. SQL:ää ei ole suoritettu tai testattu PostgreSQL:ssä; ennen käyttöönottoa tarvitaan paikallinen migraatio-, palautus- ja suora RLS-testi.

Dokumenttilatauksen idempotentti uudelleenyritys lisättiin sekä sopimus-PDF:lle että hinnastolle. Arkistointi, uusien versioiden käyttöliittymä, täydellinen muutoshistoria ja PDF:n laajempi validointi ovat edelleen kesken. Edellinen hyväksymisportti ei täyty.

## Toteutettu lähdekoodiin

Yrityksen omien kuljetusliikkeiden lisäys, sopimusluonnoksen ja ensimmäisen version luonti, sopimusluettelo ja -näkymä, PDF:n tallennus ja rajatun CSV/XLSX-hinnaston esikatselu, rivien korjaus, luonnoksen tallennus ja roolilla rajattu hyväksyntä. Palvelin laskee SHA-256-tiivisteen ja estää saman dokumentin tuonnin samalle yritykselle samassa dokumenttiluokassa. PDF tarkistetaan otsakkeen, loppumerkinnän ja 10 Mt kokorajan perusteella. XLSX käsitellään rajatulla ZIP/XML-parserilla, jossa on koko- ja rivirajat sekä kaavojen esto. Tiedoston sisältö validoidaan palvelimella myös tallennuspyynnössä. Dokumentteja ei lähetetä AI-palveluun.

Ensimmäinen tuettu hinnasto on tarkasti rajattu: UTF-8 CSV (puolipiste tai pilkku) tai XLSX, ensimmäinen taulukko. Sarakkeet: palvelu, vyohyke, paino_alku_g, paino_loppu_g, hinta_eur, alv. ALV on sisaltaa tai ei_sisalla. Painoluokan yläraja on eksklusiivinen, alaraja inklusiivinen. EUR-hinta muunnetaan kokonaislukusenteiksi, eikä enempää kuin kaksi desimaalia hyväksytä. Tuonti säilyttää lähderivin. Tuettu sääntötyyppi on weight_band. Polttoainelisä, alennukset, minimi, lisämaksujen järjestys ja yleinen PDF-hinnan poiminta eivät ole käytössä.

SQL-RPC save_rate_draft tallentaa kaikki hintarivit yhtenä tietokantatransaktiona. approve_version tarkistaa roolin, hinnastorivit ja päällekkäisen hyväksytyn voimassaolokauden. Hyväksytty versio ja sen hintarivit on estetty muuttamasta. Hyväksyntä tallentaa hyväksyjän, aikaleiman ja audit-tapahtuman. Versiohistoria näkyy sopimussivulla. Eri hyväksyttyjä versioita ei luoda vielä käyttöliittymästä; tämä on jatkokehitystarve.

## Testaus ja puutteet

Puhdas hinnastoparseri: 4 testiä ajettu, 4 läpäisty Node 24:n TypeScript strip -tuella. TypeScript, ESLint ja Next build läpäistiin. Kirjautumaton suora POST /api/workspace/contracts palautti HTTP 401. Auth-, tietokanta-, RLS-, Storage- ja E2E-integraatiotestit ovat **ajamatta**. Supabase-migraatiota ei ajettu, joten päästä päähän -toimivuutta oikeaa tietokantaa vasten ei ole osoitettu. XLSX-parserin yhteensopivuus eri Excel-vientien kanssa on vahvistettava synteettisillä fixtureillä; nykyinen parseri hylkää ZIP data descriptor -rakenteen. PDF-rakennetarkistus ei ole täysi PDF-validaattori. Tiedoston lataus ennen tietokannan viimeistä kirjoitusta voi jättää yksityisen orpodokumentin virhetilanteessa, mikä vaatii idempotentin siivouksen. Sopimuksen arkistointi, kuljetusliikkeen muokkaus ja arkistointi, käyttäjäkutsut, profiiliasetukset, täydellinen muutoshistoria ja tarkastusten lukitus puuttuvat.

Vaihe 7:n aloittamisen ehto: vaiheiden 5–6 migraatiot, suorat eristystestit ja koko työnkulun E2E-testi onnistuvat, varmuuskopiointi ja palautus on todennettu, sekä ensimmäinen hinnastomuoto on validoitu todellista formaattia vastaavalla synteettisellä aineistolla.

