# Priority rich-record batch review

This is a review of research candidates, not an application log. Main record drafts use the approved local contract; Cloud SQL remains canonical. The queue and source document are linked in [README.md](README.md).

## Cross-record decisions

- Existing IDs are preserved, including `platform-obis`. Newly identified systems and organizations use separate, meaningful IDs. Global Fishing Watch's platform and nonprofit operator are separate endpoints.
- Shared relationship payloads are reconciled by edge ID and directed triple. DeepData→OBIS, ISA→OBIS and WoRMS→DeepData use the DeepData evidence; FishBase/OBIS/WoRMS relationships have one consistent payload in every affected draft. ODIS recipient-demo evidence was reconciled into the DeepData participation/metadata-transfer edges and the new OBIS→ODIS metadata-transfer edge. Protected Planet→GFW explicitly preserves the uncertainty about which current WDPCA release GFW imports.
- The Catalog of Fishes→FishBase relationship was resolved during orchestration using both institutions' primary accounts. It describes taxonomic authority-file use and editorial reconciliation, without inventing automatic or reciprocal synchronization.
- Supporting endpoint drafts establish identities needed for verified relationships. They remain thin or stub; they are not additional completed rich-research jobs. Minderoo, Earth Engine and other shared endpoints are reused across assignments. These files are an incremental research batch, not a parallel graph registry.
- A funding edge identifies the actual recipient or scoped beneficiary. Organization-wide GFW support is on the operator; a grant expressly supporting the platform can point to the system. Commitments, historical project periods and unknown disbursements remain explicit. Funding, participation and technical advice are not treated as governance.

## Material corrections to the backlog

| Record | Research correction |
| --- | --- |
| FishBase | Canonical depth is thin/needs_revision. The `.htm` homepage is a 2015 snapshot; the live PHP homepage reports June 2026. Source Cooperative advertises v26.07 while its public listing contains v26.06. |
| OBIS | Absence records are accessible through API/cloud paths even though the mapper hides them. Current API totals, homepage headlines and archive counts describe different scopes. Mapper export asks for an email address. |
| WoRMS | Web hits are not sessions. Public taxonomic services, approved CSV exports and the restricted full GBIF archive have different access conditions. Incoming taxonomy sources require directed import relationships. |
| ENA | INSDC permits oceans/seas in geographic metadata; the field does not establish ABNJ jurisdiction. Reported bases are not sequence entries, and large petabyte totals cannot be forced into an unsafe integer byte metric. |
| ISA DeepData | Native environmental holdings, dashboard sample counts and the OBIS-published biodiversity subset differ. The earlier ODIS offline flag is historical: its later source check was online, and the current development demo exposed 335 dataset metadata records. Neither proves complete or continuously healthy harvesting. Contract participation alone does not prove publication. |
| Protected Planet | WDPA and WD-OECM merged into WDPCA in November 2025. September 2026 site counts are separate from parcels, coverage percentages and stale thematic cards. API v4 and GIS field counts supersede the old schema notes. |
| Global Fishing Watch | Live processing v4, API v3 and frozen Zenodo v3 are separate versions with different coverage and terms. Apparent fishing activity does not measure catch or prove an offence. |
| ABS Clearing-House | Confidential information must not be submitted under the operational modalities; publication is not a mechanism for depositing undisclosed secret values. Public national records and authorized submission are distinct access paths. |
| OceanTeacher | Public course discovery differs from learning access through approved OceanExpert accounts. Learning-service certification is not a data standard. Courses and learners cannot be relabelled as unsupported metric units. |
| ODIS | The former Ocean InfoHub search is no longer maintained. The current linked development demo does return metadata; root verified DeepData and OBIS results. ODISCat entries, configured feeds, indexed records and current feed health are separate scopes. |

## Browser evidence

Actual public interfaces were checked with the in-app browser. Local PNGs document WoRMS, OBIS, ENA, DeepData's dashboard, Protected Planet, GFW, OceanTeacher, ABSCH and ODIS. The new screenshots are research evidence and have not been assigned public gallery URLs. FishBase's four existing gallery assets are preserved and checked.

Protected Planet's Bonaire page and download selector loaded publicly; its 78-page WDPCA manual loaded in the PDF viewer, but the download returned no local file. The selector's Continue action was not used. DeepData's map reached a terms-acceptance gate; its separate dashboard was readable with a partial visual-filter error. No terms agreement, account registration, authenticated upstream operation or submission was performed. OceanTeacher's catalog screenshot includes a policy banner and is not a finished gallery asset. The ABS certificate screenshot is framed on general record fields.

The ODIS development demo returned 335 DeepData dataset-metadata records and 5,900 OBIS records in bounded browser queries; actual linked record APIs were subsequently readable. Its network page separately reported 66 configured nodes and 41 with errors. OceanExpert retained indexed records while its sitemap was reported unavailable, so indexed presence is not current source health. The 65 node-designated ODISCat rows are a different inventory, including two duplicate identities. All 65 rows are classified in the ODIS inventory review: 9 covered systems, 2 duplicates and 54 bounded expansion candidates, each with a reason for withholding further edges. These findings qualify the shared edges; they do not establish full-data replication, completeness or a reliable service cadence.

## Validation and application boundary

Per-record checks cover request shape, rich-record requirements, vocabulary, all six main-record locales, owner-local references, endpoint kinds and public URL behavior. Client-specific 403/TLS failures are reported alongside primary-source/browser readability rather than treated automatically as dead links.

The parent `validation-postgres-batch.json` records an isolated PGlite/PostgreSQL rehearsal using the real schema, repository dry runs, local transactions and readback. Each entry carries SHA-256 of JSON.stringify(parsed payload), distinct from worker files that hash formatted file bytes. Its canonical baseline contains identities and kinds only; it does not prove that a future merge with concurrent production content will validate. Earlier worker files are historical evidence when reconciliation changes their payloads.

Production currently has the older content validator. Worker `validateOnly=true` calls returned legacy-shape and missing-endpoint errors; retired fields were not added to satisfy that older API. The separate rollout task reports completion of eight metadata repairs, with broader data conversion and new-contract deployment still pending. Fresh canonical reads and successful dry runs under the released contract are required before any separately authorized application. This batch has made no production content or review-state writes, deployment, schema change, vocabulary addition or commit.

All ten main systems and 96 supporting drafts passed the final combined schema/repository rehearsal, with 179 unique edges and no conflicting payloads. All 106 supplied payloads survived repository dry runs, isolated application and full supplied-field readback. An independent second-agent review found no metric/access discrepancies in FishBase, OBIS, ENA and Protected Planet and recomputed all three stored object-size sums. The final hashes include the ODIS handoff, OBIS funding updates, and all shared-edge reconciliation.

The final api-validation-batch.json records fresh canonical GETs and exact-payload validateOnly calls for all ten main drafts. All returned HTTP 200 / valid:false, with 953 issues grouped as 171 legacy access issues, 420 retired relationshipReview requirements, 132 retired localized standard-label requirements, 120 retired metric-gap requirements and 110 edge failures involving uncreated dependencies. There were no other issue categories. These counts include repeated per-locale/per-record checks, not 953 distinct content defects. All 25 pre-existing incident edges and their source IDs, plus existing node source IDs, were retained. Five mains exist and five require creation.
