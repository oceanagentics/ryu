# DeepData research draft — 10 September 2026

Production status: applied and verified on 2026-09-11 UTC. See the [application report](../application-report.md). The research-time notes and validation outcomes below are retained as history.

**Review candidate only.** No production content/review write, commit or deployment was made. `draft.json` uses the new local closed contract: six languages, **16 descriptors (7 types, 5 formats, 4 standards), 6 access paths (5 read, 1 write), 3 metrics, 22 incident edges, no gallery, no approved operational route**. `endpoint-drafts.json` supplies 15 minimal organization endpoints; these are stubs, not claims that those organizations have completed rich research. Local validation passes. Production still uses the older contract and cannot accept this draft yet.

## Identity and evidence

Authenticated canonical searches returned no DeepData or ISA identity. Fresh full GETs of `deepdata` and `international-seabed-authority` returned 404, including a new DeepData read immediately before the create-only dry run. New endpoint searches and exact-slug GETs are saved in `canonical-*.json`; IFREMER already exists as `ifremer`. Full reads of `ifremer`, `platform-obis`, `odis` and `worms` found no incident DeepData/ISA edge to preserve or revise. The target itself has no stored content or incident edges. No GET response was reused as a PUT body.

[ISA’s explanation](https://isa.org.jm/deepdata-database/about-deepdata/) describes a spatial repository for exploration data and environmental/resource information in the Area, including seabed-to-surface environmental parameters. [ISA’s July 2023 account](https://isa.org.jm/isa-fact-check-2023-1/) confirms launch in 2019 and consolidation of older holdings. This scope does **not** make ISA the governor of all deep-ocean science, all oceans or the overlying water column.

Contractor templates and metadata feed a Secretariat-managed ingestion, validation and maintenance workflow. The [currently linked manual](https://www.isa.org.jm/wp-content/uploads/2022/04/UserManual_v1.1_20181119.pdf) is version 1.1, dated 19 November 2018. Its architecture details are historical documentation, not confirmation of the current backend implementation.

The [reporting page](https://isa.org.jm/deepdata-database/reporting-templates/) still explains the September 2021 LTC endorsement, but actual linked files are newer: `_Geo_Template_20260119.xlsm`, `_Env_Template_20260119.xlsm`, and `MetadataTemplate_20260306.xlsm`. Do not treat 2021 as their latest release. Current template contents/mappings were not independently audited. XLSM is not an approved format ID and was retained in access prose rather than invented as a descriptor. Annual reporting is for the previous calendar year, by the end of March; use current templates and contract-authorized credentials.

## Actual access, standards and rights

- **Native map and library:** [ISA DeepData map](https://data.isa.org.jm/isa/map) eventually returned HTTP 200 and rendered in the in-app browser after several minutes. It displayed a terms-acceptance modal. Root did not accept this legal agreement; no native export was executed. This is slow availability and an acceptance gate, not proof of a permanently offline system. The linked manual documents public biological/geochemical CSV query exports and library downloads. Public users do not see contractor upload/reference-download tabs. Confidential mineral-resource data remain restricted.
- **Dashboard:** [public Power BI overview](https://isa.org.jm/deepdata-database/deepdata-dashboard/) rendered without signing in. Root’s capture and accessibility text are saved as `dashboard-evidence.png` and `.txt`, and were visually inspected. One visual had a filter error, while total cards and the cruise-year chart rendered. No refresh/reporting date was visible; the visible chart ends in 2024. No dashboard image has been added to the record gallery.
- **Published biological subset:** [OBIS-hosted DeepData collection](https://datasets.obis.org/hosted/isa/index.html) links individual Darwin Core Archives. The [NORI 2022 archive](https://datasets.obis.org/hosted/isa/noripmn12022_env_bio/noripmn12022_env_bio.zip) returned HTTP 200 and was inspected directly. It contains tab-separated `occurrence.txt`, `extendedmeasurementorfact.txt`, `meta.xml`, and EML 2.1.1 `eml.xml`. The metadata declares Darwin Core occurrence terms, an OBIS ExtendedMeasurementOrFact extension, and a GBIF EML profile. These three standard assignments are scoped to this exported representation; no universal native-table compliance is asserted. Metadata includes an unknown maintenance-frequency value, so no uniform cadence is claimed.
- **ODIS:** [catalogue record 893](https://catalogue.odis.org/view/893) registers [DeepData’s public sitemap](https://data.isa.org.jm/static/oih/site_map_oih_deepdata.xml). The earlier offline label came from a 30 August 2026 check and is historical. Root’s later in-app browser observation of https://catalogue.odis.org/view/893 displays exactly “This resource is online”, “Last check was 10/09/2026 23:41” and “Last update: 14/10/2024” (no timezone shown). The screenshot is `../odis/deepdata-source-view.png`, inspected during this correction. Separately, our upstream GET succeeded and enumerated 341 metadata pages, with 2024-10-16 lastmod values in the sampled entries. A [2021 CTD metadata page](https://data.isa.org.jm/static/oih/odis_bphdcpmn12021_env_template_ctd.zip.html) returned Schema.org Dataset/DataDownload JSON-LD and a download URL, supporting a specifically scoped `schema_org` descriptor. It incorrectly encodes latitude 152.9021 and longitude 18.831: the latitude is outside the valid range. Do not silently swap them or assume the entire feed is spatially valid. A registered feed and a successful source read do not prove a recent downstream ODIS harvest.
- **Reuse:** the [ISA website terms](https://isa.org.jm/term-and-conditions-of-use-of-the-international-seabed-authority-website/) grant general personal, non-commercial use subject to restrictions, rather than a general open-data licence. Separate OBIS archives explicitly state CC BY 4.0: this was verified in 14 representative creator-specific EML records, all published 20 April 2026. Their licence must not be extended to confidential records, all native downloads, imagery or the CTD example. The geological/environmental confidentiality distinction and dataset-specific rights are preserved in the draft.

No stable, documented native public API contract was established. The map contains internal web application request/export logic; this was not promoted to a public API or runtime route. The public sitemap and archive links remain access mechanics. No reusable connector contract was implemented or operationally approved. No `ryu_routes` row is proposed.

## Metrics and non-equivalent counts

| Stored metric | Value | Precise scope and evidence |
|---|---:|---|
| `sample_count` | 825,747 | Dashboard total: 203,589 biology + 622,158 geochemical samples. Counted as displayed, not a proof of unique specimen deduplication. |
| `occurrence_count` | 201,323 | [Fresh OBIS statistics API](https://api.obis.org/v3/statistics?nodeid=9d2d95be-32eb-4d81-8911-32cb8bc641c8), ISA node only; returned year range 2004–2024. Not the native repository total. |
| `species_count` | 931 | Same ISA-node API response, distinct from its 2,860 taxa. |

All three use `observedAt: null`: none of these surfaces supplies the underlying count’s reporting date. The sources were accessed on 10 September 2026; access date is not relabeled as the measurement date. No reporting period was invented.

The fresh API reports **153 datasets and 2,860 taxa**. The cached public OBIS node page displayed **207,036 occurrences, 158 datasets, 2,868 taxa and 931 species**. Use the fresh API snapshot for the chosen metrics; the difference is recorded rather than harmonized by assumption. Saved response: `node-statistics-viaweb.raw` (the name is historical; it was a direct HTTP GET).

Other figures remain prose/research evidence: dashboard **31 contracts, 85,949 area blocks, 213 cruises**; sitemap **341 metadata pages**; [ISA’s May 2025 ODIS announcement](https://isa.org.jm/news/the-international-seabed-authoritys-deepdata-joins-the-ocean-data-and-information-system-advancing-global-ocean-data-sharing/) says **over 800 CTD stations**. These are different units and scopes; none is a current user, contributor or unique observation count. No verified sessions, download events, current storage bytes or scoped citation metric was found. The older “over 10 TB” statement is dated May 2023 and lacks an exact byte definition/current snapshot; it was not converted to an exact metric. Current FAQ rounded sensor/property totals were likewise not promoted to precise measurements.

## Relationship review: all six allowed types

| Type | Draft decision | Evidence, direction, scope and time |
|---|---|---|
| `governs` | ISA → DeepData | ISA controls database reporting policy and public/confidential classification under its exploration framework. LTC reporting guidance is part of ISA’s authority. Limited to this database; no unilateral country governance or blanket ocean jurisdiction. Current reporting page and About DeepData. |
| `operates` | ISA → DeepData | Secretariat Data Manager’s documented ingestion, QA/QC, maintenance and website-administration functions; manual §§6–6.2 plus current About page. No separate software vendor is assigned present operational responsibility from an old manual credit. |
| `funds` | ISA → DeepData | July 2023 ISA account explicitly says DeepData received dedicated programmatic funding from ISA Members. Historical programme funding, no invented amount or named member allocation. [ISBA/28/FC/2](https://www.isa.org.jm/wp-content/uploads/2023/07/2227418E.pdf) also discusses maintenance costs, but its future USD 200,000 operating-cost rows are forecasts, not evidence of actual disbursement. |
| `member_of` | DeepData → ODIS | Explicit federation integration announced 6 May 2025. Documented participation, not hidden hierarchy. ISA’s OBIS node is handled as publication/synchronization rather than inventing another system endpoint. |
| `publishes_to` | 15 organizations → DeepData | Fourteen biological dataset creators identified from downloaded EMLs, plus Beijing Pioneer Hi-Tech from direct CTD metadata. Each edge is scoped to its named archived dataset and publication date/coverage. These are not all current contractors and do not imply every annual return is published. |
| `syncs_to` | DeepData → OBIS; DeepData → ODIS; WoRMS → DeepData | OBIS public biological archives and ISA feed establish the exported subset. ODIS receives exposed discovery metadata, not necessarily the full data payload; latest successful harvest unknown. ISA reports WoRMS-based taxonomic reconciliation of over 60,000 records as of July 2023, not a continuous full-register copy. |

Publication evidence covers: Ocean Mineral Singapore, UK Seabed Resources, BGR, Tonga Offshore Mining, JOGMEC, COMRA, IFREMER, Global Sea Mineral Resources, Interoceanmetal, Yuzhmorgeologiya, Deep Ocean Resources Development, China Minmetals, the Russian Ministry of Natural Resources and Environment, NORI, and Beijing Pioneer Hi-Tech Development Corporation. `publisher-evidence.json` and the individual EML files record exact titles/creators, URLs, dates and licences. NORI EML is separately saved as `nori-eml.xml`. JOGMEC’s EML uses its former name; the current [ISA crust-contract list](https://isa.org.jm/exploration-contracts/cobalt-rich-ferromanganese-crusts/) establishes Japan Organization for Metals and Energy Security as the same JOGMEC identity. No current contract-validity inference is made from archived contribution dates or stale expiry columns.

**Withheld candidates and boundaries:**

- Korean archives and ISA contract lists identify the Government/Republic of Korea; a specific publishing organization was not unambiguously established. `country → system` is invalid for `publishes_to`, so no ministry or institute was guessed. This is a documented endpoint limitation, not evidence of absent Korean data.
- Other contract holders, sponsoring states and SSKI research institutions were not converted automatically into publishing edges. A contract, sponsorship, training award or proposed output is not proof of a particular published contribution. The broader contractor catalogue includes entries whose displayed expiry dates are past; no blanket current-active claim was made.
- No separate LTC governing endpoint: its database policy role is scoped under ISA, while advisory/review duties alone do not establish independent full governance of the platform.
- ISA member states, the 2026 China JTRC research call, Irish-funded taxonomy projects, and the Partnership Fund visualization project are not direct proven current funding allocations to the core database. Forecast budgets, calls and “outputs will be uploaded” statements do not prove an applied award or completed transfer. These are retained as contextual leads, not hidden edges.
- A 2022 ISA–WoRMS partnership and the 2023 CCZ checklist alone would not prove synchronization. The proposed WoRMS edge instead cites actual reported reconciliation work. No reciprocal DeepData → WoRMS stream or full-data GBIF/BBNJ connection was established.
- Ocean InfoHub discovery is described through the verified ODIS connection, without duplicating a supposed independent full-data transfer. No system-to-organization membership is invented for the ISA node or IODE affiliation.

## Endpoint/dependency handoff

New organization stubs (all searches empty and exact GET 404): `international-seabed-authority`, `ocean-mineral-singapore`, `uk-seabed-resources`, `bgr`, `tonga-offshore-mining`, `jogmec`, `comra`, `global-sea-mineral-resources`, `interoceanmetal`, `yuzhmorgeologiya`, `deep-ocean-resources-development`, `china-minmetals`, `russian-ministry-natural-resources`, `nauru-ocean-resources`, `beijing-pioneer-hi-tech`. Non-ISA endpoint URLs are intentionally null: dataset citations establish identity, but a current organizational homepage was not separately verified. IFREMER, WoRMS, OBIS and ODIS reuse existing canonical IDs.

`shared-edges.json` contains exact replacements for root to reconcile with other drafts:

1. `rel-deepdata-syncs-to-platform-obis` (enriched OBIS worker edge).
2. `rel-international-seabed-authority-publishes-to-platform-obis` (on the ISA endpoint stub; enriched OBIS worker edge).
3. `rel-worms-syncs-to-deepdata` (new documented taxonomy-reconciliation edge).

Before any future authorized apply, create/reconcile the missing endpoints, refresh canonical identities/preconditions, reconcile shared edge payloads, deploy the compatible contract, and dry-run again. No endpoint was created in production here.

## Validation and screenshot outcome

- Initial local structure passed; initial quality reported exactly `edges: an incoming operates relationship is required` while connection assembly was incomplete. The documented ISA operates edge resolved it.
- Final local `validateRecordAggregateContentInput` and `validateRecordQuality`: **all 16 proposed records pass**. All 23 unique edges across system and endpoint drafts have valid endpoint kinds. Main record resolves **73/73 owner-local source references**. Full results: `local-validation.json`.
- Live `PUT /api/records/deepdata?validateOnly=true` used `x-ryu-create-only: true` after a fresh 404. HTTP 200, `valid:false`, **108 issues**, saved verbatim in `api-validation.json`: 13 old access-field/type checks; 78 old localization requirements (relationshipReview, localized standard labels, recordCount/storageSize gap names); 17 incident-edge checks caused by 15 missing organization endpoints. These obsolete fields were not added to bypass the pending release. No apply followed.
- Public URL checks: **29/29 URLs returned HTTP 200**, saved in `url-validation.json`; previously successful GETs are reused for the very slow native map/sitemap/sample metadata. Exact source reads and EML evidence are retained. Root’s broader migration rehearsal does not itself verify evidence truth or translations.
- Gallery is empty. Root captured the real dashboard as local research evidence but it contains one broken visual and has no staged public asset URL. The map loaded with a terms-acceptance gate; acceptance and native map export remain pending. No placeholder or login/error screenshot was inserted into the gallery.


## ODIS availability correction

Updated only the six `deepdata-odis` access descriptions and the two DeepData→ODIS edges to record the newer online check. Existing research gaps did not describe ODIS as offline and required no change. The upstream sitemap read and sampled JSON-LD invalid latitude caveat remain intact; no successful downstream harvest is claimed. Changed shared edge IDs: `rel-deepdata-member_of-odis` (status) and `rel-deepdata-syncs_to-odis` (status and note). No production API calls or applies were made for this correction. Local shape/quality results are saved in `odis-status-correction-validation.json`.

### Subsequent downstream demo verification

Root then tested [the linked ODIS development demo](https://search-demo.odis.org/?q=DeepData), which returned 336 search hits: 335 DeepData dataset-metadata records and one OceanExpert event. A linked DeepData record API returned JSON successfully during the ODIS job. This resolves the earlier absence of downstream-presence evidence for this specific demo; it does not establish full-payload replication, complete harvesting or dependable update intervals. Local evidence is `../odis/deepdata-demo-search.png`; the ODIS job retains the API response and will provide the reconciled shared edge. All six access descriptions now reflect the distinction. Earlier validation logs predate this additional source and will be superseded by final batch hashes.

Final orchestration copied the ODIS job’s exact DeepData participation and metadata-transfer edges into this candidate. They include verified recipient-demo presence and current network-health limits; the final root batch validation files supersede earlier hashes.
