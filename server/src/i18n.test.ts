import assert from "node:assert/strict";
import { test } from "node:test";
import { t, uiMessages, vocabularyLabel, vocabularyLabels } from "../../shared/i18n";
import { localeNames, localeNativeNames } from "../../shared/localeNames";
import { supportedLocales } from "../../shared/localization";
import { commonMessages } from "../../shared/uiMessages/common";
import { detailsMessages } from "../../shared/uiMessages/details";
import { directoryMessages } from "../../shared/uiMessages/directory";
import { graphMessages } from "../../shared/uiMessages/graph";
import { searchMessages } from "../../shared/uiMessages/search";

test("shared catalogs contain every language, nonblank text, and matching placeholders", () => {
  const catalogs = { ...vocabularyLabels, uiMessages, localeNames };
  for (const [group, catalog] of Object.entries(catalogs)) {
    for (const [id, labels] of Object.entries(catalog)) {
      assert.deepEqual(Object.keys(labels).sort(), [...supportedLocales].sort(), `${group}.${id}`);
      const placeholders = (text: string) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]))].sort();
      for (const locale of supportedLocales) {
        const text = labels[locale];
        assert.ok(text.trim(), `${group}.${id}.${locale} is blank`);
        assert.deepEqual(placeholders(text), placeholders(labels.en), `${group}.${id}.${locale} placeholders`);
      }
    }
  }
  assert.deepEqual(Object.keys(localeNativeNames).sort(), [...supportedLocales].sort());
  for (const name of Object.values(localeNativeNames)) assert.ok(name.trim());
});

test("UI messages have one owning catalog", () => {
  const keys = [commonMessages, detailsMessages, directoryMessages, searchMessages, graphMessages].flatMap(Object.keys);
  assert.equal(new Set(keys).size, keys.length, "UI message keys must not overwrite another catalog");
});

test("approved vocabulary lookups reject values from another group", () => {
  assert.throws(() => {
    // @ts-expect-error Disciplines cannot be used as data types.
    vocabularyLabel("en", "dataTypes", "botany");
  }, /Unknown dataTypes value: botany/);
  assert.throws(() => {
    // @ts-expect-error Formats cannot be used as standards.
    vocabularyLabel("en", "dataStandards", "csv");
  }, /Unknown dataStandards value: csv/);
  assert.throws(() => {
    // @ts-expect-error Unknown disciplines must not become humanized labels.
    vocabularyLabel("fr", "disciplines", "new_discipline");
  }, /Unknown disciplines value: new_discipline/);
});

test("access catalogs share translations for both directions and reject legacy values", () => {
  assert.equal(vocabularyLabel("fr", "accessMethods", "browse"), "Explorer");
  assert.equal(vocabularyLabel("fr", "accessMethods", "upload"), "Téléverser");
  assert.equal(vocabularyLabel("es", "accessTypes", "write"), "Escritura");
  assert.throws(() => {
    // @ts-expect-error Retired access types must not be humanized.
    vocabularyLabel("en", "accessTypes", "partner_sync");
  }, /Unknown accessTypes/);
  assert.equal(vocabularyLabel("es", "accessRequirements", "account"), "Cuenta obligatoria");
  assert.throws(() => {
    // @ts-expect-error A legacy mechanism is not an approved read method.
    vocabularyLabel("en", "accessMethods", "web_ui");
  }, /Unknown accessMethods/);
});
