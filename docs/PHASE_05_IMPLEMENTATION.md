# Vaihe 5 — identiteetti, tietokanta ja eristys

Tila: **osittain toteutettu, ei hyväksytty** (13.10.2026).

## Vaiheiden 5–9 jatkotarkistus 13.10.2026

Projektin `ktaoqivtuzcitxjfyyys` tila tarkistettiin uudelleen: eu-central-1, PostgreSQL 17.11, ACTIVE_HEALTHY. Read-only-kysely näytti edelleen 0 public-taulua, 0 Auth-käyttäjää, 0 Storage-buckettia ja 0 objektia; sovellusmigraatioita ei ollut. Migraatiota **ei ajettu**. Tyhjyys ei ole tietokannan ja Storagen palautustesti. Docker-socket oli ympäristössä estetty ja npm-asennuksen tarvitsemia paketteja puuttui välimuistista, joten eristettyä PostgreSQL-palautusharjoitusta ei voitu suorittaa.

Valmistelematonta tiedostotallennusta korjattiin lähdekoodissa: `uploading → stored` onnistuneen Storage-kirjoituksen jälkeen, `uploading → failed → uploading` uudelleenyrityksessä. Sama org/kind/SHA-256 käyttää samaa dokumenttiriviä; keskeytyneen tallennuksen olemassa oleva objekti tarkistetaan ennen uutta kirjoitusta. Epäonnistuneen dokumentin voi siivota RPC:llä vain, kun Storage-objektia ei ole. Hyväksyttyjä dokumentteja ei poisteta. Koodi ja politiikat ovat katselmoitavia mutta niiden RLS- ja Storage-integraatiota ei ole ajettu.

Neljä eristettyä tilakonetestiä läpäisi: uusi/idempotentti lataus, onnistunut Storage-kirjoitus ennen keskeytystä, epäonnistunut lataus ja uudelleenyritys sekä vieraan uploaderin esto. Nämä eivät korvaa todellista Storage-integraatiotestiä.

Migraatioon lisättiin rajatut roolimuutos- ja jäsenen poistamis-RPC:t. Ne estävät oman ylläpitoroolin nostamisen, rajaavat adminin toimet, lukitsevat organisaatiorivin kilpailutilanteita vastaan ja estävät viimeisen aktiivisen omistajan poistamisen tai alentamisen. Näitä ei ole vielä ajettu tai testattu PostgreSQL:ssä, eikä käyttöliittymää ole. Jäsenkutsut, profiilin ja työtilan asetukset sekä sähköpostitoimituksen testi puuttuvat edelleen. Oikeaa asiakasaineistoa ei saa käyttää.

## Todettu lähtötilanne

Supabase-projekti ktaoqivtuzcitxjfyyys on Frankfurtissa (eu-central-1), PostgreSQL 17.11. Public-skeemassa oli 0 taulua, migraatioita 0, Auth-käyttäjiä 0, Storage-bucketteja ja -objekteja 0. Security Advisor ei näyttänyt havaintoja tyhjästä skeemasta. Turvallista palautusta ja Storage-varmuuskopioinnin palautusharjoitusta ei voitu varmistaa. **Migraatiota ei ajettu projektiin.** Projektin Auth-sähköpostiasetuksia ei ole varmennettu.

## Valmisteltu lähdekoodiin

Migraatio supabase/migrations/20261013120000_foundation.sql luo organizations, profiles, memberships, invitations, carriers, documents, document_extractions, contracts, contract_versions, rate_rules ja audit_events sekä yksityisen elarventis-documents-bucketin. Jokainen yritystietue kantaa org_id:tä; viitteet dokumentteihin, kuljetusliikkeisiin ja versioihin ovat org_id:llä sidottuja. RLS on jokaisessa public-taulussa. app_private.has_role on rajattu SECURITY DEFINER -apufunktio, jossa auth.uid tarkistetaan; palvelinrooli ei anna tavalliselle jäsenelle alustan erityisoikeutta. Organisaation perustaminen ja version hyväksyminen tapahtuvat rajattujen RPC-operaatioiden kautta. Jäsenyyksiin ei myönnetä suoraa kirjoitusoikeutta.

Roolimatriisi (valmisteltu, ei tuotannossa testattu):

| Toiminto | Owner | Admin | Analyst | Viewer |
| --- | --- | --- | --- | --- |
| Yrityksen tiedot ja jäsenten luku | luku | luku | luku | luku |
| Kuljetusliikkeen, sopimuksen, dokumentin ja hinnaston luku | kyllä | kyllä | kyllä | kyllä |
| Kuljetusliikkeen, sopimuksen, dokumentin ja hinnastoluonnoksen lisäys | kyllä | kyllä | ei | ei |
| Hinnastoversion hyväksyntä | kyllä | kyllä | ei | ei |
| Hintaluonnoksen rivien muokkaus | kyllä | kyllä | ei | ei |
| Jäsenten roolimuutos | RPC valmisteltu, ei testattu | rajattu RPC valmisteltu, ei testattu | ei | ei |
| Jäsenten kutsu | ei toteutettu | ei toteutettu | ei | ei |
| Profiilin oman nimen muutos | kyllä | kyllä | kyllä | kyllä |

Next.js:n palvelinreitit käsittelevät kirjautumisen, rekisteröinnin, palautuksen, uloskirjautumisen ja istunnon uusinnan @supabase/ssr- ja @supabase/supabase-js-kirjastoilla. Istuntotokenit ovat SSR-kirjaston evästeissä. Palvelin tarkistaa käyttäjän Auth-palvelusta ja PostgREST-pyynnöt käyttävät käyttäjän JWT:tä, jolloin RLS on lopullinen raja. Organisaation vaihto tarkistaa aktiivisen jäsenyyden. Muutospyynnöissä tarkistetaan Origin. Palautusosoite muodostetaan palvelimen omasta originista. Auth-vahvistuslinkki käsitellään code- tai token_hash-parametrilla /auth/callback-reitillä. Projektin email-template ja toimitus on testattava erikseen. Rekisteröinti on avoin, mutta organisaation tietojen näkeminen vaatii jäsenyyden.

Storage-policy sallii objektin lukemisen vain, kun samaan storage_path-arvoon liittyy dokumenttirivi ja käyttäjällä on sen organisaation aktiivinen jäsenyys. Lisäys edellyttää, että dokumentin uploader_id on auth.uid. Polku on org UUID / dokumentti UUID. Päivitys- ja poistopolicyä ei ole, joten tiedoston ylikirjoitus tai poisto ei ole sallittu.

## Käyttöönottoportti

Ennen migraation ajoa on otettava tietokannan ja Storagen varmuuskopio sekä tehtävä palautusharjoitus erillisessä ympäristössä. Tämän jälkeen SQL on katselmoitava ja ajettava versiona. Käynnistä kaksi synteettistä yritystä käyttäjineen ja suorita suorat Auth, PostgREST, SQL/RLS sekä Storage-eristystestit. Näitä testejä **ei ole ajettu**. Sähköpostitoimitus ja kutsut on määritettävä ja testattava ennen käyttäjäkäyttöä. Oikeaa asiakasdataa ei saa tuoda ennen aiemmassa arkkitehtuurissa määritettyä tietosuoja- ja palautumisporttia.

## Ympäristö

Kopioi .env.example tiedostoksi .env.local ja lisää projektin Connect-näkymästä aktiivinen publishable-avain paikallisesti. Älä lisää .env.local-tiedostoa Gitiin. Määritä Supabase Authissa sallituksi site URL ja /auth/callback-osoite. Tuotantodomain, vahvistusviestien template ja SMTP-palvelu on hyväksyttävä erikseen. Service-role-avainta ei käytetä.

