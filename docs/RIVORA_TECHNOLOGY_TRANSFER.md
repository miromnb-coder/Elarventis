# Toteutussiirto (14.10.2026)

Kaikki alla olevat muutokset ovat Elarventiksen lähdekoodissa. Rivorasta ei kopioitu tunnuksia, SQL-skeemaa eikä liiketoimintasääntöjä.

## Sovelletut periaatteet ja tiedostot

- `src/lib/documents/integrity.ts`, `upload.ts`, `upload-core.ts`: tavujen SHA-256 palvelimella Storage-uudelleenluvusta, määrän vertailu, korruptoituneen keskeneräisen latauksen poisto ja uudelleenyritys. Dokumentin viimeistelyä ei voi tehdä julkisella käyttäjä-RPC:llä.
- `src/lib/supabase/trusted.ts`: vain neljän nimetyn RPC:n palvelinkutsut. Avain `ELARVENTIS_SERVICE_ROLE_KEY` on palvelimen oma ja puuttuessaan toiminto sulkeutuu. Se ei kuulu `NEXT_PUBLIC_`-muuttujiin eikä git-repoon.
- `supabase/migrations/20261013120000_foundation.sql`: `verified_at`, muuttumattoman dokumentin triggeri, yksityisen bucketin keskeneräisen objektin poisto-oikeus, `verify_document`, atominen `commit_audit_run`, idempotentti syötehash, audit-historian muuttumattomuus, claim/finish-lease-tokenit ja työjonon indeksit. Foundation-migraatiota muutettiin, koska sitä ei ole vielä ajettu mihinkään Elarventiksen projektiin.
- `src/lib/audit-engine/persist.ts`, `src/app/api/workspace/audits/route.ts`: hyväksyttyjen versioiden ja laskurivien haku käyttäjän RLS-näkymällä, puhdas deterministinen laskenta ja atominen tallennus. Laskennan syötteet ja käytetyt sääntöviitteet jäävät snapshotiin.
- `src/app/api/workspace/invoices/process/route.ts`: tallennettujen laskutavujen uusi eheystarkistus ennen parsimista ja palvelinrajattu lease-kuittaus.
- `src/lib/rates/zip.ts`, `parse.ts`: kaikkien ZIP-merkintöjen rajattu purku, keskushakemiston ja paikallisten otsakkeiden vertailu, päällekkäisten ja XML-entity-syötteiden hylkääminen. Ei uutta tuotantoriippuvuutta.
- `.github/workflows/ci.yml`, `src/middleware.ts`, `scripts/smoke-gate.mjs`, `tests/integrity.test.mjs`, `tests/zip-security.test.mjs`, `tests/zip-fixture.mjs`: CI ja synteettiset tavujen/ZIP:n turvatestit.

## Rajoitukset

Migraation SQL:ää ei ole ajettu PostgreSQL:ssä. RLS, Storage ja RPC:n atomisuus on testattava oikeaa Supabase-skeemaa vasten ennen avaamista. Työjonon PDF/CSV/XLSX-poiminnan monivaiheiset REST-kirjoitukset eivät vielä ole yksi transaktio; nykyinen dedupe estää yleiset uusintalisäykset, mutta ei kaikkia osittaisten rivierien skenaarioita. Riippumaton worker ja kutsujen sähköpostitoimitus puuttuvat. CSV/PDF-parsinta on rajattu tuettuun malliin, eikä OCR:ää ole.

Paikalliset testit: `npm run typecheck`, `npm run lint`, `npm test` (27/27) ja `npm run build` läpäisivät. Suoria tietokanta-, Storage-, API-integraatio- ja selain-E2E-testejä ei tehty.

Merkittävä uusi havainto: alkuperäinen `middleware.ts` oli projektin juuressa eikä Next.js:n `src`-reitityksessä käytössä. Se siirrettiin `src/middleware.ts`:ään. Suljettu portti on nyt tarkistettu HTTP-smokella (etusivu 200, suojatut sivut 307, API 503).

Lisäksi `src/lib/supabase/rest.ts`, `src/app/api/workspace/{invoices,findings,active}/route.ts` ja `src/app/app/{layout,page,sopimukset/*}` suodattavat jäsenyyskyselyt nyt myös nykyisen käyttäjän `user_id`:llä. Aiempi API-tason roolipäätös saattoi käyttää toisen saman organisaation jäsenen roolia. Varsinainen RLS olisi silti rajoittanut tietokantakirjoituksia, mutta API-päätös ja käyttöliittymän oikeusnäyttö olivat virheellisiä.

Migraation PostgreSQL-syntaksi jäsennettiin paikallisesti `pglast`-parserilla: 144 lausetta. Se ei suorita funktioita eikä korvaa oikean PostgreSQL/Supabase-ympäristön testiä. Elarventis ei lisää Rivoran `pdf-lib`-, `exceljs`- tai muita pakettiriippuvuuksia; niiden lisenssien siirtotarvetta ei synny.
