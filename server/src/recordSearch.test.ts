import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphNode, GraphNodeKind, RyuRoute, SupportedLocale } from "../../shared/domain";
import { dataFormats, dataStandards, dataTypes } from "../../shared/domain";
import { vocabularyLabel } from "../../shared/i18n";
import { indexGraph } from "../../shared/indexGraph";
import { emptyLocalizationDetails, resolveNodeLocalization, supportedLocales } from "../../shared/localization";
import { systemDataDescriptors, systemMetrics } from "../../shared/recordDisplay";
import { buildSystemRecords, getSystemFilterOptions } from "../../shared/searchPresentation";
import { readRecordSearchQuery } from "./recordContracts";
import { searchRecords } from "./recordSearch";

function node(id: string, kind: GraphNodeKind = "system", title = id): GraphNode {
  return {
    id, kind, countryCode: null, url: null, recordDepth: "stub",
    createdAt: "2026-09-07", updatedAt: "2026-09-07", properties: {}, sources: {}, availableLocales: ["en"], requestedLocale: "en", displayLocale: "en", isLocaleFallback: false,
    localizations: { en: { locale: "en", title, summary: null, description: null,
      details: emptyLocalizationDetails(), translatedFromLocale: null, contentUpdatedAt: "2026-09-07",
      review: { state: "agent_researched", note: null, reviewer: null, date: null },
      createdAt: "2026-09-07", updatedAt: "2026-09-07",
    } },
  };
}

function search(nodes: GraphNode[], input: Record<string, unknown>, routes: RyuRoute[] = []) {
  return searchRecords(indexGraph({ nodes, edges: [], ryuRoutes: routes, savedViews: [] }), readRecordSearchQuery(input));
}

test("metric display and search share typed labels, units and reporting periods in every language", () => {
  const record = node("metrics");
  record.properties.metrics = [{ id: "sessions", key: "session_count", value: 1200, observedAt: "2026-08", period: "month", source: "stats" }];
  for (const locale of supportedLocales) {
    record.localizations[locale] = { ...structuredClone(record.localizations.en!), locale,
      details: { ...emptyLocalizationDetails(), metrics: [{ id: "sessions", description: `${locale} measured traffic` }] } };
  }
  record.availableLocales = [...supportedLocales];
  for (const locale of supportedLocales) {
    const label = vocabularyLabel(locale, "metricKeys", "session_count");
    assert.equal(systemMetrics(record, resolveNodeLocalization(record, locale))[0].label, label);
    for (const q of [label, vocabularyLabel(locale, "units", "sessions"), vocabularyLabel(locale, "metricPeriods", "month"), "1200"]) {
      const result = search([record], { q, locale });
      assert.equal(result.length, 1, `${locale}/${q}`);
      assert.ok(result[0].reasons.some(reason => reason.field === "data.metrics"));
    }
  }
});

test("aliases match every record kind in the displayed localization, with English fallback", () => {
  for (const kind of ["system", "organization", "country"] as const) {
    const record = node(`record-${kind}`, kind, "Unrelated title");
    record.localizations.en!.details.aliases = ["PelagicAlias"];
    const fallback = search([record], { q: "PelagicAlias", locale: "fr" });
    assert.equal(fallback.length, 1, kind);
    assert.equal(fallback[0].matchedLocale, "en");
    assert.equal(fallback[0].reasons[0].field, "aliases");
    assert.equal(fallback[0].reasons[0].value, "PelagicAlias");
    assert.equal(search([record], { q: "PelagicAlias", locale: "fr", localeMode: "locale_only" }).length, 0);
    record.localizations.fr = { ...structuredClone(record.localizations.en!), locale: "fr", title: "Titre français",
      details: { ...emptyLocalizationDetails(), aliases: ["BathyalAlias"] } };
    record.availableLocales.push("fr");
    assert.equal(search([record], { q: "PelagicAlias", locale: "fr" }).length, 0, kind);
    assert.equal(search([record], { q: "BathyalAlias", locale: "fr" }).length, 1, kind);
    for (const localeMode of ["all_locales", "locale_with_fallbacks"]) {
      const result = search([record], { q: "PelagicAlias", locale: "fr", localeMode });
      assert.equal(result.length, 1, kind);
      assert.equal(result[0].matchedLocale, "en");
      assert.equal(result[0].displayLocale, "fr");
      assert.equal(result[0].isLocaleFallback, false);
    }
    for (const [locale, alias] of [["ar", "محيط"], ["zh", "海洋"], ["ru", "океан"]] as const) {
      record.localizations[locale] = { ...structuredClone(record.localizations.en!), locale,
        details: { ...emptyLocalizationDetails(), aliases: [alias] } };
      record.availableLocales.push(locale);
      assert.equal(search([record], { q: alias, locale }).length, 1, `${kind}/${locale}`);
    }
  }
});

test("ranking keeps exact, prefix and typo matches, requires every token and explains the strongest fields", () => {
  const records = [node("a", "system", "Marine"), node("b", "system", "Mariner"), node("c", "system", "Marina")];
  records[0].localizations.en!.summary = "Biodiversité atlas";
  const results = search(records, { q: "marine" });
  assert.deepEqual(results.map(result => result.entity.id), ["a", "b", "c"]);
  assert.ok(results[0].score > results[1].score && results[1].score > results[2].score);
  assert.deepEqual(results[0].reasons.map(reason => [reason.field, reason.value]), [["name", "Marine"]]);
  assert.deepEqual(search(records, { q: "marine biodiversite" }).map(result => result.entity.id), ["a"]);
  assert.equal(search(records, { q: "marine absentword" }).length, 0);
  assert.deepEqual(search(records, { q: "marne" }).map(result => result.entity.id), ["a"]);
  const organization = node("institution", "organization");
  organization.localizations.en!.summary = "Biodiversity evidence";
  assert.equal(search([organization], { q: "biodiversity" }).length, 1);
});

test("filters intersect across groups and OR within groups, using typed access and descriptor fields", () => {
  const record = node("filtered");
  record.recordDepth = "rich";
  record.properties = { disciplines: ["ecology", "taxonomy"], geographicScope: "Global",
    access: [{ id: "api", type: "read", method: "api", url: "https://example.org", source: "src-api" }],
    data: { descriptors: [
      { id: "type", category: "type", label: "occurrence_records", source: "src-api" },
      { id: "format", category: "format", label: "geojson", source: "src-api" },
      { id: "standard", category: "standard", label: "darwin_core", source: "src-api" },
    ] },
  };
  const filters = { kind: "system", disciplines: "ecology,genetics",
    dataType: "occurrence_records", dataFormat: "geojson", dataStandard: "darwin_core", recordDepth: "rich",
    accessType: "read", accessMethod: "api", locale: "fr", localeAvailability: "missing",
    reviewState: "agent_researched", reviewLocale: "displayed" };
  assert.equal(search([record], filters).length, 1);
  assert.equal(search([record], { geography: "global" }).length, 0);
  assert.equal(search([record], { q: "global" }).length, 0);
  assert.equal(search([record], { ...filters, disciplines: "taxonomy" }).length, 1);
  assert.equal(search([record], { ...filters, disciplines: "chemistry" }).length, 0);
  assert.throws(() => readRecordSearchQuery({ disciplines: "fish_biodiversity" }), /disciplines/);
  assert.throws(() => readRecordSearchQuery({ role: "aggregator" }), /unsupported/);
  assert.throws(() => readRecordSearchQuery({ disciplineFamily: "biodiversity" }), /unsupported/);
  for (const key of ["countryCode", "geography", "accessType", "accessMethod"]) {
    assert.equal(search([record], { ...filters, [key]: "not-a-match" }).length, 0, key);
  }
  assert.throws(() => readRecordSearchQuery({ dataStandard: "Darwin Core" }), /dataStandard/);
  assert.equal(search([record], { ...filters, dataStandard: "cf" }).length, 0);
  assert.equal(search([record], { ...filters, accessType: "api" }).length, 0);
  assert.equal(search([record], { ...filters, dataType: "sequence_data" }).length, 0);
  assert.equal(search([record], { ...filters, dataType: "sequence_data,occurrence_records" }).length, 1);
  assert.throws(() => readRecordSearchQuery({ dataType: "geojson" }), /dataType/);
  assert.throws(() => readRecordSearchQuery({ dataFormat: "not-a-format" }), /dataFormat/);
  assert.throws(() => readRecordSearchQuery({ dataFormat: "GeoJSON" }), /dataFormat/);
  assert.equal(search([record], { ...filters, dataFormat: "parquet" }).length, 0);
  assert.equal(search([record], { ...filters, dataFormat: "parquet,geojson" }).length, 1);
  assert.equal(search([record], { ...filters, reviewLocale: "requested" }).length, 0);
  assert.equal(search([record], { ...filters, reviewLocale: "any" }).length, 1);
  for (const [localeAvailability, count] of [["available", 0], ["missing", 1], ["partial", 1], ["complete", 0]] as const) {
    assert.equal(search([record], { ...filters, localeAvailability }).length, count);
  }
  for (const locale of ["fr", "es", "ar", "zh", "ru"] satisfies SupportedLocale[]) {
    record.localizations[locale] = { ...record.localizations.en!, locale };
  }
  assert.equal(search([record], { localeAvailability: "complete" }).length, 1);
  assert.equal(search([record], { localeAvailability: "partial" }).length, 0);
});

test("discipline tags are independently searchable and produce localized, deduplicated filter options", () => {
  const first = node("first");
  first.properties.disciplines = ["ecology", "taxonomy"];
  const second = node("second");
  second.properties.disciplines = ["taxonomy", "marine_biology"];
  const graph = indexGraph({ nodes: [first, second, node("generalist")], edges: [], ryuRoutes: [], savedViews: [] });
  const records = buildSystemRecords(graph, "fr");
  assert.deepEqual(records.map(record => record.disciplines), [["ecology", "taxonomy"], ["taxonomy", "marine_biology"], []]);
  assert.deepEqual(getSystemFilterOptions(records, "fr").disciplines, [
    { value: "ecology", label: "Écologie" },
    { value: "marine_biology", label: "Biologie marine" },
    { value: "taxonomy", label: "Taxonomie" },
  ]);
  first.localizations.fr = { ...first.localizations.en!, locale: "fr" };
  const matches = search([first], { q: "taxonomie", locale: "fr" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].reasons[0].field, "system.disciplines");
});

test("data type search and display use canonical translations and preserve record-specific descriptions", () => {
  const record = node("taxonomy");
  record.properties.data = { descriptors: [
    { id: "type", category: "type", label: "taxonomic_records", source: null },
  ] };
  record.localizations.en!.details.data.descriptors = [{ id: "type", label: "LegacyOverrideMarker", description: "Nomenclatural evidence" }];
  const resolved = systemDataDescriptors(record, resolveNodeLocalization(record, "fr"))[0];
  assert.equal(resolved.localizedLabel, "Registres taxonomiques");
  assert.equal(resolved.description, "Nomenclatural evidence");
  const graph = indexGraph({ nodes: [record, { ...record, id: "duplicate-system" }], edges: [], ryuRoutes: [], savedViews: [] });
  assert.deepEqual(getSystemFilterOptions(buildSystemRecords(graph, "fr"), "fr").dataClaims.type, [
    { value: "taxonomic_records", label: "Registres taxonomiques" },
  ]);
  const matches = search([record], { q: "Registres taxonomiques", locale: "fr" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].reasons[0].field, "data.descriptors.type");
  assert.equal(search([record], { q: "Nomenclatural evidence" }).length, 1);
  for (const locale of supportedLocales) {
    for (const type of dataTypes) assert.notEqual(vocabularyLabel(locale, "dataTypes", type), type, `${locale}/${type}`);
  }
});

test("discipline and occurrence labels remain searchable and filterable in every language", () => {
  const record = node("catalog-fixture");
  record.properties.disciplines = ["botany"];
  record.properties.data = { descriptors: [
    { id: "occurrences", category: "type", label: "occurrence_records", source: null },
  ] };
  const graph = indexGraph({ nodes: [record], edges: [], ryuRoutes: [], savedViews: [] });
  for (const locale of supportedLocales) {
    const botany = vocabularyLabel(locale, "disciplines", "botany");
    const occurrences = vocabularyLabel(locale, "dataTypes", "occurrence_records");
    const options = getSystemFilterOptions(buildSystemRecords(graph, locale), locale);
    assert.deepEqual(options.disciplines, [{ value: "botany", label: botany }]);
    assert.deepEqual(options.dataClaims.type, [{ value: "occurrence_records", label: occurrences }]);
    for (const [q, field] of [[botany, "system.disciplines"], [occurrences, "data.descriptors.type"]]) {
      const matches = search([record], { q, locale });
      assert.equal(matches.length, 1, `${locale}/${q}`);
      assert.ok(matches[0].reasons.some(reason => reason.field === field), `${locale}/${field}`);
    }
  }
});

test("format search, details and filters use shared labels with localized descriptions", () => {
  const record = node("formatted");
  record.properties.data = { descriptors: [
    { id: "format", category: "format", label: "genbank_flatfile", source: null },
  ] };
  record.localizations.en!.details.data.descriptors = [{ id: "format", label: "LegacyOverrideMarker", description: "Annotated sequence exports" }];
  const resolved = systemDataDescriptors(record, resolveNodeLocalization(record, "fr"))[0];
  assert.equal(resolved.localizedLabel, "Fichier plat GenBank");
  assert.equal(resolved.description, "Annotated sequence exports");
  const graph = indexGraph({ nodes: [record, { ...record, id: "duplicate-system" }], edges: [], ryuRoutes: [], savedViews: [] });
  assert.deepEqual(getSystemFilterOptions(buildSystemRecords(graph, "fr"), "fr").dataClaims.format, [
    { value: "genbank_flatfile", label: "Fichier plat GenBank" },
  ]);
  assert.equal(search([record], { q: "Fichier plat GenBank", locale: "fr" })[0].reasons[0].field, "data.descriptors.format");
  assert.equal(search([record], { q: "Annotated sequence exports" }).length, 1);
  for (const locale of supportedLocales) {
    for (const format of dataFormats) {
      assert.notEqual(vocabularyLabel(locale, "dataFormats", format), format, `${locale}/${format}`);
      assert.deepEqual(readRecordSearchQuery({ dataFormat: format }).dataFormat, [format]);
    }
  }
});

test("standard search and filters use canonical IDs and shared translations", () => {
  const record = node("standardized");
  record.properties.data = { descriptors: [
    { id: "standard", category: "standard", label: "cf", source: null },
  ] };
  record.localizations.en!.details.data.descriptors = [{ id: "standard", label: "LegacyOverrideMarker", description: "NetCDF product conventions" }];
  const resolved = systemDataDescriptors(record, resolveNodeLocalization(record, "fr"))[0];
  assert.equal(resolved.localizedLabel, "Conventions climat et prévisions (CF)");
  assert.equal(resolved.description, "NetCDF product conventions");
  const graph = indexGraph({ nodes: [record, { ...record, id: "duplicate-system" }], edges: [], ryuRoutes: [], savedViews: [] });
  assert.deepEqual(getSystemFilterOptions(buildSystemRecords(graph, "fr"), "fr").dataClaims.standard, [
    { value: "cf", label: "Conventions climat et prévisions (CF)" },
  ]);
  assert.equal(search([record], { q: "Conventions climat", locale: "fr" })[0].reasons[0].field, "data.descriptors.standard");
  assert.equal(search([record], { q: "NetCDF product conventions" }).length, 1);
  for (const locale of supportedLocales) for (const standard of dataStandards) {
    assert.notEqual(vocabularyLabel(locale, "dataStandards", standard), standard, `${locale}/${standard}`);
    assert.deepEqual(readRecordSearchQuery({ dataStandard: standard }).dataStandard, [standard]);
  }
});

test("route matching respects DTO visibility and route filters", () => {
  const record = node("routed");
  const route: RyuRoute = { id: "route", nodeId: record.id, status: "active", mode: "live_api", priority: 1,
    target: "secretEndpointMarker", upstream: "privateUpstreamMarker", capabilities: ["download"], format: "netcdf",
    contractRef: null, caveat: null, properties: {}, createdAt: "2026-09-07", updatedAt: "2026-09-07" };
  const graph = indexGraph({ nodes: [record], edges: [], ryuRoutes: [route], savedViews: [] });
  for (const q of ["secretEndpointMarker", "privateUpstreamMarker"]) {
    assert.equal(searchRecords(graph, { ...readRecordSearchQuery({ q }), scope: "public" }).length, 0);
    assert.equal(searchRecords(graph, { ...readRecordSearchQuery({ q }), scope: "admin" }).length, 1);
  }
  assert.equal(search([record], { q: "download", routeStatus: "active", routeCapability: "download" }, [route]).length, 1);
  assert.equal(search([record], { routeStatus: "planned" }, [route]).length, 0);
  assert.equal(search([record], { routeCapability: "upload" }, [route]).length, 0);
});
