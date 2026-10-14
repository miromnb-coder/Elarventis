# MVP:n avaamisvalmius, 14.10.2026

**Tila: EI VALMIS PILOTTIDATALLE.** Etusivu ja oletusarvoisesti suljettu sovellusportti säilyvät. Portin aiempi väärä tiedostosijainti korjattiin `src/middleware.ts`:ään; paikallinen HTTP-smoke todensi etusivun 200 ja työtila-API:n 503. Koko työnkulku kirjautumisesta raporttiin ei ole läpäissyt oikean tietokannan testiä.

| Alue | Nykytila | Puuttuva näyttö tai työ |
| --- | --- | --- |
| Supabase | Frankfurt, ACTIVE_HEALTHY, Free; tarkistushetkellä 0 sovellustaulua, 0 bucketia, 0 Auth-käyttäjää, 0 migraatiota | Foundation-migraatio vain lähdekoodissa; erillinen hyväksyntä ja palautussuunnitelma |
| Dokumentit | Tavujen SHA-256:n uudelleenluku sekä palvelin-RPC toteutettu koodissa | DB/Storage-rajapinnan suora hyökkäystesti; 10 MB muisti-/latenssikuorma |
| Tarkastukset | Deterministinen moottori ja transaktionaalinen tallennus-RPC koodissa | Todellinen syöte → audit_results -integraatio, alkuperäisten hintojen versiointi ja kilpailutilanteet |
| Työt | Pysyvä jono, retry, lease-token ja palvelinkuitit SQL:ssä | Riippumaton worker, heartbeat, atominen poiminnan julkaisu ja valvontahälytykset |
| RLS/Storage | Säännöt lähdekoodissa | Yritys A/B, viewer, poistettu jäsen, suorat Storage/REST/RPC-kokeet |
| Käyttäjät | Auth ja roolifunktiot lähdekoodissa | Kutsujen lähetys/accept ja poistettujen jäsenten E2E |
| Testit | 27/27 synteettistä yksikkötestiä, typecheck, lint, build läpi | SQL/RLS/Storage/API/E2E ja palautusharjoitus tekemättä |

## Aktivoinnin tarkka päätöspolku

1. Järjestä Free-tasolle erillinen testattu looginen tietokantadump ja Storage-objektien erillinen kopio/tarkistesummat. Supabasen Free-tason päivittäistä hallittua varmuuskopiota ei ole; Storage-objektit eivät sisälly tietokantadumpiin. Palautusta ei ole vielä harjoiteltu.
2. Tarkista `foundation.sql` kokonaisuudessaan PostgreSQL 17 / Supabase Storage -ympäristössä. Tee suorat kahden synteettisen yrityksen SELECT/INSERT/UPDATE, RPC- ja Storage-kokeet sekä SQL-funktion GRANT-testit. Erillistä maksullista ympäristöä ei luoda.
3. Atomisoi laskun poiminnan julkaisu ja varmista tarkastuksen syötehetken johdonmukaisuus DB-lukituksilla. Tarkista korruptoituneen uploadin retry sekä standardin XLSX:n ja tuetun PDF:n rajatut esimerkit.
4. Toteuta riippumaton, rajattu worker ja sen valvonta tai dokumentoi realistinen käsin käynnistettävä pilotin toimintatapa; älä ota keskeneräistä workeria käyttöön.
5. Vasta valmistellun migraation hashin, riskien, palautuksen, ajettujen testien ja jälkitarkastuksen esittämisen jälkeen pyydä erillinen nimenomainen hyväksyntä migraatiolle. Älä aseta `ELARVENTIS_MVP_ENABLED=enabled` ennen koko todellisen työnkulun läpäisyä.

Riskit: service-role-avaimen hallinta, hyväksyttyjen tietojen muutoskilpailu, tuettujen dokumenttimallien rajallisuus, kutsujen toimitus, tietokannan ja objektien palautus. Näistä ei ole myönteistä testaustulosta.
