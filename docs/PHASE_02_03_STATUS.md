# Elarventis — vaiheiden 2 ja 3 tilanne

Päivitetty: 2026-10-13.

## Todetut nykytilat

| Kohde | Status | Huomio |
| --- | --- | --- |
| Phase 1 — etusivu | Toteutettu lähdekoodiin | Julkaisu-/käyttäjätestejä ei tämän kierroksen aikana suoritettu |
| Phase 2 — MVP-vaatimukset | Suunnitelma valmis | docs/PHASE_02_MVP_VALIDATION.md |
| Phase 2 — asiakasvalidointi | Ei valmistunut | Ei todellisia asiakkaiden vastauksia tai maksusitoumuksia tässä työssä |
| Phase 3 — arkkitehtuuri | Suunnitelma valmis | docs/PHASE_03_ARCHITECTURE.md |
| Phase 3 — Supabase-tietokanta | Ei toteutettu | Frankfurt-projekti aktiivinen; public-tauluja ja migraatioita 0 |
| Phase 3 — tietoturvatestit | Ei toteutettu | Ensin RLS-migraatiot ja synteettinen testiympäristö |

## Päätökset

1. Finnish-first, kotimaan paketti- ja kappaletavara ensin.
2. AI tuottaa poimintaehdotuksia, ei lopullista laskutushintaa.
3. Versioidut hinnastot, lähdeviitteet, hyväksyntä ja sentintarkat laskentatestit pakollisia.
4. Supabase-projekti ktaoqivtuzcitxjfyyys on eu-central-1 (Frankfurt). Ei vanhan Lontoon projektin käyttöä uutena pohjana.
5. GitHub main; ei kehityshaaraa eikä PR:ää tässä dokumentointikierroksessa.
6. Ei automaattista asiakassähköpostien lähettämistä, kustannuksia aiheuttavia palveluja, AI-integraatioita, tuotantojulkaisuja tai tietokantamigraatioita ilman erillistä toteutussuunnitelmaa ja asianmukaista hyväksyntää.
7. Ennen asiakasdatan tuontia: DPA ja alikäsittelijät, RLS/API/Storage-eristystestit, varmuuskopiot, palautusharjoitus.
8. Älä julkaise henkilötietoja, sopimuksia, todellisia laskuja tai salaisia avaimia julkisessa GitHub-repositoryssä.

## Toimintajärjestys tästä eteenpäin

A. Validointi / Phase 2:
- Selvitä aiemmin koottujen 20 ehdokasyrityksen soveltuvuus ja aiempien yhteydenottojen tilanne.
- Viimeistele käyttäjän hyväksyttäväksi yksilölliset yhteydenotot. Älä lähetä ilman hyväksyntää.
- Kerää todellisia vastauksia ja todisteita datan saatavuudesta, ongelman arvosta ja maksuhalukkuudesta.
- Hanki mahdollisuuksien mukaan 2 ehdollista maksullista pilottisitoumusta.
- Vahvista ensimmäinen tuettava hinnastomalli ja tarvittavat kentät näytedokumenttien pohjalta.

B. Arkkitehtuurin katselmointi / Phase 3:
- Lukitse taulujen nimet, FK-mallit, poistopolitiikka ja role-action-matriisi.
- Määrittele RLS- ja Storage-policyt SQL-migraatioihin myöhemmässä erässä.
- Valmistele synteettiset fixtures ja eristystestit.
- Selvitä riippuvuudet, työjonon ajastus sekä AI-toimittajan tietosuoja- ja kustannusvaatimukset.
- Ennen migraatioita sovi palautus- ja varmuuskopiointimenettely.

C. Seuraava ohjelmistokehitys:
- Phase 4: käyttöliittymän aidot näkymät testidatalla.
- Phase 5: autentikointi, yritystilit, tietokannan ja Storage-politiikkojen toteutus.
- Phase 6–8: sopimukset, laskutuonti ja hintamoottori.

## Avoimet ratkaisevat kysymykset

- Mikä yksi paketti- tai kappaletavarahinnaston malli on ensimmäisen pilotin tarkka referenssi?
- Mitkä kuljetus- ja laskukentät asiakkailta oikeasti saadaan?
- Millainen ensimmäisen 30 päivän maksullinen pilotti kelpaa asiakkaalle?
- Mikä on palautus- ja varmuuskopioinnin toteutustapa käytössä olevalla palvelutasolla?
- Millä perusteella kolmansien osapuolten AI-palvelu saa käsitellä mahdollisesti luottamuksellista aineistoa?

## Hyväksyntätilat

**Dokumentaatio:** valmis kommentoitavaksi.  
**Asiakasvalidointi:** kesken — ei todisteita luoda keinotekoisesti.  
**Arkkitehtuurin toteutus:** odottaa erillistä toteutuserää ja suunnitelman hyväksymistä.  
