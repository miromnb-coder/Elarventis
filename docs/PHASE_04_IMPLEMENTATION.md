# Vaihe 4 — käyttöliittymän toteutustilanne

Tila: **osittain toteutettu, ei hyväksytty** (13.10.2026).

Julkinen etusivu säilytettiin lähdekoodissa ennallaan. Sen rinnalle lisättiin /app-työtila, jossa on responsiivinen sivupalkki, mobiilivalikko, yläpalkki, organisaation vaihto, yhteiset kortti-, taulukko-, lomake-, tila-, tyhjän tilan sekä virheen ja latauksen tyylit. Yleiskatsaus hakee sopimusten ja hinnastoversioiden määrät tietokannasta. Laskujen, tarkastusten, poikkeamien ja raporttien sivut kertovat, ettei toimintoa ole vielä käytössä. Niissä ei ole keksittyjä laskutilastoja. Sopimuslistalla on haku ja sopimuksen yksityiskohtainen näkymä.

Brändivärit ovat erillisessä workspace.css-tiedostossa ja sovellus käyttää hillittyä korallia. Taulukot vierivät omassa kehyksessään. Mobiilin sivupalkki avataan valikkopainikkeella. Visuaalista selaintestausta leveyksillä 375, 430, 768, 1024 ja 1440 px ei voitu suorittaa, koska shellin verkkoyhteys estää riippuvuuksien asennuksen eikä selaintestausympäristöä ole käytössä. TypeScript- ja ESLint-tarkistukset läpäistiin. Next.js 15.5.27 tuotantobuild läpäistiin shellin verkkoluvalla (Google-fontin haku vaatii verkkoyhteyden). Julkinen etusivu palautti HTTP 200 ja suojattu /app ohjasi kirjautumiseen (HTTP 307). Saavutettavuuden näppäimistö- ja kontrastitesti on **ajamatta**.

Jäljellä: oikeat lasku- ja raporttinäkymät vaiheessa 7–8, ilmoitukset ja kattava sivutus, responsiivisuuden sekä saavutettavuuden käytännön testit.
