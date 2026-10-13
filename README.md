# Elarventis

Elarventiksen suomenkielinen, responsiivinen etusivu. Ohjelmiston käyttöliittymä on konseptiesikatselu, jonka laskut ja summat ovat synteettisiä.

## Käynnistys

```bash
npm install
npm run dev
```

Avaa <http://localhost:3000>.

## Tarkistukset

```bash
npm run typecheck
npm run lint
npm run build
```

Yhteydenottolomake tallentaa viestiluonnoksen vain selaimen paikalliseen tallennustilaan. Viestiä ei lähetetä, ennen kuin vastaanottaja ja lähetyspalvelu on määritelty.


## Toteutusvaiheiden tilanne (13.10.2026)

- **Vaihe 1 — Etusivu:** lähdekoodi toteutettu.
- **Vaihe 2 — MVP-määrittely:** suunnitelma valmis; varsinainen asiakasvalidointi odottaa todellisia vastauksia.
- **Vaihe 3 — Arkkitehtuuri:** tekninen suunnitelma valmis; ei vielä Supabase-migraatioita eikä kirjautumistoteutusta.
- **Vaiheet 4+ — Sovelluksen toteutus:** aloittamatta.

Suunnitelmat:
- [MVP-rajaus ja asiakasvalidointi](docs/PHASE_02_MVP_VALIDATION.md)
- [Tietomalli, arkkitehtuuri ja tietoturva](docs/PHASE_03_ARCHITECTURE.md)
- [Vaiheiden 2 ja 3 päätökset sekä avoimet portit](docs/PHASE_02_03_STATUS.md)
- [Synteettiset laskennan golden-testit](docs/MVP_GOLDEN_TEST_CASES.md)
- [Tyhjä asiakasvalidoinnin seurantamalli](docs/VALIDATION_TRACKER_TEMPLATE.csv)

Huomautus: Supabase-projekti on valmisteltu Frankfurtin alueelle, mutta siihen ei ole tässä vaiheessa luotu sovelluksen tauluja. Asiakastietoja tai API-salaisuuksia ei saa tallentaa tähän julkiseen repositoryyn.


## Vaiheiden 4–6 keskeneräinen toteutus

Sovelluksen työtila löytyy reitiltä /app ja kirjautuminen reitiltä /kirjaudu. Toteutus ja tunnetut puutteet: [vaihe 4](docs/PHASE_04_IMPLEMENTATION.md), [vaihe 5](docs/PHASE_05_IMPLEMENTATION.md), [vaihe 6](docs/PHASE_06_IMPLEMENTATION.md).

**Tärkeää:** Supabase-migraatio on valmisteltu mutta sitä ei ole ajettu Frankfurtin projektiin, koska varmuuskopioinnin palautusta ei ole todennettu. Sovellusta ei pidä käyttää oikeilla asiakasdokumenteilla. Luo .env.local mallista .env.example ja lisää paikallisesti aktiivinen publishable-avain. Älä tallenna avainta GitHubiin. Migraation, Auth-sähköpostin ja Storage-politiikkojen käyttöönotto sekä suorat eristystestit vaaditaan ennen käyttöä.

Paikallinen parseritesti: node --experimental-strip-types tests/rates.test.mjs.
