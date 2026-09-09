import assert from "node:assert/strict";
import { test } from "node:test";
import type { GraphNode, GraphNodeKind, RyuRoute, SupportedLocale } from "../../shared/domain";
import { dataTypes } from "../../shared/domain";
import { facetLabel } from "../../shared/i18n";
import { indexGraph } from "../../shared/indexGraph";
import { emptyLocalizationDetails, resolveNodeLocalization, supportedLocales } from "../../shared/localization";
import { systemDataDescriptors } from "../../shared/recordDisplay";
import { buildSystemRecords, getSystemFilterOptions } from "../../shared/searchPresentation";
import { readRecordSearchQuery } from "./recordContracts";
import { searchRecords } from "./recordSearch";

function node(id: string, kind: GraphNodeKind = "system", title = id): GraphNode {
  return {
    id, kind, countryCode: null, subtype: null, url: null, recordDepth: "stub",
    createdAt: "2026-09-07", updatedAt: "2026-09-07", properties: {}, availableLocales: ["en"], requestedLocale: "en", displayLocale: "en", isLocaleFallback: false,
    localizations: { en: { locale: "en", title, summary: null, description: null,
      details: emptyLocalizationDetails(), translatedFromLocale: null, contentUpdatedAt: "2026-09-07",
      review: { state: "agent_researched", note: null, reviewer: null, date: null },
      createdAt: "2026-09-07", updatedAt: "2026-09-07",
    } },
  };
}

function search(nodes: GraphNode[], input: Record<string, unknown>, routes: RyuRoute[] = []) {
  return searchRecords(indexGraph({ nodes, edges: [], sources: [], ryuRoutes: routes, savedViews: [] }), readRecordSearchQuery(input));
}

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
  record.countryCode = "CAN";
  record.recordDepth = "rich";
  record.properties = { disciplines: ["ecology", "taxonomy"], geographicScope: "Global",
    access: [{ id: "api", type: "read", method: "api", url: "https://example.org", source: { id: "src-api", url: "https://example.org" } }],
    data: { recordCount: null, storageSize: null, descriptors: [
      { id: "type", category: "type", label: "occurrence_records", source: { id: "src-api", url: "https://example.org" } },
      { id: "format", category: "format", label: "geojson", source: { id: "src-api", url: "https://example.org" } },
      { id: "standard", category: "standard", label: "dwc", source: { id: "src-api", url: "https://example.org" } },
    ] },
  };
  const filters = { kind: "system", countryCode: "USA,CAN", disciplines: "ecology,genetics",
    geography: "CAN", dataType: "occurrence_records", dataFormat: "geojson", dataStandard: "dwc", recordDepth: "rich",
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
  for (const key of ["countryCode", "geography", "dataFormat", "dataStandard", "accessType", "accessMethod"]) {
    assert.equal(search([record], { ...filters, [key]: "not-a-match" }).length, 0, key);
  }
  assert.equal(search([record], { ...filters, accessType: "api" }).length, 0);
  assert.equal(search([record], { ...filters, dataType: "sequence_data" }).length, 0);
  assert.equal(search([record], { ...filters, dataType: "sequence_data,occurrence_records" }).length, 1);
  assert.throws(() => readRecordSearchQuery({ dataType: "geojson" }), /dataType/);
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
  const graph = indexGraph({ nodes: [first, second, node("generalist")], edges: [], sources: [], ryuRoutes: [], savedViews: [] });
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
  record.properties.data = { recordCount: null, storageSize: null, descriptors: [
    { id: "type", category: "type", label: "taxonomic_records", source: null },
  ] };
  record.localizations.en!.details.data.descriptors = [{ id: "type", label: "LegacyOverrideMarker", description: "Nomenclatural evidence" }];
  const resolved = systemDataDescriptors(record, resolveNodeLocalization(record, "fr"))[0];
  assert.equal(resolved.localizedLabel, "Registres taxonomiques");
  assert.equal(resolved.description, "Nomenclatural evidence");
  const graph = indexGraph({ nodes: [record, { ...record, id: "duplicate-system" }], edges: [], sources: [], ryuRoutes: [], savedViews: [] });
  assert.deepEqual(getSystemFilterOptions(buildSystemRecords(graph, "fr"), "fr").dataClaims.type, [
    { value: "taxonomic_records", label: "Registres taxonomiques" },
  ]);
  const matches = search([record], { q: "Registres taxonomiques", locale: "fr" });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].reasons[0].field, "data.descriptors.type");
  assert.equal(search([record], { q: "Nomenclatural evidence" }).length, 1);
  for (const locale of supportedLocales) {
    for (const type of dataTypes) assert.notEqual(facetLabel(locale, "descriptorLabel", type), type, `${locale}/${type}`);
  }
});

test("route matching respects DTO visibility and route filters", () => {
  const record = node("routed");
  const route: RyuRoute = { id: "route", nodeId: record.id, status: "active", mode: "live_api", priority: 1,
    target: "secretEndpointMarker", upstream: "privateUpstreamMarker", capabilities: ["download"], format: "netcdf",
    contractRef: null, caveat: null, properties: {}, createdAt: "2026-09-07", updatedAt: "2026-09-07" };
  const graph = indexGraph({ nodes: [record], sources: [], edges: [], ryuRoutes: [route], savedViews: [] });
  for (const q of ["secretEndpointMarker", "privateUpstreamMarker"]) {
    assert.equal(searchRecords(graph, { ...readRecordSearchQuery({ q }), scope: "public" }).length, 0);
    assert.equal(searchRecords(graph, { ...readRecordSearchQuery({ q }), scope: "admin" }).length, 1);
  }
  assert.equal(search([record], { q: "download", routeStatus: "active", routeCapability: "download" }, [route]).length, 1);
  assert.equal(search([record], { routeStatus: "planned" }, [route]).length, 0);
  assert.equal(search([record], { routeCapability: "upload" }, [route]).length, 0);
});
