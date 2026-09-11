# FishBase rich-record requalification — 10 September 2026

`draft.json` is a six-language review candidate: 18 descriptors, 10 access paths, 6 measurements, 23 edges and the 4 preserved gallery items. Fresh canonical reads confirm `fishbase` remains thin/needs_revision; all 9 stored incident edges were reviewed and retained by ID. No production content, review state, code, schema or vocabulary was changed. The initial draft came from canonical content and the reviewed contract/access/standards work, not from the fixture.

## Principal corrections

The stored [static homepage](https://fishbase.se/home.htm) reports October 2015. The [current homepage](https://fishbase.se/home.php) and [search release](https://fishbase.se/search.php) report June 2026. The candidate uses the PHP URL and refreshes all six profiles. FishBase covers marine, brackish-water and freshwater finfishes; species coverage does not imply complete traits or geography. Q-quatics operates the service. The [Swedish Museum page](https://www.nrm.se/engelska/in-english/research/research-infrastructure/fishbase), updated 2026-08-05, and search footer support a scoped Stockholm-mirror operator. The museum says 15 consortium institutions; FishBase says 13. Scientific advice is stated without a count or inferred binding governance.

[Source Cooperative](https://source.coop/cboettig/fishbase) and [rfishbase](https://docs.ropensci.org/rfishbase/) document compressed Parquet tables. **The README names v26.07, but its documented public bucket prefix returned no objects; the parent listing contained v26.06.** The discrepancy is retained in access, profile and transfer evidence. An empty prefix is not a zero-byte database metric. CSV is retained with corrected scope: the [FishBase BRUVS manual](https://fishbase.se/bruvs/manual/FishBaseBRUVS_2021_03.pdf) documents survey/metadata CSV downloads, not current CSV distribution of the backend snapshot.

The [Gadus morhua summary endpoint](https://fishbase.se/webservice/summary/fb/showXML.php?identifier=FB-69&ProviderDbase=03) returned 65,735 bytes of actual XML without credentials. XML therefore remains supported; not all other legacy XML links were confirmed. BRUVS produces relative abundance, not density per unit area, and a downloaded survey contains its community, requiring subsequent taxon filtering.

## Measurements

| Measurement | Value | Exact scope |
| --- | ---: | --- |
| Species | 36,761 | Explicit June 2026 main statistics. |
| Native records | ~3,300,000 | June 2026 rows across ~200 tables (~60 main), not occurrences or species. |
| Collaborators | >2,570 | Lower bound on June 2026 pages, not an exact active roster. |
| Public v25.04 bytes | 194,684,778 | 216 compressed Parquet objects, remeasured 2026-09-10; existing metric ID retained. |
| Public v26.06 bytes | 139,929,828 | All 222 compressed Parquet objects, complete listing 2026-09-10; distinct new observation ID. |
| Google Scholar citations | ~15,000 | Cumulative approximate count in the [2023 impact paper](https://digitalcommons.uri.edu/gsofacpubs/1538/); exact observation date unverified, so null. |

Both storage measurements exclude SeaLifeBase, images and the live database. `s3-size-v2504.json` and `s3-size-v2606.json` preserve object lists and sums. `s3-size-audit.json` preserves the empty v26.07-prefix check; `s3-parent.txt` lists releases. Different compressed releases do not prove collection shrinkage. The former v25.04 observation date was updated to the actual remeasurement, rather than claiming independent verification of July's research date.

Unsupported metric types remain sourced prose: 333,268 common-name records in June 2026; homepage pictures/references are lower-bound headlines. Monthly visits are not sessions. Q-quatics' 2023 report lists 8,731,929 FishBase visits and 4,038,119 unique users, neither relabeled as sessions. Source Cooperative analytics combine FishBase and SeaLifeBase. No verified current system-wide download count was found. The impact paper's separate Scopus series exceeds 10,000 over 1994–2020; its publication date does not establish the Scholar observation date.

## Access, standards and gallery

Ten paths cover public browsing, the mixed download section, species XML, Source Cooperative, rfishbase, FishWatcher, collaborator and photo contributions, BRUVS, and the GBIF-Sweden archive. Public XML, object listings and archive ZIP returned without credentials. FishWatcher requires an account; unspecified contribution costs/onboarding remain unknown. Actual machine-readable access does not imply an approved Ryu route; routes remain empty. No submission or notification was sent.

[Reuse guidance](https://www.fishbase.se/summary/citation.php) requires non-commercial attribution for text, numbers and maps, with separate image rights. A package's software licence is not applied to data. Contributor photographs retain their owner's rights.

Six reviewed standards are retained, with six-language scoped descriptions: FAO fishing areas, ASFIS, ISSCAAP, Darwin Core, EML and Dublin Core. [FAOAREAS](https://www.fishbase.se/manual/english/FishBaseThe_FAOAREAS_Table.htm) establishes statistical areas; [ISSCAAP/ASFIS](https://www.fishbase.se/report/isscaap/isscaapsearchmenu.php) includes a FAO-quality caveat. The latter three describe the [GBIF-Sweden archive](https://www.gbif.se/ipt/resource?r=fishbase), not blanket compliance of the live database. New Darwin Core Archive format and survey-record type assignments use existing vocabulary.

All 4 existing gallery items pass local asset checks. Homepage captions now identify a historical capture; counters and membership wording in the image are not current measurements.

## All six relationship types

| Type | Reviewed outcome |
| --- | --- |
| governs | No formal-authority edge verified. Scientific advice, hosting and funding do not establish governance. |
| operates | Q-quatics retained; Swedish Museum added for Stockholm mirror/FishBase Sweden only. |
| funds | UWA's Australian-biodiversity grant from 2017 retained with continuation unknown; 11 historical scoped funders added below. |
| member_of | FishBase's documented participation through Fish OBIS retained. No invalid system-to-organization consortium membership. |
| publishes_to | RMCA historical collection/literature contributions retained; Blue Abacus videos/photos added. |
| syncs_to | Five qualified outgoing transfers retained: AquaMaps, GBIF, OBIS, Source Cooperative and WoRMS. Root added the verified incoming Catalog of Fishes taxonomy relationship. Separate scope and time/status on every edge. |

[AquaMaps](https://aquamaps.org/main/home.php) documents FishBase range/habitat inputs in its 10/2019 model description. [GBIF Sweden](https://www.gbif.se/ipt/resource?r=fishbase) lists a 2023-03-23 archive of 731,043 records and irregular updates. The [OBIS archive](https://ipt.obis.org/nonode/resource?r=fishbase_occurrence) lists 505,852 records published 2018-10-10, update frequency unknown. Neither is a current live indexed count. [Fish OBIS](https://portal.obis.org/node/dcb0c76d-46a1-4e07-9a69-98cf3fd67576) names FishBase/FishNet2; its node totals are not FishBase metrics. [WoRMS](https://www.marinespecies.org/about.php) documents FishBase taxonomy imports. Shared OBIS and WoRMS edges are copied exactly from their reviewed candidates.

The [RMCA 2023 account](https://www.africamuseum.be/en/staff/795/publication_detail_view?pubid=6525) documents collection publication from 1997 and African fish curation from 2001, not proven 2026 continuation. The [Blue Abacus contributor profile](https://fishbase.se/collaborators/CollaboratorSummary.php?id=2903) records supplied BRUVS videos/photos and participation since 2025, not a comprehensive automated survey feed.

The [Q-quatics 2023 annual report](https://www.q-quatics.org/wp-content/uploads/2025/05/Q-quatics_Annual_Report_2023.pdf), Appendix 5, printed pp.31–34 (`report.pdf`), provides scoped funding evidence. No amounts or 2026 continuation are asserted. Q-quatics is recipient/intermediary; some work runs via Sea Around Us or UWA.

| Funder | FishBase activity | Reported period |
| --- | --- | --- |
| Swedish Museum | New species/updates | 2023-01-30–2023-03-31 |
| GEOMAR | Data/web services | 2023-02-01–2023-12-31 |
| Mundus maris | Guide Android app v2 | 2023-05-01–2023-06-01 |
| WorldFish | Ontology/taxonomy | 2023-09-01–2023-12-15 |
| Oman ministry | Oman biodiversity, via Sea Around Us | 2023-07-12–2024-01-11 |
| SWIMS | Joint FishBase/SeaLifeBase collaboration, via Sea Around Us | 2023-01-01–2025-12-31 |
| Lorraine | Saint-Pierre and Miquelon lists, via Sea Around Us | 2023-10–2025-12 |
| Minderoo | BRUVS extension, via UWA | 2020-08-31–2025-07-31 |
| Blue Abacus | Joint core support | 2023-05 |
| BLOOM | Joint general support | 2023-12 |
| CSIRO | Joint support | 2022-07-01–2023-06-30; described since 2020 |

Joint support also benefits SeaLifeBase; FishBase's financial share is unspecified. [Mundus maris' 2023 event account](https://www.mundusmaris.org/activities/ocean-and-climate-security/mundus-maris-at-the-boot-2023-fair-21-to-29-january/) independently describes its FishBase app support. Endpoint identity sources establish institutions, not funding by themselves.

## Withheld candidates and dependencies

- MNHN's atlas project lacks confirmed FishBase-specific scope. Generic HIFMB services, NSF invertebrate digitization, Sea Around Us work, EcoScope/AquaMaps activity and pipeline promises were withheld. Shared species sponsorship does not sufficiently identify which system benefited to add separate Fair Fish/NatureMetrics edges. Generic donor logos and consortium membership do not establish scoped current support. Individual donors cannot be person nodes.
- [ChecklistBank source 1010](https://api.checklistbank.org/dataset/1010) reports a finished import on 2026-09-02 and says COL exports come from Aphia since 2025-05-01 (`col.txt`). The indirect FishBase→WoRMS/Aphia→COL path is represented by the existing WoRMS work; no duplicate direct transfer is asserted. Its stale FIN/consortium narrative is not used for current operation.
- Root resolved the Catalog of Fishes candidate: the [California Academy of Sciences project page](https://www.calacademy.org/scientists/projects/catalog-of-fishes) explicitly says FishBase uses its taxonomic information. [FishBase's explanatory note](https://fishbase.se/Nomenclature/FBCofFNames.php) establishes editorial reconciliation, possible delays and independent taxonomic judgments. The incoming `eschmeyers-catalog-of-fishes → fishbase` edge records that scope without asserting an automatic transport, current cadence or reverse flow. The [current named project](https://www.calacademy.org/scientists/projects/eschmeyers-catalog-of-fishes) establishes the endpoint identity. Fresh canonical searches and exact 404 are saved in `catalog-of-fishes-canonical-check.json`; its six-language minimal system payload brings `endpoint-drafts.json` to 12 dependencies.
- BRUVS uses IUCN status, but a specific current external Red List ingestion route was not verified. Cross-links alone are not transfer evidence.
- Eleven organizations are absent in canonical searches and exact GETs (404): `swedish-museum-of-natural-history`, `geomar`, `mundus-maris`, `worldfish`, `blue-abacus`, `bloom-association`, `csiro`, `minderoo-foundation`, `swire-institute-of-marine-science`, `university-of-lorraine`, `oman-ministry-of-agriculture-fisheries-and-water-resources`. Their minimal six-language source-backed payloads are in `endpoint-drafts.json`; root reserved the IDs and owns deduplication and any future authorized apply.

## Validation

- The worker's initial current-contract checks passed with 48/48 source references, 22 unique endpoint-valid triples and 11 endpoint drafts. Those results in `validation-local.json` predate root's Catalog of Fishes addition. The batch validation at the parent directory is the final authority after reconciliation and includes exact payload hashes.
- No-write authenticated validateOnly: HTTP200, valid:false, 126 issues using a fresh timestamp. Exact results in `validation-api.json`: old access method/source requirements, rejection of new write type, retired localized relationshipReview, old standard labels and recordCount/storageSize gaps, plus 13 edges with 11 missing endpoints. These were reported before any retry. Draft content was not reverted to legacy shape; contract release and endpoint coordination precede a fresh dry run.
- Public URL probe: 39/42 succeeded. AquaMaps, URI's impact-paper repository and WorldFish returned Python HTTP403 but were readable through primary-source web research; AquaMaps also succeeded during OBIS probing. These are client-dependent restrictions, not demonstrated dead links. XML and archive ZIP returned expected content types. See `validation-urls.json` and `probe-details.json`.

Remaining uncertainties are explicit in localized gaps and edge scope/status. Rich depth is proposed only in the review candidate; review state is unchanged.
