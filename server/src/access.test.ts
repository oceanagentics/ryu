import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { isAccessUrl } from "../../shared/domain";
import { validateRecordQuality } from "./recordContracts";

const fixture = () => JSON.parse(fs.readFileSync(new URL("./fixtures/rich-record.json", import.meta.url), "utf8"));

test("read and write access require evidence, typed conditions and all six translations at every depth", () => {
  const mutations: [string, (input: ReturnType<typeof fixture>, path: any) => void][] = [
    ["methods", (_, p) => { p.methods = ["web_ui"]; }],
    ["methods", (_, p) => { p.methods = p.type === "write" ? ["download"] : ["upload"]; }],
    ["type", (_, p) => { p.type = "submit"; }],
    ["type", (_, p) => { p.type = "partner_sync"; }],
    ["source", (_, p) => { p.source = p.sourceRefs[0]; }],
    ["methods", (_, p) => { p.methods = []; }],
    ["methods", (_, p) => { p.methods = ["browse", "browse"]; }],
    ["requirements", (_, p) => { delete p.requirements; }],
    ["requirements", (_, p) => { p.requirements = ["free"]; }],
    ["requirements", (_, p) => { p.requirements = ["account", "account"]; }],
    ["cost", (_, p) => { p.cost = null; }],
    ["sourceRefs", (_, p) => { p.sourceRefs = []; }],
    ["sourceRefs", (_, p) => { p.sourceRefs = ["missing"]; }],
    ["sourceRefs", (_, p) => { p.sourceRefs.push(p.sourceRefs[0]); }],
    ["method", (_, p) => { p.method = "api"; }],
    ["url", (_, p) => { p.url = "javascript:alert(1)"; }],
    ["access", (r, p) => { r.record.properties.access.push({ ...p }); }],
    ["localizations.fr.details.access", (r) => { r.localizations.fr.details.access = []; }],
    ["localizations.fr.details.access", (r) => { r.localizations.fr.details.access.push(null); }],
    ["description", (r, p) => { r.localizations.en.details.access.find((row: any) => row.id === p.id).description = ""; }],
    ["instructions", (r, p) => { r.localizations.en.details.access.find((row: any) => row.id === p.id).instructions = "legacy"; }],
    ["localizations.es.details.access", (r) => { r.localizations.es.details.access.push({ id: "orphan", label: "Orphan", description: "Orphan" }); }],
  ];
  for (const direction of ["read", "write"]) for (const depth of ["stub", "thin", "rich"]) {
    const valid = fixture();
    valid.record.recordDepth = depth;
    const index = direction === "write" ? 1 : 0;
    valid.localizations.en.details.researchGaps.access = "An additional provider endpoint has not been verified.";
    const path = valid.record.properties.access[index];
    for (const requirements of [null, [], ["account", "api_key"]]) {
      path.requirements = requirements;
      path.methods = direction === "write" ? ["form", "upload", "api", "software", "request", "harvest"] : ["browse", "download", "api"];
      const result = validateRecordQuality(valid.id, valid);
      assert.equal(result.valid, true, JSON.stringify(result.issues));
    }
    for (const [field, mutate] of mutations) {
      const input = structuredClone(valid);
      mutate(input, input.record.properties.access[index]);
      const result = validateRecordQuality(input.id, input);
      assert.equal(result.valid, false, `${depth}: ${field}`);
      assert.ok(result.issues.some(issue => issue.path?.includes(field)), JSON.stringify(result.issues));
    }
  }
});

test("access locations allow machine addresses and templates without executable schemes or embedded credentials", () => {
  for (const value of ["https://example.org/{z}/{x}/{y}.png", "ftp://example.org/data", "sftp://example.org/data", "rsync://example.org/module", "s3://bucket/prefix", "gs://bucket/prefix"]) assert.ok(isAccessUrl(value), value);
  for (const value of ["", "https:", "/relative", "javascript:alert(1)", "data:text/html,test", "file:///etc/passwd", "https://user:secret@example.org", "https://example.org/a b", "https://example.org\n"]) assert.equal(isAccessUrl(value), false, value);
});
