# Write access cleanup — 2026-09-10

Prepared implementation and research delta. **No production content writes,
deployment or public export refresh have been applied.**

[access.json](access.json) replaces 67 legacy contribution entries on 36 systems
with 47 Write entries on 35 systems. BBNJ CHM has no verified live contribution
route. All retained entries have labels and guidance in Arabic, Chinese, English,
French, Russian and Spanish: 282 localized entries. The batch adds 53 owner-local
sources and reuses FishBase's sources and substantive translations.

## Contract and behavior

Read and Write share seven fields:
`id`, `type`, `methods`, `url`, `requirements`, `cost`, `sourceRefs`.
Types are `read | write`; `submit` and `partner_sync` are retired.

Write methods: `form`, `upload`, `api`, `software`, `request`, `harvest`.
Read methods: `browse`, `download`, `api`, `software`, `request`.
Both use the same conditions, sources, six-language catalog, display component
and search indexing. Direction and method filters must match the same entry:
a Read API plus a Write upload cannot match “Write + API”.

Requirements mean verified prerequisites, not routine curation. `null` means
unknown; `[]` means verified absence. Cost concerns the described contribution
or publication workflow. Conditional details remain in prose. There are 30 entries
with specified prerequisites and 17 with unknown prerequisites; none asserts
verified absence. Costs are free on three, mixed on two, and unknown on 42.

Hosted IPT is classified by its publishing workflow. Webin-CLI and the
provider-run SeaDataNet Replication Manager qualify as software. DOI publication
is an outcome. Harvesting describes a contribution mechanism; it does not itself
establish a transfer edge. BCO-DMO's preservation copy remains on
`link-bcodmo-ncei`; INSDC member exchanges remain on their existing `syncs_to`
edges. All edges and operational routes are preserved.

Validation enforces the shared shape, direction-specific vocabulary, owner-local
citations and exactly one nonblank localized entry per access ID in every locale
at every depth. Singular `method`/`source`, legacy types, orphaned translations
and localized `instructions`/`caveats` are rejected. Historical import code retains
an explicitly named intermediate shape, separate from canonical authoring.

## Research decisions

- Replaced generic homepages with useful submission guidance, portals or provider
  contacts. DATRAS's obsolete submission subdirectory returned 404; its working
  root now serves the upload workflow.
- Confirmed submission APIs for ENA, GBIF Registry and Zenodo. Added Dryad's
  documented partner API. Removed unsupported `api_write` claims for BCO-DMO,
  DDBJ and PANGAEA.
- MGnify explains analysis requests, the ENA dependency and private-data consent.
  It is no longer described as an IPT publisher.
- IOOS and ODIS explain registered metadata sources separately from underlying
  observations/files. Ocean InfoHub points to successor ODIS.
- Copernicus contributions point to regional In Situ TAC service desks.
  Euro-Argo points to coordination through the responsible Data Assembly Centre;
  exact provider arrangements remain to be confirmed.
- SeaDataNet distinguishes SEANOE publication, staff-assisted CDI onboarding and
  Replication Manager. Its older CDI setup guidance warrants confirmation with
  MARIS before integration.
- FishBase retains three distinct workflows and their translations. BISMaL's
  verified route is scoped to corrections and referenced taxonomy. GLODAP's
  route is a team enquiry, not an asserted upload API.
- Dryad costs reflect size, sponsorship and waivers. PANGAEA financial support
  is voluntary; Zenodo cites free-service and fair-use guidance.
- BBNJ CHM's `planned_federation` row is removed. The Read batch records the
  absence of a verified live path. A private planning URL is not a usable
  contribution destination.

## Delta assembly and release

This is a narrow research delta, not a complete API payload or another canonical
registry. Each object contains `nodeId`, replacement contribution `access`,
locale-keyed replacement contribution `localizations`, and source additions.
An empty array deliberately removes that node's legacy contribution rows.

Assemble with the [Read batch](../2026-09-10-read-access/README.md), using a fresh
canonical API read and timestamp for each node:

1. Replace contribution entries (`submit`, `partner_sync`, or migrated `write`)
   and their localized rows matched by ID. Preserve Read entries unless also
   applying the separately reviewed Read delta.
2. Merge sources, rejecting collisions. Preserve existing sources, unrelated
   properties/details, review metadata, depth, edges and routes.
3. Assemble `record.propertiesReplace`, `record.sourcesReplace` and localized
   `{ mode: "patch", detailsReplace }`. Merge the Read access gap where supplied.
4. Run `validateOnly=true` with `x-ryu-record-updated-at` from the fresh read.
   Apply after the complete current contract validates and the app/data release
   is coordinated. Then re-read and refresh the public export from Postgres.

The final application requires both access deltas. Do not deploy it against
legacy records, or apply the new shape while the old reader still serves them.
No permanent compatibility branch is included.

## Validation

- Production build and all 93 tests pass. Focused access, vocabulary and search
  checks pass after the final neutral cost-label correction.
- Combined Read/Write assembly across 60 freshly read canonical systems has
  **zero access issues and zero newly introduced validation issues**. Preservation
  assertions cover unrelated properties, localized content, existing sources,
  reviews, depth, edges and operational routes.
- All 60 timestamped API PATCH dry runs pass against the deployed API, including
  refreshed checks for the final DATRAS, GBIF and Zenodo corrections. Applied
  writes: **zero**. That older API does not enforce the new contract.
- Current local validation still reports pre-existing release dependencies:
  1,260 legacy metric-field issues, 14 invalid/duplicate standard assignments,
  11 missing standard citations and 71 missing scoped standard descriptions.
  These are preserved content outside this access delta.
- Checked 52 distinct destination/evidence URLs. Final URLs responded
  successfully except the GBIF IPT landing page, which returned HTTP 403 to the
  automated checker; official IPT/GBIF documentation supports that route.
  Authenticated uploads, publication and end-to-end integrations were not run.

Research source dates describe this review. Reused FishBase sources retain their
existing dates. No credentials or private planning documents are copied here.
