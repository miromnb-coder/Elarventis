# Elarventis — Phase 3: tekninen arkkitehtuuri, tietomalli ja tietoturva

Päivitetty: 2026-10-13  
Tila: arkkitehtuuriehdotus / suunnittelupäätökset; ei toteutettuja tietokantatauluja.  
Projekti: GitHub miromnb-coder/Elarventis; Supabase ktaoqivtuzcitxjfyyys (Frankfurt, eu-central-1).

## 0. Tarkistettu lähtötilanne

- GitHub main: Next.js 15 / React 19 / TypeScript / Tailwind CSS 4; valmis julkinen etusivu, markkinointisivun interaktiivinen **synteettinen** konseptiesikatselu.
- Julkisen etusivun ContactDraft tallentaa vain selaimen localStorageen, eikä lähetä viestejä. Ennen asiakashankintaa tarvitaan oikea, tietosuojan huomioiva yhteyskanava.
- Supabase: PostgreSQL 17, palvelinalue eu-central-1, ACTIVE_HEALTHY.
- Supabasen public-skeemassa tällä hetkellä 0 sovellustaulua; migraatioita 0; Security Advisor ei raportoinut havaintoja tyhjästä sovellusskeemasta. Tämä ei tarkoita, että tuleva sovellus olisi auditoitu.
- Tähän vaiheeseen ei kuulu ympäristöavainten kopiointi GitHubiin eikä tuotannon skeemamuutos.

## 1. Arkkitehtuurin tavoitteet

1. Luotettava yritysten välinen tietojen eristys (multi-tenant).
2. Sopimustietojen, laskurivien ja tarkastuslaskennan täydellinen jäljitettävyys.
3. Rajattu MVP kotimaan paketti- ja kappaletavaralle, ei universaali tarkastusmoottori.
4. Dokumenttiprosessointi jatkuu turvallisesti keskeytysten ja virheiden jälkeen.
5. AI tekee epävarmat poiminnat ehdotuksina; deterministinen TypeScript-moottori laskee eurot.
6. Pieni ylläpitotarve, pieni alkuinvestointi, ei pakollisia ERP-integraatioita.
7. Oikeaa asiakastietoa vasta tietoturvan, sopimusten, varmuuskopioinnin ja käyttöoikeustestien jälkeen.

## 2. Looginen kokonaisuus

~~~mermaid
flowchart TD
  Web[Julkinen etusivu - Next.js] --> Contact[Yhteydenoton rajattu palvelupää]
  App[Suojattu yrityssovellus - Next.js] --> Auth[Supabase Auth]
  App --> API[Next.js palvelinrajapinta]
  API --> DB[(Supabase PostgreSQL + RLS)]
  API --> Private[(Supabase yksityinen Storage)]
  API --> Queue[Pysyvä jobs-taulu]
  Queue --> Worker[Erillinen luotettava worker]
  Worker --> Parser[PDF/CSV/XLSX tulkinta ja rajattu AI]
  Parser --> Review[Tietojen hyväksyminen]
  Review --> Engine[Deterministinen hinnoittelumoottori]
  Engine --> Findings[Havainnot + lähdeviitteet + audit-loki]
  Findings --> App
~~~

App, API ja worker eivät saa kiertää tenant-rajoja. Workerilla voi olla korotettuja palvelinoikeuksia, mutta jokaisen operaation org_id validioidaan ja kirjataan. Julkinen etusivu ja sen anonyymit yhteydenotot pidetään erillään laskudatasta.

## 3. Koodin ehdotettu kansiorakenne (suunnitelma)

- src/app/(marketing)/ — julkinen sivusto; nykyinen etusivu säilytetään.
- src/app/(auth)/ — kirjautuminen ja palautus.
- src/app/(app)/app/ — suojatut organisaation näkymät.
- src/app/api/ — server-only reitit, ladattujen tiedostojen käsittelypyynnöt ja työjonon käynnistys.
- src/components/ui/ — yhteinen visuaalinen järjestelmä.
- src/lib/supabase/ — browser/server/worker-asiakkaat erikseen.
- src/lib/authz/ — käyttäjän ja organisaation oikeuksien tarkistus.
- src/lib/documents/ — validointi, normalisointi, provenienssi.
- src/lib/rates/ — sopimusversiot ja säännöt.
- src/lib/audit-engine/ — puhdas laskentakirjasto ilman AI-rajapintaa.
- src/lib/jobs/ — työjonon varaaminen, retry, idempotenssi.
- src/lib/reporting/ — raporttien muodostus.
- supabase/migrations/ — versioidut tietokantamigraatiot (vasta toteutusvaiheessa).
- tests/fixtures/ — vain synteettiset laskut/sopimukset ja hyväksytyt odotetut tulokset.

Uusia npm-paketteja valitaan vasta käyttötarpeen ja tietoturvatarkastuksen perusteella.

## 4. Tietokantamalli v1 (suunnitelma, ei vielä SQL-migraatio)

Kaikkien yritysasiakasdataa sisältävien taulujen avaimena on org_id (UUID). Lisäksi käytetään id (UUID) ja created_at / updated_at -aikaleimoja tarpeen mukaan.

| Taulu | Keskeiset tiedot |
| --- | --- |
| organizations | id, name, status, created_at |
| profiles | user_id -> auth.users, display_name, created_at (identiteetti, ei yksittäisen organisaation data) |
| memberships | org_id, user_id, role, status; unique(org_id,user_id) |
| invitations | org_id, invited_email, role, invited_by, expiry, state; vain kutsujen hallintaan |
| carriers | org_id, id, name, carrier_code |
| documents | org_id, id, storage_path, sha256, kind, mime, size, uploader_id, state |
| document_extractions | org_id, id, document_id, parser_version, model_version, proposed_fields, confidence, review_state |
| contracts | org_id, id, carrier_id, label, state |
| contract_versions | org_id, id, contract_id, document_id, effective_from, effective_to, approval_state, approved_by |
| rate_rules | org_id, id, contract_version_id, rule_code, service, zone, weight_band, structured_definition, validation_state |
| shipments | org_id, id, source_ref, service_date, service_code, origin_zone, destination_zone, billable_weight, units |
| invoices | org_id, id, carrier_id, document_id, invoice_number, invoice_date, currency, vat_basis, total_minor, state |
| invoice_lines | org_id, id, invoice_id, shipment_id nullable, source_line_ref, charge_code, amount_minor, parsed_fields, review_state |
| audit_runs | org_id, id, invoice_id, contract_version_id, engine_version, state, started_at, finished_at |
| audit_results | org_id, id, audit_run_id, invoice_line_id, status, billed_minor, expected_minor nullable, difference_minor nullable, calculation_trace |
| evidence_references | org_id, id, target_type, target_id, document_id, page_number/row_ref, excerpt_pointer |
| findings | org_id, id, audit_result_id, decision_state, reviewer_id, reviewed_at, reason |
| reports | org_id, id, audit_run_id, storage_path, report_format, generator_version |
| jobs | org_id, id, job_type, aggregate_id, state, attempt_count, next_run_at, lease_until, dedupe_key, error_code |
| audit_events | org_id, id, actor_id nullable, action, entity_type, entity_id, timestamp, minimal_metadata |

### Viittaukset ja elinkaari
- Käytä samalla org_id:llä rajattuja yhdistelmäviiteavaimia, esim. invoices(org_id,carrier_id) -> carriers(org_id,id) sekä invoice_lines(org_id,invoice_id) -> invoices(org_id,id). Lisää tietueille unique(org_id,id), kun käytetään yhdistelmä-FK:ta.
- Älä luota pelkkään käyttöliittymän valitsemaan org_id-arvoon; palvelin todentaa jäsenyyden jokaisella pyynnöllä.
- Sopimusversiot ja audit_runs ovat jälkeenpäin tarkastettavia versioita; hyväksytyn hinnaston muutokset luovat uuden version.
- Dokumentin storage_path on sisäinen, arvaamaton avain, ei julkinen URL.
- Säilytä audit-runin käyttämä sääntöversio, hintaparametrit, lähteet ja laskennan jälki.
- Johtopäätös ei saa olla “OK” jos tariffeja, lähdetietoja tai sovellettavaa sääntöä puuttuu.
- Tietojen poiston, pidon ja tapahtumalokin säilytysajat päätetään ennen asiakasdatan tuontia; maksimaalista säilytystä ei oleteta.

## 5. Käyttöoikeusmalli

Organisaation roolit:
- OWNER: organisaation asetukset, jäsenyydet ja laskutuksen hallinta.
- ADMIN: käyttäjien kutsut, sopimukset, tiedostot, tarkastukset; ei omistajan erityistoimia.
- ANALYST: sopimusten/laskujen tarkistus, auditoinnit, löydösten päätökset, raportit.
- VIEWER: rajattu vain luku -pääsy.
- PLATFORM_OPERATOR: erillinen alustarooli, ei tavallinen organisaatiojäsenyys; tuotannon ylläpitotoimet audit-lokiin. Ei automaattista asiakastietojen katseluoikeutta; mahdollinen tukipääsy vain erikseen hyväksytyllä, rajatulla ja määräaikaisella menettelyllä.

Käyttöoikeusperiaatteet:
- Jokaiselle API-toiminnolle server-side session check + membership and role authorization.
- RLS jokaiselle käyttäjän saavutettavalle yritystietotaululle; erota SELECT / INSERT / UPDATE / DELETE ja rajoita sarake- sekä taulukohtaiset grantit. Yksinkertainen “kaikki authenticated voi kaiken omassa orgissa” ei riitä.
- org_id tulee palvelimen vahvistamasta kontekstista ja/tai RLS:n membership-tarkistuksesta, ei käyttäjän mielivaltaisesta pyynnöstä.
- RLS-helperin pitää välttää memberships-taulun itseensä viittaava politiikkarekursion riski; tarvittaessa käytä huolella rajattua SECURITY DEFINER -funktiota lukittuna search_pathina ja rajatuilla EXECUTE-oikeuksilla. Toteutuskoodi auditoidaan.
- Oikeuksien muokkaus, organisaation luonti ja kutsujen hyväksyntä toteutetaan omalla validoidulla palvelinpolulla (ei vapaa INSERT memberships-tauluun).
- Supabasen publishable-avain saa olla selaimessa tarvittaessa; service_role / secret -avaimet vain suojatuissa palvelinympäristöissä. Service role ohittaa RLS:n — sitä ei pidä käyttää tavallisissa käyttäjäpyynnöissä.
- Tarkista palvelinpuolen rajapinnat ja Storage myös suorilla manipuloiduilla HTTP-pyynnöillä. Pelkkä client-puolen pääsynesto ei suojaa.

## 6. Dokumentit ja AI

MVP-dokumenttien putki:
1. Käyttäjä käynnistää latauksen autentikoidusti; validoidaan org, käyttöoikeus, tiedostotyyppi, koko ja laskettu tiiviste.
2. Tiedosto tallennetaan yksityiseen Storage-bucketiin organisaatiokohtaisen metadatan alaisuuteen; ei julkiseen bucketiin.
3. Luodaan dokumenttirivi ja idempotentti käsittelytyö.
4. Parseri tarkistaa turvallisesti PDF/CSV/XLSX-rakenteen; tiedostoille asetetaan rajat ja mahdollisuuksien mukaan haitallisen sisällön tarkistus.
5. AI voi täydentää tulkintaa ja ehdottaa rakenteisia kenttiä; mallin nimi, versio ja lähdealue säilytetään. Henkilö-/liikesalaisuustietojen lähetys ulkopuoliselle AI-palvelulle edellyttää erillistä toimittaja-, alue- ja sopimusarviota.
6. Tallennetaan kenttäkohtainen provenienssi (sivu, rivi, taulukkosolu), luottamustaso ja parseriversio.
7. Käyttäjä tarkistaa epävarmat kentät sekä hyväksyy hinnaston ja kriittiset laskutiedot.
8. Hyväksytty rakenteinen data siirretään laskentamoottoriin.
9. Tarkastus ja raportti tallennetaan versioituina.

AI:n tuottama vapaamuotoinen kuvaus ei ole laskennallinen totuus. Parserin confidence-kynnys ei saa yksin päättää, että sopimushinta hyväksytään.

## 7. Deterministinen hintamoottori

Erota laskentamoottori puhtaaksi TypeScript-moduuliksi:
- Input: org-id rajattuna ulkopuolella, tarkastuksen aikaleima, hyväksytty contract_version, normalized shipment / invoice_lines / rate_rules.
- Output: billed_minor, expected_minor tai null, difference_minor tai null, status, rule_id, effective_date, calculation_trace, evidence_refs, error_code.
- Käsittele raha integer-eurosentteinä, yksiköt eksplisiittisesti ja sopimuksen mukaiset pyöristykset.
- Älä oleta, että fuel surcharge lasketaan aina samasta pohjasta; sääntö kuvaa tarkat vaiheet ja järjestyksen.
- Ei hiljaista oletusvyöhykettä, nollalisää tai hyväksyttyä hinnastoa. Jos tiedot puuttuvat, tulos on MISSING_DATA / UNSUPPORTED_RULE / PARSER_REVIEW.
- Kaksoisveloitus on ensin ehdokas, joka vaatii lähdeviitteet ja käyttäjän vahvistuksen.
- Älä julkaise “mahdollisia säästöjä” toteutuneina hyvityksinä.

Testitapaukset ennen integraatiota: perushinta oikein; eri hinnastokaudet; painoluokan raja; fuel-lisän lähde ja järjestys; sopimusalennuksen järjestys; sentin pyöristys; puuttuva lähetystieto; epäselvä palvelukoodi; kaksoisveloitusehdokas; ristiriitaiset lähteet; sama syöte tuottaa saman tuloksen.

## 8. Pysyvät taustatyöt

Jobs-taulun vaiheistus:
- queued -> leased/processing -> completed
- recoverable failure -> retry_scheduled; pysyvä failure -> dead_letter/manual_review
- Työn varaamiseen transaktio ja SKIP LOCKED / lease deadline; ettei kaksi workeria tee samaa työtä yhtä aikaa.
- Idempotenssi dokumentti+versio+operation -kohtaisella dedupe-avaimella.
- Rajatut retryt eksponentiaalisella viiveellä ja ylläpitäjälle näkyvä virhekoodi.
- Poimi, tarkasta ja raportoi erillisinä töinä; ei pitkiä selainpyyntöjä.
- Rajoita käsittelyä per org: rinnakkaisuus, työjonon pituus, AI-tokenit/kustannusraja, tiedostokoko.
- Workeria ei käynnistetä maksullisena palveluna ilman kustannus- ja luotettavuusarviota. Selvitettävä soveltuva low-cost-ajastin; serverless-aikarajat voivat rajoittaa PDF-käsittelyä.

## 9. API / domain-rajapintojen luonnos

Sovelluksen palvelinrajat (polut suunnitelmia):
- GET /api/me; GET /api/organizations/:orgId
- GET/POST /api/organizations/:orgId/contracts; POST /contracts/:id/versions
- POST /api/organizations/:orgId/documents/upload-intent
- GET /api/organizations/:orgId/documents/:id
- POST /api/organizations/:orgId/document-extractions/:id/approve
- GET/POST /api/organizations/:orgId/invoices
- POST /api/organizations/:orgId/invoices/:id/audit
- GET /api/organizations/:orgId/audits/:id/results
- POST /api/organizations/:orgId/findings/:id/decision
- POST /api/organizations/:orgId/reports

Kaikille mutaatioille tarkistetaan CSRF/cookie-malli, autentikointi, syötteiden schema-validointi, org-id, rooli ja idempotenssi. Vastaukset eivät saa vuotaa toisen organisaation tunnisteita tai sisältöä.

## 10. Ympäristöt, varmuuskopiot ja tietosuoja

- Frankfurtin Supabase-projektia käytetään aluksi vain synteettiseen kehitysdataan.
- GitHub-repository on julkinen. Ei oikeita laskuja/sopimuksia, asiakastietoja, salasanoja, service-role-avaimia tai AI-avaimia repositoryyn, lokeihin tai testifixtureihin.
- Ei uusia maksullisia Supabase-projekteja tai brancheja ilman hinnan selvitystä ja hyväksyntää.
- Ennen oikeita pilottitietoja erota kehitys ja tuotanto luotettavasti; tarvittaessa toinen projekti erikseen hyväksytyin kustannuksin.
- Todellinen EU-alueen käsittely arvioidaan koko palveluketjulle (hosting, AI-toimittaja, sähköposti, analytiikka, varmuuskopiot), ei vain tietokantapalvelimelle.
- Sovitaan yritysasiakkaan rekisterinpitäjä-/käsittelijäroolit, tietojenkäsittelysopimus, alikäsittelijät ja poistomenettely.
- Supabasen Free-tasolla ei tule olettaa automaattisten palautettavien tietokantavarmuuskopioiden olevan käytössä. Suunnittele todennettu tietokanta- ja Storage-varmuuskopiointi + palautustesti ennen pilottia; pelkkä tietokannan dump ei palauta Storage-tiedostoja.
- Julkaisussa migraatiot idempotentteja ja versioituja; palautumisen testaus ennen tuotantodatan DDL-muutoksia.
- Vaatimus: ei oikeita asiakasdokumentteja ennen DPA-/turva-/varmuuskopiointiporttia.

Lähteet suunnittelulle:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
- https://supabase.com/docs/guides/platform/backups

## 11. Arkkitehtuurin hyväksymisportti

Phase 3 on SUUNNITELTU, ei tuotantoon toteutettu. Portin vaatimukset ennen varsinaista migraatiota:
- Tietomallin ja suhteiden katselmointi; erityisesti yhdistelmä-FK:t ja effective-date-logiikka.
- RLS/GRANT-politiikkamatriisi jokaiselle taululle, roolille ja operaatiolle.
- Org A / Org B -isolaatiotestit, mukaan lukien suorat Storage/API-pyynnöt.
- Tiedostojen provenienssi ja hyväksyntäprosessi.
- Ensimmäisen hinnastosäännön laskentatapaukset ja odotetut senttimääräiset vastaukset.
- Työjonon virhe-, retry-, idempotenssi- ja resurssirajat.
- AI-toimittajan tietosuoja- ja kustannusarvio.
- Selkeä kehitys/tuotanto-erottelu ja palautumissuunnitelma.

Seuraavassa toteutuserässä luodaan vain tarkistetut migraatiot ja RLS-testit, ensin synteettisin tiedoin. Nykyiseen Supabase-projektiin EI tehty tauluja, migraatioita, Auth-muutoksia tai Storage-bucketteja tämän dokumentointivaiheen yhteydessä.
