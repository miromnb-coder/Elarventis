# Elarventis — Phase 2: MVP-rajaus ja asiakasvalidointi

Päivitetty: 2026-10-13  
Tila: MVP-määrittely valmis suunnittelun pohjaksi; asiakasvalidointi KESKEN.  
Toteutus: mitään viestejä ei lähetetty eikä asiakastietoja käsitelty tämän vaiheen yhteydessä.

## 1. Tuotelupaus

Elarventis on suomalaisille B2B-yrityksille suunniteltava kuljetuslaskujen sopimusperusteinen tarkastusohjelmisto. Asiakas tuo laskut, sovitut hinnastot ja tarvittaessa lähetystiedot; ohjelmisto poimii rakenteiset tiedot, suorittaa deterministiset vertailut ja tuottaa selitettävät tarkastushavainnot. Ihminen hyväksyy epävarmat tiedot ja päättää mahdollisista reklamaatioista.

Ei luvata säästöjä, tarkkuusprosentteja tai automaattisia reklamaatioita ilman mitattua näyttöä.

## 2. Kohdeasiakas — TESTATTAVA hypoteesi

Ensisijainen ICP:
- Suomessa toimiva teknisen tavaran / varaosien tukkukauppa tai maahantuoja.
- Arviolta 20–250 työntekijää ja 300 000–2 000 000 € vuosittaiset kuljetuskulut.
- 2–5 kuljetusliikettä ja 20–300 kuljetuslaskua kuukaudessa.
- Sopimukset, hinnastot ja laskurivit saatavilla digitaalisesti.
- Ostaja: talousjohtaja, logistiikkapäällikkö tai hankinnan vastuuhenkilö; käytännön käyttäjä: talous-/logistiikkatiimi.

Nämä numerot eivät ole tutkittuja markkinatietoja vaan validoitavia asiakassegmentin oletuksia.

Ydinongelman oletus: käsin tehtävä sopimushintojen tarkistus on työlästä, mikä voi johtaa huomaamatta jääviin laskutusvirheisiin ja epäselviin hyvitysprosesseihin.

## 3. MVP:n rajaus

### Ensimmäiset tuetut aineistot
| Aineisto | Vaatimus |
| --- | --- |
| Kuljetuslasku | PDF, CSV, XLSX; sekä koonti- että rivitiedot, mikäli saatavissa |
| Kuljetussopimus | PDF; alkuperäinen dokumentti säilytetään |
| Hinnasto | CSV/XLSX tai hyväksytyksi poimittu sopimuksen hintataulukko |
| Lähetysdata | Valinnainen CSV/XLSX; tietyt paino-, vyöhyke- ja kaksoislaskutustarkistukset vaativat sen |
| Valuutta | EUR MVP:ssä |
| Kuljetus | Kotimaan paketti- ja kappaletavarakuljetukset, rajattu sopimusmalli |

Ei MVP:ssä: merirahti, lento-/konttirahti, tullit, demurrage, kansainväliset monimutkaiset tariffit, ERP-/TMS-integraatiot, sähköpostin automaattinen vastaanotto, hyvitysten automaattinen täsmäytys, automaattinen reklamaation lähetys tai yleinen AI-keskustelija.

### Ensimmäiset tarkistukset
1. Sopimuksen mukainen perusrahti (palvelu, vyöhyke, sovittu painoperuste, voimassaolopäivä).
2. Polttoainelisä vain, jos sen prosentti, laskentapohja ja voimassaolo on todistettavasti määritelty.
3. Alennus vain, jos soveltamisjärjestys ja laskentapohja on vahvistettu sopimuksessa.
4. Mahdolliset kaksoisveloitukset — ehdokas nostetaan tarkastukseen; duplikaatiksi ei julisteta pelkän samankaltaisuuden perusteella.
5. Puuttuvat, ristiriitaiset tai sopimuksen ulkopuoliset veloitukset omiin epävarmuusluokkiinsa.

Ei yleistä “kaikki kuljetusmaksut oikein” -väitettä. Sopimuksesta riippuvat erityisehdot lisätään vasta, kun niille on vahvistettu testitapaukset.

### Käyttäjän pääprosessi
1. Kirjaudu yrityksen omaan työtilaan.
2. Lisää sopimus ja hinnasto; tarkista AI:n poiminta; hyväksy hinnaston versio.
3. Lataa lasku ja mahdolliset lähetystiedot.
4. Tarkista poimitut rivit, etenkin epävarmat kentät.
5. Käynnistä tarkastus; järjestelmä tallentaa käytetyn hinnaston ja laskentaversion.
6. Näe rivi- ja laskukohtaiset tulokset, lähteet, laskukaava ja euromäärä.
7. Hyväksy, hylkää tai merkitse selvitystä vaativaksi havainto.
8. Vie PDF/CSV/XLSX-yhteenveto käsin tehtävää jatkokäsittelyä varten.

### Tulosten erottelu
Rivikohtainen tulos:
- OK: verifioitu, vastaava sopimussääntö löytyi eikä laskentapoikkeamaa havaittu.
- POIKKEAMA_TARKISTETTAVAKSI: laskettu ero, jonka käyttäjä vielä hyväksyy/hylkää.
- PUUTTUVAT_TIEDOT: laskenta vaatii lähdedataa, jota ei ole.
- EI_TUETTU_SÄÄNTÖ: veloitustyyppi/sopimusrakenne ei ole MVP:n tarkastettavissa.
- POIMINTA_TARKISTETTAVA: epävarma tai ristiriitainen dokumenttitulkinta.
- VIRHE: tarkastus keskeytyi tekniseen virheeseen.

Älä laske PUUTTUVAT_TIEDOT-, EI_TUETTU_SÄÄNTÖ- tai POIMINTA_TARKISTETTAVA-rivejä automaattisesti tarkastetuksi tai virheettömäksi. “Ei havaittua poikkeamaa” ei tarkoita kaikkien laskun ehtojen varmentamista.

### Laskennan periaatteet
- Käytä kokonaislukusenttejä ja sopimuksen mukaisia pyöristyssääntöjä.
- Säilytä ALV-erittely; vertaa lähtökohtaisesti saman verokäsittelyn hintoja.
- Päivämäärä, vyöhyke, painoyksikkö, painoluokka, palvelukoodi, lisät ja alennukset on jäljitettävä.
- Valitse sopimuksen oikea hyväksytty versio palvelu-/lähetyspäivän perusteella, ei vain tiedoston latauspäivän mukaan.
- Älä oleta universaalia polttoainelisän tai alennuksen laskentajärjestystä.
- AI ei päätä odotettua hintaa eikä keksi puuttuvia sopimusehtoja.
- Uudelleentarkastus luo uuden audit-version; aiempaa tulosta ei ylikirjoiteta.

## 4. Hyväksymiskriteerit (MVP)

Toiminnallisuus:
- Vähintään yksi tarkasti määritelty kotimaan paketti- tai kappaletavarahinnaston muoto voidaan tuoda, hyväksyä ja käyttää.
- Vähintään yksi todellista formaattia vastaava synteettinen laskusarja PDF-, CSV- ja XLSX-muodoissa voidaan käsitellä.
- Oikeat laskutulokset kaikissa sovituissa “golden” testitapauksissa; myös rajatapaukset ja pyöristykset.
- Jokaisen hintaeron perustelu näyttää vertailuarvot, kaavan ja hyväksytyn sopimus-/laskulähteen.
- Puuttuvaa dataa ei koskaan hiljaisesti päätellä sopivaksi.
- Yritysten tietojen eristys, lokit, palautuminen ja tiedostojen käyttöoikeudet testattu.
- Virhetilanteista voi jatkaa hallitusti ilman tuplalaskentaa.
- Käyttäjä voi hyväksyä/hylätä havainnon ja viedä tulokset.
- Teknisen validoinnin lisäksi pilotissa arvioidaan rivipoiminnan virheet ja liiketoiminnallinen hyöty todellisella luvallisella aineistolla.

## 5. Asiakasvalidoinnin toteutus (ei vielä tuloksia)

### Hypoteesit ja todistusaineisto
| Hypoteesi | Mitä mitataan | Hylkäys-/muutostarve |
| --- | --- | --- |
| Sopimushintojen tarkastukseen kuluu merkittävästi työtä | Nykyinen prosessi, laskuja/kk, tunteja/kk, vastuu | Prosessi jo hyvin automatisoitu tai ongelma vähäinen |
| Tarvittava aineisto on saatavilla | 2–3 näyteformaattia ja laskurivien kentät, lupa aineistoon | Aineistoa ei saada tai tiedot eivät yhdisty |
| Virheistä voi syntyä mitattavaa arvoa | Todistetut poikkeamat ja hyväksytyt hyvitykset; ei AI-arvauksia | Virheet liian harvinaisia / arvottomia |
| Asiakas on valmis maksamaan | Hinta-ankkuri, kirjallinen pilottisitoumus, ostajan osallistuminen | Toistuvat kohteliaat kiinnostuksenilmaukset ilman sitoumusta |
| Prosessi skaalautuu asiakkaiden välillä | Hinnastojen yhteiset mallit ja tarvittavat räätälöinnit | Jokainen uusi asiakas vaatii paljon käsityötä |

### Validointikierros
1. Käy läpi aiemmin koottu 20 yrityksen prospektilista ja varmista nykyiset yhteystiedot, aiemmat kontaktoinnit ja soveltuvuus. Älä lähetä duplikaatteja.
2. Lähetä vain käyttäjän hyväksymät yksilölliset B2B-viestit; tässä vaiheessa ei lähetetä mitään automaattisesti.
3. Pyydä vastaajilta kuvaus nykyisestä tarkastusprosessista ja heidän suurimmasta ongelmastaan; älä vaadi kokousta viestin ehdoksi.
4. Selvitä laskujen määrä, sopimusten malli, yleisimmät veloitukset, tarvittava lähetystieto, kuka hyväksyy reklamaatiot ja kuka päättää ostosta.
5. Pyydä tarvittaessa erillinen lupa turvallisesti anonymisoituun testiaineistoon; älä kerää oikeita laskuja ennen turvallista tallennus- ja käsittelyprosessia.
6. Esitä konkreettinen rajattu maksullinen pilottiehdotus, kun kiinnostusta ja teknistä soveltuvuutta on osoitettu.
7. Kirjaa vastaukset ja todistusaineisto neutraalisti. Erottele vahvistettu fakta, asiakkaan ilmoitus, arvio ja oma hypoteesi.

Tavoite: 8–12 laadukasta vastausta/keskustelua ja vähintään 2 ehdollista maksullista pilottisitoumusta ennen kallista/raskasta kehitystä. Nämä ovat tavoitteita, eivät saavutettuja tuloksia.

### Hintatesti (hypoteesi, ei hyväksytty hinnasto)
Selvitä maksuhalukkuus esimerkiksi 299 / 599 / 999 € kuukaudessa (+ alv soveltuvin osin) tai rajatulla pilottihinnalla; hinta riippuu laskumääristä, aineiston laadusta ja perustellusta arvosta. Vältä lupaamasta varmoja säästöjä tai ilmaista rajatonta käsittelyä. Päätä tuotannon hintataso vasta mittausten jälkeen.

### Kysymykset asiakkaille
- Miten tarkastatte kuljetuslaskut nyt, ja mikä on työläin vaihe?
- Kuinka monta laskua / lähetystä tarkastatte kuukaudessa ja monenko kuljetusliikkeen laskuja?
- Mitkä laskutettavat erät, lisät tai alennukset ovat vaikeimpia varmentaa?
- Missä muodossa sopimus, hinnasto, laskurivit ja lähetysdata ovat saatavilla?
- Miten usein olette löytäneet reklamoitavia eroja; miten tiedätte niiden toteutuneen arvon?
- Kuka tarvitsisi raporttia, ja kuka päättää ohjelmiston hankinnasta?
- Millainen rajattu, maksullinen pilotti olisi hyväksyttävä; mitä tuloksia pitäisi todistaa?

## 6. Go / No-go -portti

Phase 2 -määrittely: VALMIS dokumentointia varten.
Phase 2 -asiakasvalidointi: KESKEN, eikä sitä saa merkitä valmiiksi ilman yrityksiltä saatua näyttöä.

Raskaamman rakennusvaiheen suositellut ehdot:
- Rajattu käyttötapa vahvistettu ainakin muutamalta soveltuvalta yritykseltä.
- Realistinen malli sopimus-/laskudatan vastaanottoon.
- Vähintään kaksi aidosti kiinnostunutta maksullisen pilotin ehdokasta, mieluiten kirjallisesti.
- “Golden dataset” voidaan rakentaa ensin synteettisenä ja myöhemmin luvallisesta anonymisoidusta aineistosta.

## 7. Seurannan minimitiedot (asiakaskohtaisesti)

Yritys-ID (sisäisenä tunnisteena), toimiala, arvioitu koko, kuljetusliikkeiden määrä, laskut/kk, mahdolliset aineistomuodot, viimeisin yhteydenotto, status, todettu kipu, maksuhalukkuus, lupa aineiston käyttöön, seuraava toimenpide, päivämäärä, lähde ja tietojen säilytyspäätös.

Ei kontaktihenkilöiden tietoja julkiseen repositoryyn. B2B-suoramarkkinoinnin sovellettavat tietosuoja- ja kieltäytymissäännöt varmistetaan ennen lähetyksiä.

## 8. Riippuvuudet vaiheeseen 3

Lukitaan ensin tenant-malli, käyttöoikeudet, hinnastojen versiointi, tietojen provenienssi ja työnkulun tilakone. Vasta tämän jälkeen tietokantamigraatiot, autentikointi ja tuontiputki.

Tämä dokumentti on toteutussuunnitelma, ei todiste asiakaskysynnästä tai valmiista ohjelmistosta.
