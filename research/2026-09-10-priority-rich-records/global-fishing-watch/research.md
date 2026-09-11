# Global Fishing Watch — research handoff

Research date: 2026-09-10. Draft only; no production content or review-state writes.

`draft.json` is a complete six-language rich candidate: 11 approved descriptors, eight access paths, two scoped metrics and 25 incident relationships. `endpoint-drafts.json` contains 28 minimal identity stubs and nine additional operator funding/membership edges. Across both files there are 34 relationships. The stubs deliberately do not imply completed research of those organizations/systems.

## Identity and current-version corrections

Canonical searches found no Global Fishing Watch record. Fresh full reads returned 404 for `global-fishing-watch` and `global-fishing-watch-operator`, and for all proposed new dependencies; there are no existing incident edges or unrelated stored content to preserve. `canonical-prevalidation.json`, `canonical-indonesia.json` and earlier canonical files retain the evidence. The Oceana search returned unrelated broad full-text matches; no returned title identified Oceana. Existing `marine-regions` and `zenodo` were read with sources, localizations, edges and routes and reused without changing their stored content.

The system is the **Global Fishing Watch platform**; the nonprofit **Global Fishing Watch, Inc.** is a separate operator endpoint. The current [API terms](https://globalfishingwatch.org/our-apis/documentation/docs/license-rate-limits) establish platform ownership, operation and service-policy authority. No governance is inferred from founders, donors, national coverage or a mailing address.

The backlog's technical assumptions required updates:

- [Data pipeline v4](https://globalfishingwatch.org/platform-update/version-4-data-pipeline-release/) launched 26 February 2026 across AIS, VMS, vessel identity and detections. **API v3** is a different version axis; the [key concepts](https://globalfishingwatch.org/our-apis/documentation/docs/v3/general-api-doc/key-concepts) explicitly name `public-global-fishing-effort:v4.0`.
- [Kpler](https://globalfishingwatch.org/platform-update/data-vendor-transition/) became the unified live AIS supplier on 22 April 2026, announced 25 April. Prior Spire/ExactEarth/MarineTraffic arrangements are historical. Receiver IDs and regional coverage changed; the operator's equal-weighted global grid metric showed a four-percent decline, which is not a four-percent loss of fishing activity.
- [Skylight VIIRS detections](https://globalfishingwatch.org/platform-update/skylight-viirs-detections-added/) entered the platform on 31 March 2026. The [June registry update](https://globalfishingwatch.org/platform-update/five-new-vessel-registry-data-sources-integrated/) incorporates TMT FACT data monthly, with access restrictions on some indicators and Brazilian RGP fields. The source documents substitution of S&P data after IMO access restrictions; direct raw-IMO availability should not be assumed.
- Users **can write their own workspace layers**. This is separate from contributing to GFW's curated public feeds.
- GFW's current [Panama account](https://globalfishingwatch.org/our-work-in-panama/) says domestic-fleet VMS was publicly shared in 2026. This is stronger evidence than the June commitment announcement. The draft reflects publication, with launch day and complete fleet coverage unspecified.

## What the data mean

The [API caveats](https://globalfishingwatch.org/our-apis/documentation/docs/v3/general-api-doc/data-caveats) distinguish modelled apparent fishing effort, event summaries, encounters, loitering and AIS gaps. Fishing estimates can include searching and gear preparation, and different products apply different filters. An encounter is not confirmed transshipment; missing reception or an unmatched satellite detection is not proof of illegal activity. Vessel identity can be incomplete, outdated, spoofed or recycled. AIS coverage is uneven, particularly for smaller boats; the annual-report headline about the entire industrial fleet is not treated as verified exhaustive observation.

Approved types are fisheries statistics, model outputs, platform records and geographic reference data. Approved formats are CSV, JSON, GeoJSON, Shapefile, KML and PDF, with scopes differentiating bulk products, API responses, user uploads and vessel reports. [4Wings reports](https://api-doc.globalfishingwatch.org/our-apis/documentation/docs/v3/4wings/report) also document GeoTIFF, which has no approved format ID and is retained only as a gap. APIs, AIS, MMSI, WGS84, ZIP packaging, licences and backend service names are not invented format/standard tags.

The single approved standard, `fao_fishing_areas`, is supported narrowly by the [map guide](https://globalfishingwatch.org/user-guide/): FAO major fishing areas are statistical reference boundaries. It does not claim uniform metadata compliance or maritime authority. No verified common ISO/DCAT/Darwin Core implementation is invented.

## Exact metrics and scope

The frozen [Zenodo v3.0.0 release](https://zenodo.org/records/14982712), published 11 March 2025, covers 2012–2024. Its API response is retained in `zenodo.raw`; all eight README/schema files were actually retrieved. The full multi-gigabyte archive was not downloaded.

| Measurement | Draft treatment |
|---|---|
| 26,294,789,287 bytes | Exact sum of 48 file sizes in `zenodo.raw`; `storage_size_bytes`, observed `2025-03-11` (publication date). Downloadable versioned package only, not total GFW backend storage or bytes analysed. |
| 22,877 file downloads | Zenodo `stats.version_downloads`, also equal to its all-version counter in the captured response. `download_count`, cumulative, `observedAt:null`: no counter reporting timestamp was supplied. |
| 9,270 unique downloads; 3,418 unique views | Retained as research context, not substituted for total file downloads or sessions. |
| >190,000 AIS devices, up to about 96,000 active annually | Release-description approximations, not exact unique-vessel counts. MMSI can change or be shared/recycled. |

[Zenodo's definitions](https://zenodo.org/help/statistics) count each file download, including human-initiated machine requests, while excluding robots/double-clicks. A unique download groups activity within a one-hour window. Its usage counters are normally updated daily; the research retrieval time is not substituted for an absent reporting date.

The annual report's API requests, website visitors, page views and registered users do not match download, session or contributor metrics. Analysed imagery volume is not stored volume. Its rounded vessel/detection and research-citation headlines lack enough scope/method precision for additional measurements here. Data and Usage gaps make these omissions explicit.

## Access evidence and actual checks

1. **Map:** root successfully rendered the anonymous map; `/map/` redirected to `/platform/map`. Activity and reference layers work without an account. Registration is required for advanced analysis, downloads, saved workspaces and uploads.
2. **Reports:** documented area and vessel downloads are available after login. Public map download is not a blanket raw-AIS-track or raw-VMS export. PDF is scoped to vessel reports; CSV/JSON serve analytical data.
3. **API:** current [authentication documentation](https://globalfishingwatch.org/our-apis/documentation/docs/authentication) requires a personal bearer token. The terms additionally specify eligible organizational affiliation and noncommercial use/attribution. Limits are 50,000 requests/day and 1,500,000/month, shared across a user's tokens, not per token. A 403 can mean dataset permission denial. No personal GFW token was available, obtained, accepted on the user's behalf or used; authenticated calls and bulk-report concurrency were not exercised.
4. **Zenodo:** metadata and small source files were successfully read earlier. The fixed v3 release is CC BY-NC 4.0. Later URL checks received 403 from Zenodo despite the retained successful reads; this is a client/session access difference, not evidence that the data vanished.
5. **BigQuery:** the release names `global-fishing-watch.fishing_effort_v3`. No authenticated query, present row count or cloud-charge determination was made.
6. **Earth Engine:** the [Google catalogue](https://developers.google.com/earth-engine/datasets/catalog/GFW_GFF_V1_fishing_hours) describes a legacy v1 collection from 2012-01-01 to 2017-01-01 under **CC BY-SA 4.0**. That licence cannot be transplanted onto the v3 release or current APIs. Registered project/account requirements apply; fees and quota eligibility were not independently tested here.
7. **Write, workspace:** user-drawn and uploaded polygon, point and track layers can remain private or be shared with a workspace. This does not publish them to GFW's curated datasets. No upload was performed.
8. **Write, curated feed:** government and institutional sharing requires an agreement covering scope, permissions and delivery. No public ingest API or automatic approval is claimed.

No approved Ryu runtime route is staged. The documented native API and actual Zenodo reads are access evidence; integration credentials and a reviewed route contract remain for a separately authorized routing task. Several direct GFW requests initially returned 403 while primary indexed text was available; later one-off URL checks mostly returned 200. See `url-validation.json` for per-URL status, rather than treating a successful status alone as an authenticated data query.

## All six relationship review outcomes

| Type | Draft outcome |
|---|---|
| `governs` | GFW Inc. → GFW, limited to formal control over service terms, access, licences and changes in the published terms. Not governance over ocean activities. |
| `operates` | GFW Inc. → GFW, explicit ownership and operation in the same primary terms. |
| `funds` | Dalio Philanthropies → system: 2025 report explicitly identifies technology-platform support. Seven additional edges target the operator, where the financial scopes actually belong: Audacious Project commitment (USD 60m, stated 2023–2028); Hans Wilsdorf (three-year USD 5.1m regional program); Islas Secas (Panama enforcement, amount unstated); Walmart (two-year USD 450k training/integration); Minderoo (one-year USD 200k models/risk); Sall (one-year USD 150k unrestricted); Oceana (USD 115k late-2025 coalition subgrant). Exact award dates, final disbursements and restricted allocation details remain unverified. These are reported grants/commitments, not new 2026 promises. |
| `member_of` | GFW **organization** → Coalition for Fisheries Transparency and → Joint Analytical Cell, using explicit primary member statements. No system→organization edge or membership inferred from component structure. |
| `publishes_to` | Kpler AIS, Planet purchased imagery, TMT curated identity, and ten named government authorities supply specified data. Government connections are scoped below; data sharing is not government control of GFW. |
| `syncs_to` | Marine Regions EEZs, Protected Planet protected areas, ProtectedSeas Navigator, Skylight VIIRS and TMT FACT feed into GFW. GFW distributes selected products to Zenodo, Earth Engine, BigQuery and ArcGIS Online. Historical deposit versus ongoing integration, permission restrictions and differing versions are explicit on each edge. |

### Government-publisher audit

- Norway Directorate of Fisheries: agreement May 2022, public VMS March 2023.
- Brazil Ministry of Fisheries and Aquaculture: government confirms GFW mirrors PREPS tracking under a partnership established in 2021; restricted RGP identity fields remain separate.
- INCOPESCA: July 2020 agreement, Costa Rican industrial longline/purse-seine subset public January 2022.
- Panama ARAP: international fleet from 2019; domestic longline/trawl subset reported public in 2026. Exact day unverified; old partner-page counter widgets are visibly unreliable and unused.
- Peru Ministry of Production: public October 2018, historical coverage extending to 2012, supported by agreement and subsequent publication accounts.
- Chile Sernapesca: 2019 agreement, public 2020, not universal boat coverage.
- Ecuador DIRNEA: December 2020 agreement, industrial VMS public October 2021.
- Belize High Seas Fisheries Unit: June 2021 agreement, high-seas subset public March 2022; not domestic fleet.
- Papua New Guinea National Fisheries Authority: October 2022 agreement, FIA purse-seine subset public June 2023. Detailed publication timing is used over the page's inconsistent introductory 2022 wording.
- **Indonesia Ministry of Marine Affairs and Fisheries: historical publication from June 2017; sharing ended in 2020 according to the [GFW tracking poster](https://globalfishingwatch.org/wp-content/uploads/GFW-Poster-250530-01.pdf).** The [original release](https://globalfishingwatch.org/transparency/vms-layer-in-fishing-activity-map/) establishes the publisher. No resumed feed was verified. The map's “10 countries” label does not prove ten simultaneous current feeds.

### Bounded unresolved or withheld candidates

- Benin, Palau and Marshall Islands commitments do not by themselves establish a live VMS transfer. Madagascar's June 2026 agreement does not identify a confirmed operational public feed here.
- Founder history (Google/Oceana/SkyTruth), corporate AIS-provider acquisitions and infrastructure hosting do not establish current governance or funding of this system. Historical provider identity changes are documented without parallel current-feed edges.
- ESA Sentinel-1/2 imagery is a verified input, but the exact distribution service endpoint and transfer path were not established. No generic ESA→GFW partnership or invented Copernicus service identity is assigned. Planet's purchased imagery is not a funding donation.
- TMT FACT is the verified delivery intermediary. S&P/OFAC/ILO/Paris MoU/RGP are underlying sources, not all verified direct transfers to GFW; the June release explicitly restricts some fields. No all-registry public-access claim or direct IMO transfer is made.
- Marine Regions and protected-area layers have documented update policies but stale metadata examples; current deployed releases are unresolved. Protected Planet's WDPA/WD-OECM merger occurred 1 November 2025, but GFW still labels its layer WDPA. The edge does not claim complete WDPCA/OECM parity.
- ArcGIS services are explicitly documented but not queried in this session. Google Earth Engine and Zenodo carry historical subsets; no universal synchronization or identical licences are asserted.
- Other organization-wide donors listed without project scope are not automatically system funders. Funding of JAC partners or adjacent programs does not establish GFW-specific allocation. BBNJ, CHM and EIA use cases are relevance, not verified operational data-transfer edges.

## Dependencies and gallery

Reuse existing canonical `marine-regions` and `zenodo`. Reuse `protected-planet` and `google-earth-engine` from the Protected Planet batch, and `minderoo-foundation` from FishBase; duplicate definitions were removed. All other proposed endpoints appear in this folder's endpoint file. `shared-edges.json` is refreshed and contains the exact shared Marine Regions/Protected Planet incoming and Zenodo/Earth Engine outgoing edges; the Protected Planet edge includes the primary WDPCA transition notice. Root should reconcile these before any application.

Root captured `apparent-fishing-effort.png` from the real anonymous map: AIS/VMS heatmap, 8 June–8 September 2026, three-kilometre port buffer, a zoom-dependent hours-per-32,000-km² legend and visible satellite/reference layers. Registration was not performed. This is a useful local capture, with no public delivery URL staged; gallery remains empty, not replaced by an illustration.

## Validation and handoff limits

Final local `validateRecordAggregateContentInput` and `validateRecordQuality` pass for **29 records**, all **34 edge endpoint-kind pairs** pass, and **90/90 cited references resolve**. `local-validation.json` binds the final payload files by SHA-256. The record remains a research candidate, not human-reviewed.

The first create-only API dry run returned HTTP 200 / `valid:false` with 100 issues for the main record and nine missing-endpoint issues for the operator. Exact errors were shown before further revisions and are saved in `api-validation.json`: retired singular `access.method/source`, retired `relationshipReview`, old metric gaps, old localized standard labels, rejection of the new write type, and missing draft endpoints. No obsolete fields were added to appease that validator. `api-validation-final.json` records the final exact main payload after the Indonesia/Panama additions, using another fresh 404 and `x-ryu-create-only:true`; its extra historical endpoint adds one expected dependency issue. Production release and coordinated dependency integration remain necessary before an apply can pass. No content was applied.

Final confirmation: the exact-payload API dry run returned HTTP 200, `valid:false`, **101 issues**, and its saved hash matches `draft.json`. The 39 URL checks returned 32 HTTP 200 and seven HTTP 403 responses; indexed primary text and earlier successful Zenodo reads are distinguished above. Shared-edge objects are identical to their current main-draft counterparts. The local screenshot exists. No required research file remains unfinished.
