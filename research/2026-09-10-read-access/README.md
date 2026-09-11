# Read access cleanup — 2026-09-10

**Applied in production** on 2026-09-11 UTC as part of release `8aa2b8d6c8af`.
All 60 combined patches passed new-contract API dry runs, timestamped writes and
full 137-record readback. The public export is refreshed. See
[release evidence](../../documentation/deployment-recommendations.md#completed-2026-09-10-data-release).

Research delta for the 60 systems with Read access in the original canonical audit.
The separate `source-cooperative` system had no Read entries and is outside this batch.

[access.json](access.json) replaces 158 legacy Read rows with 110 entries on 59
systems. The BBNJ CHM record has an explicit access research gap instead of its
former private planning-document link. All 110 retained entries have matching
labels and guidance in Arabic, Chinese, English, French, Russian and Spanish
(660 localized entries).

The batch keeps human and machine access together, uses the five approved
methods, separates cost from prerequisites, resolves citations against each
owning node, and consolidates redundant destinations. It retains useful existing
FishBase translations. Hosted ERDDAP, map services, SPARQL and metadata harvesting
are described by their actual access methods and scope. Client packages use
`software`; publishing tools are not presented as Read access.

Examples of substantive corrections:

- Ocean InfoHub's retired search now points to the ODIS catalogue. ODIS SPARQL
  documentation is retained with an explicit warning that its historical endpoint
  examples need current-service confirmation.
- GEBCO guidance distinguishes map images from numerical bathymetry. NOAA and
  Oregon ArcGIS entries describe the particular published layers.
- OOI M2M describes its account and API-token prerequisites. Copernicus Toolbox
  describes account requirements; Argovis documents API-key access.
- SeaDataNet, IOOS, PANGAEA and Zenodo explain metadata retrieval separately from
  the underlying files. Catalogue harvesting does not itself assert a graph edge.
- The obsolete ICES generic web-services URL is replaced by the documented DOME
  API with its scope stated explicitly. Unsupported generic protocol claims are
  not carried forward merely because they existed in the legacy method strings.

Requirements remain unknown on 79 entries; 17 have verified absence of the
listed prerequisites and 14 have specified prerequisites. Cost is unknown on 79,
free on 30 and paid on one. These unknown values are research limits, not claims
of unrestricted access. Conditional details remain in the descriptions.

## Delta shape and assembly

Each item contains `nodeId`, replacement Read `access`, locale-keyed replacement
Read `localizations`, and source additions. The optional locale-keyed
`researchGaps` contains the replacement `details.researchGaps.access` text.
This file is a narrow research delta, **not** a complete record API request or
another canonical registry.

For each system, fresh-read the complete canonical record and its timestamp:

1. Preserve all access entries whose type is not `read`. Replace only the Read
   entries, and replace their corresponding localized access rows by ID.
2. Merge source additions into that node's sources, checking for ID collisions.
   Preserve existing sources, other properties/details, review metadata, record
   depth, edges and operational routes.
3. Assemble the existing API PATCH shape: `record.propertiesReplace`,
   `record.sourcesReplace`, and each localization's
   `{ mode: "patch", detailsReplace }`. If present, merge the access research gap.
4. Run `validateOnly=true` with `x-ryu-record-updated-at` from the fresh read.
   Apply only after the full current-contract validation passes and the app/data
   cutover is coordinated. Re-read to verify the result and refresh the public
   export from canonical Postgres.

The subsequent [Write cleanup](../2026-09-10-write-access/README.md) uses the same
shape for contribution entries. The final application release requires both
deltas; the validation notes below describe the Read-only checkpoint.

## Historical validation before the coordinated release

These preparation checks preceded the completed production release above.

- Application build and all 93 tests pass.
- Local assembly introduces no new validation issues against the audited
  canonical records. Read shape, vocabulary, owner-local evidence, IDs and all
  six locales pass. Unrelated properties, localized details, contribution paths,
  edges and routes were checked for preservation.
- All 60 fresh-read, timestamped API PATCH dry runs pass against the currently
  deployed API. That older API does not enforce the new contract; this is not
  evidence that the whole dataset is ready for the new release.
- The current local validator still reports pre-existing metrics and standards
  migration issues: legacy `usage`, `data.recordCount` and `data.storageSize`
  fields, plus unsupported standard IDs, missing scoped descriptions and missing
  standard citations. Those fields are deliberately preserved by this delta.
- The new application expects plural Read `methods` and the new condition fields;
  the deployed application expects singular `method` and `source`. Coordinate
  this backfill with the already pending metrics/standards migrations and the
  application release. Do not deploy the new reader against legacy records, or
  apply the final shape while the legacy reader still serves them. No permanent
  compatibility branch or dual-write mechanism is added here.
- Checked the 130 distinct destination/evidence URLs. The OpenStreetMap template
  was checked structurally and against its provider policy, not requested with
  literal placeholders. GBIF's homepage returned HTTP 403 to the automated
  checker; its provider documentation supports the destination. Other checked
  URLs responded successfully after correcting two obsolete directory links.
  Successful HTTP responses establish reachability, not authenticated query
  execution, complete coverage, or unrestricted access.

Research evidence is recorded directly in the batch's owner-local source objects
with access date 2026-09-10. Existing FishBase sources retain their earlier dates
when reused during final assembly. No private source documents or credentials are
copied into this batch.
