import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { dataFormats } from "../../shared/domain";

const migration = fs.readFileSync(new URL("../schema/012_data_formats.sql", import.meta.url), "utf8");

test("format migration splits bundles, preserves citations and prose, and is safe to rerun", async () => {
  for (const source of ["official", { id: "official", url: "https://example.org" }]) {
    const db = new PGlite();
    try {
      // Exercise both citation representations so historical imports can migrate too.
      await db.exec(`
        CREATE TABLE nodes(id text PRIMARY KEY, properties_json jsonb);
        CREATE TABLE node_localizations(node_id text, locale text, description text, details_json jsonb, review_json jsonb);
      `);
      const descriptors = [
        { id: "bundle", category: "format", label: "CSV and parquet snapshots", source },
        { id: "duplicate", category: "format", label: "csv", source: null },
        { id: "interface", category: "format", label: "R / DuckDB table interface", source },
        { id: "schema", category: "format", label: "Darwin Core", source },
        { id: "vague", category: "format", label: "CSV / tabular", source: null },
        { id: "type", category: "type", label: "taxonomic_records", source },
        { id: "standard", category: "standard", label: "Unchanged standard", source },
      ];
      const cases = [
        ["fishbase", descriptors],
        ["no-profile", [descriptors[2]]],
        ["oregon-dlcd-coastal-gis", [{ id: "query", category: "format", label: "GeoJSON and PBF query output", source }]],
        ["openstreetmap-standard-raster-tiles", [{ id: "tiles", category: "format", label: "XYZ tile map images", source }]],
        ["marine-regions", [{ id: "gis", category: "format", label: "Shapefile / GIS layers", source }]],
        ["cmems-datastore", [{ id: "gis", category: "format", label: "Shapefile / GIS layers", source: null }]],
        ["bio-oracle", [{ id: "vague", category: "format", label: "Sequence archive standard", source: null }]],
        ["canonical", dataFormats.map(label => ({ id: label, category: "format", label, source }))],
        ["empty", []],
      ] as const;
      for (const [id, ds] of cases) {
        await db.query("INSERT INTO nodes VALUES ($1, $2)", [id, JSON.stringify({ custom: true, data: { recordCount: null, descriptors: ds } })]);
        for (const locale of ["en", "fr"]) {
          await db.query("INSERT INTO node_localizations VALUES ($1,$2,$3,$4,$5)", [id, locale, `${locale} profile`, JSON.stringify({
            profile: id === "no-profile" ? null : { sourceRefs: ["profile-source"] }, data: { descriptors: ds.map(d => ({ id: d.id, label: `${locale}/${d.label}`, description: `${locale}/${d.id} detail` })) },
          }), JSON.stringify({ history: [{ state: "human_reviewed" }] })]);
        }
      }
      await db.exec(migration);
      const nodes = (await db.query<{ id: string; properties_json: any }>("SELECT * FROM nodes ORDER BY id")).rows;
      const localizations = (await db.query<{ node_id: string; locale: string; description: string; details_json: any; review_json: any }>("SELECT * FROM node_localizations ORDER BY node_id, locale")).rows;
      const fish = nodes.find(n => n.id === "fishbase")!.properties_json;
      assert.deepEqual(fish, { custom: true, data: { recordCount: null, descriptors: [
        { ...descriptors[0], label: "csv" },
        { ...descriptors[0], id: "bundle--format-parquet", label: "parquet" },
        { ...descriptors[3], category: "standard" }, descriptors[5], descriptors[6],
      ] } });
      for (const [id, expected] of [["oregon-dlcd-coastal-gis", ["geojson", "pbf", "json"]], ["openstreetmap-standard-raster-tiles", ["png"]], ["marine-regions", ["shapefile"]], ["cmems-datastore", []], ["bio-oracle", []], ["canonical", dataFormats], ["empty", []]] as const) {
        assert.deepEqual(nodes.find(n => n.id === id)!.properties_json.data.descriptors.map((d: any) => d.label), expected, id);
      }
      for (const l of localizations) {
        const neutral = nodes.find(n => n.id === l.node_id)!.properties_json.data.descriptors;
        assert.deepEqual(l.details_json.data.descriptors.map((d: any) => d.id), neutral.map((d: any) => d.id));
        for (const d of neutral) {
          const translated = l.details_json.data.descriptors.find((item: any) => item.id === d.id);
          if (d.category === "format") assert.equal("label" in translated, false);
          else assert.ok(translated.label);
        }
        assert.equal(l.review_json.history[0].state, "human_reviewed");
        if (l.node_id === "fishbase") {
          assert.equal(l.description, `${l.locale} profile\n\n${l.locale}/interface detail`);
          assert.deepEqual(l.details_json.profile.sourceRefs.sort(), ["official", "profile-source"]);
          assert.equal(l.details_json.data.descriptors[1].description, `${l.locale}/bundle detail`);
        } else if (l.node_id === "no-profile") {
          assert.equal(l.description, `${l.locale} profile\n\n${l.locale}/interface detail`);
          assert.deepEqual(l.details_json.profile.sourceRefs, ["official"]);
        } else assert.equal(l.description, `${l.locale} profile`);
      }
      await db.exec(migration);
      assert.deepEqual((await db.query("SELECT * FROM nodes ORDER BY id")).rows, nodes);
      assert.deepEqual((await db.query("SELECT * FROM node_localizations ORDER BY node_id, locale")).rows, localizations);
    } finally { await db.close(); }
  }
});

test("format migration aborts without modifying records if a split would collide with an existing ID", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE TABLE nodes(id text PRIMARY KEY, properties_json jsonb);
      CREATE TABLE node_localizations(node_id text, locale text, description text, details_json jsonb);
      INSERT INTO nodes VALUES ('fishbase', '{"data":{"descriptors":[
        {"id":"bundle","category":"format","label":"CSV and parquet snapshots"},
        {"id":"bundle--format-parquet","category":"standard","label":"Keep me"}
      ]}}');
    `);
    const before = (await db.query("SELECT * FROM nodes")).rows;
    await assert.rejects(db.exec(migration), /duplicate descriptor IDs/);
    await db.exec("ROLLBACK");
    assert.deepEqual((await db.query("SELECT * FROM nodes")).rows, before);
  } finally { await db.close(); }
});
