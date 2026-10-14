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

## Päivitys 14.10.2026

Foundation-migraatioon lisättiin dokumentin palvelinvarmennus, tarkastusajon atominen tallennus ja lease-token. Se on edelleen **ajamatta**. Organisaation palvelutaso on Supabase Free: hallittua päivittäistä tietokantavarmuuskopiota ei ole käytettävissä Free-projekteille. Valmistele oma looginen dump ja erillinen Storage-objektien kopio, kokeile palautus kontrolloidusti ja varmista niiden tarkistussummat. Suoria RLS/Storage-kokeita ei tehty, koska projektin skeema on edelleen tyhjä. Katso [MVP-valmius](ELARVENTIS_MVP_READINESS.md).


## Toteutunut aktivointi — 14.10.2026

**Foundation-migraatio suoritettiin Frankfurtin Supabase-projektiin** `ktaoqivtuzcitxjfyyys` käyttäjän nimenomaisen käyttöönottopyynnön perusteella. Supabasen `apply_migration` palautti `success: true` ja migraatioluettelo näyttää version **`20261014074833`** nimellä **`foundation`**. Suoritettu SQL luettiin GitHubin `main`-haarasta, tiedostosta `supabase/migrations/20261013120000_foundation.sql` (Git-blob `0455ef4bf64cfd7516e0b8ce2897b70cbe208be4`). Lähdetiedoston päiväys ja Supabasen tallentama migraatioversio eivät ole sama asia.

Käyttöönoton jälkitarkistus: **20 public-taulua**, kaikissa RLS käytössä, **37 public-RLS-politiikkaa**, yksityinen `elarventis-documents`-bucket, **0 Auth-käyttäjää ja 0 Storage-objektia**. Kaikkien sovellustaulujen rivimäärä oli 0. `verify_document`, `commit_audit_run`, `claim_invoice_job` ja `finish_invoice_job` eivät myönnä EXECUTE-oikeutta `authenticated`-roolille; ensimmäiset kaksi ovat `service_role`-roolin käytettävissä. Näiden funktioiden varsinaista liiketoimintatoimintaa ei ole vielä testattu.

Vercelin `elarventis`-projektiin asetettiin production-ympäristöön `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ja **`ELARVENTIS_MVP_ENABLED=disabled`**. Uusi GitHubin `main`-commitista `204f72d52b9949d6dcdc668daf935c63ca575fb5` käynnistetty Vercel-tuotantobuild `dpl_8dD2L78pD3GvaXtsT6fsiMdPsMcx` saavutti tilan READY. HTTP/E2E-käytöstä ei saatu vahvistusta. Palvelimen `ELARVENTIS_SERVICE_ROLE_KEY`-avainta ei lisätty.

**Avoin riski:** Supabase Free -projektin tietokanta- ja Storage-palautusharjoitusta ei suoritettu ennen ensimmäistä migraatiota; se on edelleen tehtävä ennen oikean asiakasdatan käyttöä. Security Advisor ilmoitti `btree_gist`-laajennuksesta public-skeemassa ja 11 käyttäjille suoritettavaksi tarkoitettua SECURITY DEFINER -funktiota, jotka on katselmoitava. Performance Advisor ilmoitti myös puuttuvia FK-indeksejä ja RLS-suorituskykyhuomioita. Kumpaakaan varoitusluokkaa ei pidä tulkita automaattiseksi tietoturva-aukoksi eikä ongelmien korjautumista ole varmistettu.

Seuraavat pakolliset testit: kahden organisaation suorat RLS/RPC/Storage-kokeet, dokumentin tavusisällön ja auditin tallennuksen integraatiot, kirjautuminen ja koko laskuntarkastuksen E2E. Työtilaportti pidetään suljettuna eikä todellista asiakasdataa tuoda ennen näiden ja palautussuunnitelman varmennusta.
