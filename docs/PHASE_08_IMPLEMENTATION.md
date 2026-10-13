# Vaihe 8 — deterministinen tarkastus

Tila: **osittain toteutettu, ei hyväksytty** (13.10.2026).

`src/lib/audit-engine/index.ts` on puhdas TypeScript-moduuli. Se ottaa tarkistetut laskurivit, hyväksytyt sopimusversiot ja rakenteiset hintasäännöt. Se valitsee yhden kuljetusliikkeen ja palvelupäivän kattavan hyväksytyn version; nolla tai useampi kuin yksi tuottaa `MISSING_DATA`. Painoluokan alaraja on inklusiivinen ja yläraja eksklusiivinen. Vertailu erottaa ALV-perustan. Perusrahti, painoluokka, vyöhyke, polttoainelisä, alennus ja minimi on toteutettu rajatuilla eksplisiittisillä säännöillä. Duplikaatti on tarkistettava ehdokas. Raha on kokonaislukusenttejä, prosentti kokonaislukuisia basis point -yksikköjä, pyöristys on half-up. Laskentajälki sisältää kaavan, sääntö-ID:n, lähteet ja moottoriversion.

Moottori ei saa tekoälyltä hintaa. Se ei tee tietokantakyselyjä. Sopimuksen polttoaine- ja alennusehtojen tietokantatallennus sekä turvallinen audit-ajon pysyvä luonti ovat **kesken**. Valmistellut `audit_runs` ja `audit_results` -taulut eivät vielä ole sovelluksen käytössä. Aiemman ajon säilyminen on vasta skeeman ominaisuus, ei testattu työnkulku.

Kuusi synteettistä testitapausta läpäisi. Testit kattavat golden-tapausten G01–G11 laskennan osia, ALV-perustan, yhden sentin pyöristyksen, päällekkäiset hyväksytyt kaudet ja saman syötteen determinismin. G12–G16 vaativat varsinaiset tietokanta-, työnjono- ja historiatestit. Golden-dokumentin 115,00 € ja 103,50 € kokonaissummat ovat testissä komponenttisummia; järjestelmä ei vielä muodosta laskukohtaista yhteenlaskettua audit-ajoa.
