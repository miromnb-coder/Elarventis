# Elarventis MVP — Golden test cases (suunnitteluversio)

Kaikki esimerkit ovat synteettisiä. Näitä ei ole vielä ajettu ohjelmakoodia vasten. Testi hyväksytään vasta, kun toteutus palauttaa sovitut senttimäärät, tilat ja jäljitettävät lähdeviitteet.

| Case | Syöte | Odotettu tulos |
| --- | --- | --- |
| G01 Perusrahti | Sopimus 100,00 €, lasku 100,00 €, kaikki kentät mukana | OK, erotus 0 snt |
| G02 Perusrahtivirhe | Sopimus 100,00 €, lasku 105,00 € | POIKKEAMA_TARKISTETTAVAKSI, 500 snt |
| G03 Fuel oikein | Perusrahti 100,00 €, polttoainelisä 15 % perusrahthinnasta, veloitettu yhteensä 115,00 € | OK, erotus 0 snt |
| G04 Fuel väärin | Edellinen sopimus, veloitettu yhteensä 120,00 € | POIKKEAMA_TARKISTETTAVAKSI, 500 snt |
| G05 Alennus ja fuel | Perusrahti 100,00 €, sovittu 10 % alennus ensin ja 15 % fuel alennetusta 90,00 € pohjasta; lasku 103,50 € | OK, erotus 0 snt |
| G06 Voimassaolokausi | Vanhalla hinnastolla 90 €, uudella 110 €, palvelupäivä uuden hinnaston voimassaoloaikana, lasku 110 € | OK uudella hinnastolla; run-version ja lähde mukana |
| G07 Painoluokan raja | Palvelupaino täsmälleen kahden painoluokan rajalla | Sopimuksen rajainklusiivisuuden mukainen luokka; ei oletusluokkaa |
| G08 Puuttuva vyöhyke | Laskulla ei määränpäävyöhykettä eikä johdettavaa lähetysdataa | PUUTTUVAT_TIEDOT, expected null |
| G09 Tuntematon erä | Laskulla unsupported-lisämaksu | EI_TUETTU_SÄÄNTÖ, expected null |
| G10 Poiminnan epävarmuus | Sopimuksen hintasoluja ei voi tunnistaa luotettavasti | POIMINTA_TARKISTETTAVA; laskentaa ei käynnistetä ennen hyväksyntää |
| G11 Mahdollinen duplikaatti | Sama lähetysviite ja veloituskoodi kahdessa laskussa | Kaksoisveloitusehdokas tarkistettavaksi, ei automaattista reklamaatiota |
| G12 Tenant-eristys | Org A yrittää lukea Org B:n laskua API:ssa, SQL/RLS:n kautta ja Storagesta | Pääsy estetään kaikissa kolmessa |
| G13 Retry/idempotenssi | Sama dokumentin käsittely toimitetaan työjonoon kahdesti | Yksi looginen tulos, ei tuplalaskentaa |
| G14 Audit-version säilytys | Hinnaston hyväksytty versio vaihtuu tarkastuksen jälkeen | Vanha tarkastus selitettävissä alkuperäisellä hinnastolla; uusi tarkastus eri versiona |
| G15 Palautuminen | Worker keskeytyy kesken työn | Lease vanhenee, työ siirtyy retryyn tai hallittuun tarkistukseen, ei katoa |
| G16 Ei väärää OK-tilaa | Lasku sisältää yhden tuetun ja yhden tarkastamattoman rivin | Koko laskua ei merkitä täysin varmennetuksi |

Toteutuksessa tarvitaan lisäksi tarkat syötedokumenttien fixtures, hyväksytyt hinnastosäännöt, pyöristyspolitiikka, ALV-erittely ja automaattiset testit jokaiselle riville.

**Tärkeää:** Testitapausten rahalaskelmat ovat tarkoituksella yksinkertaisia. Oikea sopimus määrää sovellettavat säännöt ja järjestyksen; järjestelmä ei saa soveltaa esimerkin 15 prosentin polttoainelisää yleissääntönä.
