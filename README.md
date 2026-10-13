# Elarventis

Kuljetuslaskujen sopimusvertailun keskeneräinen B2B SaaS -toteutus. Julkinen etusivu, kirjautumisen ja sopimusten lähdekoodi sekä rajatut laskun poiminta-, laskenta- ja vientimoduulit ovat olemassa. **Ohjelmistoa ei ole hyväksytty oikealle asiakasdatalle.**

## Paikallinen käynnistys

Vaaditaan Node 24 ja projektin `package-lock.json`-tiedoston mukaiset riippuvuudet.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Täytä `.env.local` Frankfurtin Supabase-projektin `ktaoqivtuzcitxjfyyys` URL:lla ja publishable-avaimella. Älä lisää secret/service-role-avainta selaimeen tai repositoryyn. Työtila ja kirjautumisreitit pysyvät suljettuina, ellei palvelinympäristössä ole `ELARVENTIS_MVP_ENABLED=enabled`. Älä ota porttia käyttöön ennen migraation, eristystestien ja koko työnkulun hyväksymistä. Määritä Supabase Authin site URL, `/auth/callback`-osoite ja SMTP/sähköpostipohjat; vahvista sähköpostitoimitus synteettisellä käyttäjällä.

**Älä aja** `supabase/migrations/20261013120000_foundation.sql`-migraatiota varsinaiseen projektiin ilman erillistä nimenomaista hyväksyntää. Migraatiota ei ole vielä ajettu. Repository on kytketty Vercelin production-julkaisuun; main-push on käyttäjän hyväksymä, mutta yllä oleva työtilaportti on oletusarvoisesti suljettu.

## Testit

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Viimeisin todellinen tulos ja suorittamatta jääneet testit: [vaiheiden 5–9 QA](docs/PHASE_05_09_FINAL_QA.md). Vuoden 2026-10-13 työtilassa 24 synteettistä moduulitestiä voitiin suorittaa. Typecheck, lint, build, PostgreSQL-migraatio, palautus, RLS, Storage ja E2E ovat avoimia.

## Tuetut rajatut muodot

- Hinnasto: UTF-8 CSV tai ensimmäisen taulukon yksinkertainen XLSX; `palvelu, vyohyke, paino_alku_g, paino_loppu_g, hinta_eur, alv`.
- Lasku: UTF-8 CSV, vastaava yksinkertainen XLSX tai PDF, jonka `Tj`-tekstiobjektit sisältävät saman puolipiste-erotellun tietuerakenteen. Ensimmäinen rivi sisältää laskun numeron, päivän, `EUR`-valuutan ja kokonaissumman; toinen rivi sisältää sarakkeet `lahetys, palvelu, palvelupaiva, veloitus, summa_eur, alv, paino_g, vyohyke`.
- Skannatut PDF:t, yleiset PDF-laskupohjat, monimutkaiset XLSX:t ja OCR eivät ole tuettuja. Enimmäiskoko on 10 Mt.

Toteutuksen tila: [vaihe 5](docs/PHASE_05_IMPLEMENTATION.md), [vaihe 6](docs/PHASE_06_IMPLEMENTATION.md), [vaihe 7](docs/PHASE_07_IMPLEMENTATION.md), [vaihe 8](docs/PHASE_08_IMPLEMENTATION.md), [vaihe 9](docs/PHASE_09_IMPLEMENTATION.md).

