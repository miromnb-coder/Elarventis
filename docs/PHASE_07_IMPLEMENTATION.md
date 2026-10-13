# Vaihe 7 — laskujen tuonti

Tila: **osittain toteutettu, ei hyväksytty** (13.10.2026).

## Lähdekoodi

`src/lib/invoices/parse.ts` lukee rajattua UTF-8 CSV:tä, yksinkertaisen ensimmäisen taulukon XLSX:ää sekä PDF:ää, jonka tekstivirta sisältää yhden puolipiste-erotellun tietuerivin per `Tj`-tekstiobjekti. CSV/XLSX:n ensimmäisellä rivillä ovat laskunumero, laskupäivä, EUR ja kokonaissumma; toinen rivi on sarakeotsake. Oletussarakkeet: `lahetys`, `palvelu`, `palvelupaiva`, `veloitus`, `summa_eur`, `alv`, `paino_g`, `vyohyke`. Sarakekarttaa voi muuttaa laskunäkymässä ennen tuontia. Laskurivit säilyttävät lähderivin; ne jäävät tarkistamattomiksi, kunnes käyttäjä hyväksyy ne. OCR:ää vaativa skannattu PDF antaa selkeän virheen. Tuntemattomat laskupohjat, monisivuiset kompleksiset PDF:t, ZIP data descriptor -XLSX ja kaavat eivät ole tuettuja. AI-adapterin rajapinta on määritelty; maksullista AI-palvelua ei käytetä.

Valmisteltu migraatio sisältää `invoices`, `invoice_lines`, `shipments`, `invoice_imports`, `document_extractions`, `jobs` sekä org-sidotut viitteet. API lataa tiedoston yksityiseen bucketiin, luo idempotentin poimintatyön ja käsittelee rajatun työn erillisessä pyynnössä. Työjono sisältää `SKIP LOCKED`-varauksen, kahden minuutin vuokrauksen, enintään kolme yritystä ja deduplikointiavaimen. Varsinaista riippumatonta ajastettua workeria ei ole: selain käynnistää käsittelypyynnön. Tämä ei täytä kokonaan taustatyövaatimusta. Työn retry- ja palautumispolkuja ei ole integraatiotestattu.

Laskun lataus- ja rivitarkistusnäkymä on lisätty. Rivitarkistus-RPC kirjaa tekijän sekä ennen/jälkeen-arvot audit-lokiin. Lähdetiedoston katselu käyttää olemassa olevaa suojattua dokumenttireittiä. Supabase-migraatio on ajamatta, joten näkymän tietokantatoimivuutta ja tenant-eristystä ei ole todistettu.

## Testit

Viisi synteettistä parseritestiä läpäisi: CSV, virheelliset päivämäärät ja summat, rajattu XLSX, skannatun PDF:n esto ja tekstipohjainen PDF. API-, Storage-, RLS- ja E2E-testit puuttuvat.
