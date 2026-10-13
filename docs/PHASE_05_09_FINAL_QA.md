# Vaiheiden 5–9 QA, 13.10.2026

## Tila

| Vaihe | Tila | Estävä hyväksymiskriteeri |
| --- | --- | --- |
| 5 | Osittain toteutettu | Migraatio, suorat RLS/Storage-testit, sähköposti ja kutsut puuttuvat; omistajuus-RPC on testaamatta |
| 6 | Osittain toteutettu | Pysyvä sopimus-/hinnastotyönkulku, versiointi ja suora integraatiotesti puuttuvat |
| 7 | Osittain toteutettu | Migraatio ajamatta, pysyvä riippumaton worker ja RLS/E2E-testit puuttuvat |
| 8 | Osittain toteutettu | Audit-ajon turvallinen pysyvä sovellusintegraatio ja golden-kokonaisajo puuttuvat |
| 9 | Osittain toteutettu | Havaintojen UI/API, tallennetut raportit ja täydellinen PDF puuttuvat |

## Todelliset tarkistukset

- GitHub `main` lähtöcommit: `43d1c7aca5ec14ec96a1d26b87620d013142140f`. Repo rekonstruoitiin GitHub-connectorin tiedostoista, koska execution-ympäristön proxy esti `git clone`-komennon. Muutokset ovat paikallisessa `/workspace/Elarventis`-hakemistossa; GitHubiin ei ole tehty commitia.
- Vercel `elarventis` on liitetty tähän GitHub-repoon ja viimeisin julkaisu oli `production`. Main-pushia ei tehty, jotta automaattinen julkaisu ei ohita hyväksyntää.
- Supabase `ktaoqivtuzcitxjfyyys`: Frankfurt, ACTIVE_HEALTHY, PostgreSQL 17.11. Lukuhetkellä 0 public-taulua, 0 Auth-käyttäjää, 0 Storage-buckettia ja 0 objektia sekä 0 sovellusmigraatiota. Security Advisor: 0 havaintoa tyhjästä skeemasta.
- Migraatiota ei ajettu. Eristetty SQL-migraatiotesti ja tietokannan sekä Storagen palautustesti: **ei suoritettu**. Docker-socket palautti `operation not permitted`; uutta maksullista projektia ei luotu. Tyhjä projekti ei korvaa palautustestiä.
- Node 24.19: 24/24 synteettistä moduulitestiä läpäisi (audit 6, laskuparseri 5, hinnastoparseri 4, raportti ja reklamaatio 5, latauksen tilakone 4). Testit eivät ole API-, tietokanta- tai E2E-testejä.
- Synteettiset PDF:t läpäisivät `pdfinfo`-rakennetarkistuksen (1 ja 2 A4-sivua); synteettinen XLSX läpäisi `unzip -t`-eheystarkistuksen. Visuaalista tai taulukkolaskentaohjelman testiä ei tehty.
- TypeScript typecheck, ESLint ja Next production build: **käynnistys epäonnistui**, kukin exit 127 (`tsc`, `eslint` ja `next` puuttuivat). `npm ci --offline` epäonnistui puuttuvaan `yocto-queue`-välimuistipakettiin; execution-proxy ei vastannut. Selaimen 375/430/768/1440 px ja saavutettavuustarkistukset: **ei suoritettu**.
- RLS-eristys, Storage-käyttöoikeudet, kahden yrityksen API-kokeet, sähköpostitoimitus, migraation palautus sekä koko 22 kohdan E2E: **ei suoritettu**.

## Turvallisuus ja palautuminen

Lokakuun 13. päivän jatkokierroksella aiemman työtilan koko lähdekoodi löytyi `/workspace/Elarventis`-hakemistosta. GitHubin `main` oli yhä commitissa `43d1c7aca5ec14ec96a1d26b87620d013142140f`. Projektissa oli edelleen 0 Auth-käyttäjää, 0 public-taulua, 0 bucketia ja 0 objektia. `npm test` läpäisi jälleen kaikki viisi testitiedostoa (24 nimettyä testiä); TypeScript-tiedostojen Node-syntaksitarkistus läpäisi. Varsinaista typecheckiä ei voitu tehdä: `tsc` puuttuu. Työtila- ja Auth-reitit suljettiin palvelinympäristön `ELARVENTIS_MVP_ENABLED`-portilla, jonka oletusarvo on pois käytöstä. Portin lisääminen ei todista sovelluksen toimivuutta.

Ei oikeaa asiakasdataa. Sovellus käyttää käyttäjän JWT:tä; service-role-avainta ei lisätty. SQL sisältää org-sidotut FK:t, RLS-politiikat ja yksityisen bucketin, mutta niitä ei ole vahvistettu PostgreSQL:ssä. Tiedostojen keskeytyneet tilat voidaan täsmäyttää ja epäonnistunut varaus siivota vain Storage-objektin puuttuessa. Hyväksyttyä dokumenttia ei siivota automaattisesti. Palautusmenettelyn tulee kattaa PostgreSQL-dumpin palautus **ja** bucket-objektien erillinen kopiointi sekä tarkistussummien vertailu erillisessä ympäristössä. Tätä ei ole tehty.

Avoin eheysriski: käyttäjä voi tehdä suoran Storage-uploadin omaan varattuun polkuunsa. `finish_document` todentaa objektin olemassaolon mutta ei voi SQL:ssä todentaa sen SHA-256-sisältöä dokumenttiriviä vastaan. Ennen luotettavaa hyväksyntää tarvitaan palvelinpuolinen sisällön uudelleenluku ja tarkistussumma sekä tapa estää suoran RPC-kutsun ohitus. Audit-ajojen kirjoitus on tarkoituksella ilman käyttäjälle myönnettyä INSERT-oikeutta, kunnes palvelimen laskentatuloksen luotettu pysyvyysraja on toteutettu. Tämä estää käyttäjän itse keksimien tarkastustulosten julkaisemisen.

## Ennen vaihetta 10 ja asiakasdataa

1. Hanki toimiva eristetty PostgreSQL/Supabase-ympäristö ja npm-riippuvuudet; suorita migraatio, palautusharjoitus ja täysi typecheck/build.
2. Sulje jäsenkutsu-, rooli-, sopimusversio- ja arkistointipuutteet; testaa omistajuus-RPC ja sähköpostitoimitus.
3. Toteuta turvallinen pysyvä audit-ajon luonti ja riippumaton työnsuoritus sekä havaintojen UI/API ja täydet raportit.
4. Suorita kaksi synteettistä organisaatiota kattavat suorat SQL/RLS/Storage/API/E2E-testit. Tarkista Auth-, tietosuoja-, palautus- ja julkaisuportit erikseen ennen oikeita asiakasdokumentteja.

Vaiheeseen 10 ei vielä siirrytä.
