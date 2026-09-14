# Shared code and translation catalogs

`shared/` contains domain contracts and presentation logic used by both the client
and server. Keep runtime code here independent of React, browser globals, server
configuration, database connections, and Node-only APIs. Extend the module that
owns the concern; check existing consumers before adding another abstraction.

## Module ownership

```text
shared/
├── domain.ts                  # Common metadata, vocabulary, kind-discriminated graph union
├── records/
│   ├── country.ts             # Country facts, localization, positive field sets
│   ├── organization.ts        # Institutional facts, localization, positive field sets
│   └── system.ts              # System facts, localization, positive field sets
├── recordApi.ts               # Record API query, DTO, write and validation types
├── indexGraph.ts              # Graph indexes and operator relationship lookup
├── localization.ts            # Supported/default locales and record fallback
├── recordDisplay.ts           # Joins neutral facts to localized record details
├── searchPresentation.ts      # Search view models, filter options and labels
├── i18n.ts                    # Shared text lookup, interpolation and formatting
├── localeNames.ts             # Language names and native language names
├── vocabularyLabels/
│   ├── dataTypes.ts
│   ├── dataFormats.ts
│   ├── dataStandards.ts
│   ├── disciplines.ts
│   ├── graph.ts
│   ├── access.ts
│   ├── metrics.ts
│   └── records.ts
└── uiMessages/
    ├── common.ts              # app.* and common.*
    ├── details.ts             # details.* and source.*
    ├── directory.ts           # directory.*, including data-claim/filter labels
    ├── search.ts              # search.*, including match-field names
    └── graph.ts               # graph.*, including arrangement labels
```

Client code can use the existing `client/src/app/i18n.ts` re-export. Server and
shared code import the shared modules directly. Both builds type-check `shared/`.
Display, filters and server search must resolve vocabulary labels through the
same shared lookup.

## Text ownership and storage

Country, system, and organization localizations use distinct types selected by
the owning node kind. Country content has one `summary` introduction and the
declared `aliases`, `profile.sourceRefs`, and `treatyParticipation` details.
`recordContentFields` and `localizationContentFields` declare the positive API
field sets. Country responses omit the main URL and extended-description fields;
the shared SQL columns remain storage for the other kinds. Migration 015 preserves
older country prose in the summary before backfill and enforces the complete
country storage shape. Review dates are retained per event and displayed publicly.

Each kind owns its properties, localization and positive authored field sets in
`records/<kind>.ts`. `GraphNode` is the `NodeByKind` union, not a shared optional
property bag. API inputs, patches, DTOs and resolved localizations preserve that
kind. Narrow by `kind` before reading kind-specific fields; display and search
helpers take their actual kind. Organization metrics and system metrics have
separate keys and types.

`server/src/recordContracts/<kind>.ts` owns structural and kind-specific research
rules. `recordContracts.ts` handles dispatch, envelopes and common evidence,
localization and review concerns. PATCH without `record.kind` resolves against
the stored kind and validates all retained content. Explicit kind changes must
satisfy the destination contract, including retained locales, edges and routes.
Use a complete PUT plus explicit localization replacements when fields must be
removed; writes never silently drop incompatible content.

The physical tables stay shared. Migrations 014–016 guard nested shapes; forward
migration 017 completes kind-specific populated column and route ownership checks.
It audits before installing guards and does not repair data automatically.
Contract changes update the matching example, API tests, SQL guards and authoring
guide in the same release.

| Content | Owner |
| --- | --- |
| Approved IDs such as `botany`, `occurrence_records`, `csv` | `domain.ts`; records store these IDs |
| Shared display names for those IDs | `vocabularyLabels/`, grouped by subject |
| Headings, buttons, empty states and message templates | `uiMessages/`, grouped by UI concern |
| Language names | `localeNames.ts` |
| A record's title, profile, descriptor descriptions and access guidance | `node_localizations` |
| Relationship descriptions, scope, status and citations | `edges.note`, `edges.properties_json` and `edges.sources` |
| A source's translated title and optional fact context | That node or edge's `sources[id].title` and `description` maps |

For data descriptors, the neutral `label` field contains an approved ID. Its
localized entry supplies the matching item `id` and scoped `description`, with no
label override. Use [the rich record guide](../documentation/RICH_RESEARCH_RECORDS.md)
for record authoring, evidence, completeness and vocabulary approval requirements.

System metrics store only an approved key, numeric value, observation date,
source, optional reporting period, and stable item ID. Organization scale uses
its three organization-only keys without reporting periods; the source's
localized description carries the figure's scope and qualifications.
`metricDefinitions` in `domain.ts` derives the group and unit. `recordDisplay.ts`
joins system metric descriptions by ID; `i18n.ts` formats the value, derived unit
and period. Metric labels and units cannot be overridden in records. New metric
keys or units require human approval and a complete six-language catalog release
before use.

Catalogs are code released with the app. A label correction does not require a
record rewrite. Keep URLs, IDs and operational facts language-neutral. Individual
edge notes and route caveats are not shared catalog entries. Route status, mode
and capability labels still use the existing humanization path; this catalog
split did not add route translations or translations for those prose fields.

## Lookup API

Use the exports from [i18n.ts](./i18n.ts):

```ts
t("fr", "details.dataTypes");                         // "Types de données"
t("fr", "directory.systemCount", { filtered: 2, total: 10 });
vocabularyLabel("fr", "dataTypes", "occurrence_records"); // "Données d’occurrence"
vocabularyLabel("fr", "disciplines", "botany");        // "Botanique"
dataDescriptorLabel(locale, descriptor);              // Uses descriptor.category
localeName("fr", "en");                              // "French"
formatNumber(12345, locale);
formatMetricValue(metric, locale);                   // Derived unit and reporting period
formatDateTime(timestamp, locale);
```

`localeName` takes the language being named first and the display language second.
`localeNativeNames` is also exported for language selectors. In the underlying
`localeNames` catalog, entries are indexed as `[language][displayLocale]`.

`t()` substitutes named `{placeholders}`. Supply all required values; omitted
values remain visible as placeholders. It does not perform plural selection or
number formatting. Use the formatting exports when a value needs locale-aware
formatting. Normalize untrusted locale inputs with `normalizeLocale()` from
`localization.ts` before calling typed lookups.

The vocabulary groups are:

| Group passed to `vocabularyLabel` | Catalog file | Accepted values |
| --- | --- | --- |
| `dataTypes` | `vocabularyLabels/dataTypes.ts` | `DataType` |
| `dataFormats` | `vocabularyLabels/dataFormats.ts` | `DataFormat` |
| `dataStandards` | `vocabularyLabels/dataStandards.ts` | `DataStandard` |
| `disciplines` | `vocabularyLabels/disciplines.ts` | `Discipline` |
| `nodeKinds`, `edgeKinds` | `vocabularyLabels/graph.ts` | `GraphNodeKind`, `GraphEdgeKind` |
| `relationshipDirections` | `vocabularyLabels/graph.ts` | `incoming`, `outgoing` |
| `accessTypes` | `vocabularyLabels/access.ts` | `SystemAccessType` |
| `accessMethods` | `vocabularyLabels/access.ts` | `AccessMethod` (`ReadAccessMethod` / `WriteAccessMethod`) |
| `accessRequirements`, `accessCosts` | `vocabularyLabels/access.ts` | `AccessRequirement`, `AccessCost` |
| `metricKeys`, `units`, `metricPeriods` | `vocabularyLabels/metrics.ts` | `MetricKey` (`SystemMetricKey` / `OrganizationMetricKey`), `MetricUnit`, `MetricPeriod` |
| `organizationOfficeKinds` | `vocabularyLabels/organizations.ts` | `OrganizationOfficeKind` |
| `recordDepths`, `reviewStates` | `vocabularyLabels/records.ts` | `RecordDepth`, `ReviewState` |
| `treatyParticipationStatuses`, `treatyConsentMethods` | `vocabularyLabels/records.ts` | `TreatyParticipationStatus`, `TreatyConsentMethod` |

Approved vocabulary lookups reject unknown IDs and missing/blank translations.
Read and Write methods, requirements, costs, metrics and units are closed vocabularies. Do not broaden a
closed catalog to `Record<string, ...>` or cast a value to bypass its ID type.

Keep descriptor categories intact through display and search. Prefer
`dataDescriptorLabel(locale, descriptor)` when working with a descriptor union;
do not flatten all descriptor IDs into an untyped dictionary. `SystemSearchRecord`
preserves typed arrays for types, formats, standards, disciplines and access types.

Shared catalogs require every supported language. Record localization has a
different fallback policy: requested language, then English, then an available
localization, with the node ID used when no localization exists. Display code
reports that fallback separately; it does not justify incomplete shared catalogs.

## Extending a catalog

Keep all six translations beside their term or message key. For example, the
`botany` entry in `vocabularyLabels/disciplines.ts` contains:

```ts
botany: {
  en: "Botany", fr: "Botanique", es: "Botánica",
  ar: "علم النبات", zh: "植物学", ru: "Ботаника",
}
```

Closed catalogs use `satisfies Record<Discipline, Record<SupportedLocale, string>>`
(or the relevant domain type). UI message catalogs and catalogs for open fields
use `satisfies Record<string, Record<SupportedLocale, string>>`. This keeps literal
message keys available to TypeScript while checking language coverage.

- **Correct an existing label:** edit its owning entry. Keep its ID stable and
  review all translations if the meaning changes. TypeScript cannot verify meaning.
- **Add an approved vocabulary value:** obtain the explicit approval required by
  the rich record guide, then update `domain.ts` and the owning catalog with all
  six translations in the same change. Release the vocabulary and translations
  before authoring records with the new ID. Do not rename stored IDs to fix wording.
- **Add a UI message:** use an existing owning file and a descriptive namespaced
  key, supply all languages and the same placeholder names, then call `t()`.
  `UiMessageKey` is derived automatically; no separate key registry is needed.
- **Add a catalog file or group:** register it in `i18n.ts`. For a new UI catalog,
  also include it in the ownership check in `server/src/i18n.test.ts`. Existing
  vocabulary groups should remain the default home for related additions.
- **Add a supported language:** this is a broader contract change. Update
  `SupportedLocale` in `domain.ts`, the runtime `supportedLocales` list in
  `localization.ts`, language names, and every catalog. Check record validation,
  database constraints and UI consumers as part of that change.

Technical names such as CSV and NetCDF may legitimately be identical across
languages. Translation changes belong in the catalog, not copied into records,
components or server search code. Keep message keys unique across UI files.

## Validation

Run these from the repository root after changing shared behavior or catalogs:

```sh
npm run build
node --import tsx --test server/src/i18n.test.ts server/src/recordSearch.test.ts
```

The build checks both consumers, complete closed vocabularies, supported-language
keys and typed lookup calls. The catalog tests check nonblank text, exact language
coverage, matching placeholder names, unique UI message ownership, rejection of
invalid vocabulary values and the open-field fallback. Search tests cover
translated descriptor and discipline labels in display, filtering and search.
Run `npm test` for the full suite when changing shared behavior. Its HTTP tests
need permission to bind a local server; `listen EPERM` is an environment failure.

## Migration from the previous i18n layout

The 2026-09-10 refactor moved the existing strings out of `i18n.ts` without changing
their text. Dictionaries are now keyed by term/message first, with all languages
together. `facetLabel` and the combined `descriptorLabel` group were removed.
Use the vocabulary groups above or `dataDescriptorLabel()` for their replacements.
Existing UI message keys were retained; former UI facet groups now use:

| Former group | Message-key prefix |
| --- | --- |
| `pane` | `app.pane.*` |
| `graphArrangement` | `graph.arrangement.*` |
| `dataClaim` | `directory.dataClaim.*` |
| `localizationCoverage` | `directory.localizationCoverage.*` |

`selectOptions()` now accepts a typed value array and a label callback. Keep the
value type through that callback so the compiler can check its vocabulary group.
The catalog reorganization required no database migration.
