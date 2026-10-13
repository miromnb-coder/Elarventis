# Frankfurtin tietokannan aktivointipäätös, 13.10.2026

## Todettu tila

Projekti `ktaoqivtuzcitxjfyyys` on alueella `eu-central-1`, tila `ACTIVE_HEALTHY`, PostgreSQL 17.11. Read-only-kyselyssä oli 0 `auth.users`-riviä, 0 `public`-sovellustaulua, 0 Storage-buckettia ja 0 Storage-objektia. Supabasen migraatioluettelo oli tyhjä. Tietokannan tyhjyys vähentää ensimmäisen skeeman tietojen menetysriskiä, mutta ei osoita palautuksen toimivuutta.

## Valmisteltu muutos

`supabase/migrations/20261013120000_foundation.sql` perustaa yritys-, jäsenyys-, sopimus-, hinnasto-, dokumentti-, lasku-, työjono-, tarkastus- ja raporttitaulut sekä `elarventis-documents`-nimisen yksityisen bucketin. Tauluilla on organisaatiosidonnaiset viiteavaimet ja RLS. Tiedostot ovat enintään 10 Mt. Migraatiota ei ole ajettu.

## Turvallisuusportit ennen hyväksyntäpyyntöä

1. Testaa SQL oikealla PostgreSQL 17 / Supabase Storage -ympäristöllä sekä suorita kahden synteettisen yrityksen suorat RLS-, RPC- ja Storage-kokeet. Nykyinen ympäristö ei salli Dockeria eikä uutta testiprojektia ole käyttäjän ohjeen mukaan luotu.
2. Varmista dokumentin tavujen SHA-256 palvelimen luottamusrajalla ja estä käyttäjää ohittamasta vahvistusta suoralla `finish_document`-RPC-kutsulla. Nykyinen RPC tarkistaa vain Storage-objektin olemassaolon.
3. Toteuta tarkastusajon luotettu pysyvä tallennus. `audit_runs`- ja `audit_results`-tauluihin ei ole myönnetty tavalliselle käyttäjälle INSERT-oikeutta, koska käyttäjän itse ilmoittamaa laskentatulosta ei saa hyväksyä.
4. Selvitä projektin todellinen varmuuskopiointipalvelutaso ja testaa palautus. Storage-objektien palautus on erillinen tietokannan palautuksesta. Palautustestiä ei ole tehty eikä sitä merkitä onnistuneeksi tyhjän projektin perusteella.
5. Tee täydet typecheck, lint, tuotantobuild ja API/E2E-testit; varmista kutsusähköpostien toimitus. Pidä `ELARVENTIS_MVP_ENABLED` poissa `enabled`-arvosta siihen asti.

## Käyttöönoton ja palautuksen järjestys

Kun yllä olevat portit täyttyvät, tallenna migraation tarkka SHA, ota palvelutasolla varmennettu tietokantakopio ja erillinen Storage-objektien inventaario/tarkistussummat, testaa palautus sekä pyydä erillinen nimenomainen hyväksyntä. Suorita sen jälkeen lähdekoodiin tallennettu versioitu migraatio. Tarkista taulut, rajoitteet, RLS, RPC-oikeudet ja bucketin yksityisyys sekä aja synteettinen kahden yrityksen työnkulku. Älä käytä oikeita asiakastietoja.

Jos migraatio epäonnistuu tai synteettiset testit paljastavat kriittisen virheen, jätä työtilaportti suljetuksi. Palauta tietokanta testatusta kopiosta ja Storage inventaarion mukaisesti; vertaa palautuksen tauluja, rivejä ja objektien tarkistussummia alkuperäiseen. Älä poista migraation luomia tauluja käsin ennen kuin on varmistettu, ettei niihin ole kertynyt säilytettävää tietoa. Varsinaisen projektin palautustoimenpide vaatii erillisen päätöksen.
