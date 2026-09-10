import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { affectedServices, dataIssues, revisionCommit } from './deploy.mjs';

const all = ['explorer', 'explorer-admin', 'explorer-api'];
const fixture = () => {
  const record = JSON.parse(fs.readFileSync(new URL('../server/src/fixtures/rich-record.json', import.meta.url)));
  return { nodes: [{ id: record.id, ...record.record, localizations: record.localizations }], edges: record.edges, ryuRoutes: record.routes };
};

test('UI changes omit API; runtime, shared contracts and dependencies include every service', () => {
  assert.deepEqual(affectedServices(['client/src/app/components/LegendPanel.tsx']), all.slice(0, 2));
  for (const file of ['server/src/server.ts', 'shared/domain.ts', 'package-lock.json', 'client/package.json', 'Dockerfile', 'cloudbuild.yaml']) {
    assert.deepEqual(affectedServices([file]), all, file);
  }
});

test('the entire deployed-to-target diff determines scope, including older pending server changes', () => {
  assert.deepEqual(affectedServices(['server/src/recordContracts.ts', 'client/src/app/components/LegendPanel.tsx']), all);
  assert.deepEqual(affectedServices(['documentation/cloud-run-migration.md', 'research/batch/data.json', 'AGENTS.md', '.github/workflows/deploy.yml', 'scripts/deploy.mjs', 'client/public/bootstrap.public.json']), []);
  assert.deepEqual(affectedServices(['unexpected-runtime.config']), all);
});

test('revision provenance uses the serving revision label or an explicit image commit tag', () => {
  const commit = 'a'.repeat(40);
  assert.equal(revisionCommit({ metadata: { labels: { 'release-commit': commit } }, spec: { containers: [{ image: 'example:123abcd' }] } }), commit);
  assert.equal(revisionCommit({ spec: { containers: [{ image: 'example:123abcd' }] } }), '123abcd');
  assert.equal(revisionCommit({ metadata: { name: 'explorer-fake-123abcd' }, spec: { containers: [{ image: `example@sha256:${'b'.repeat(64)}` }] } }), null);
});

test('preflight rejects malformed graph responses and accepts the complete current record contract', () => {
  assert.throws(() => dataIssues({ nodes: [], edges: [] }), /empty or malformed/);
  assert.throws(() => dataIssues({ error: 'unauthorized' }), /empty or malformed/);
  assert.deepEqual(dataIssues(fixture()), []);
});

test('preflight catches the pending metrics, access and standards migrations before any builds', () => {
  const metrics = fixture();
  metrics.nodes[0].properties.usage = [];
  assert.ok(dataIssues(metrics).some(issue => issue.path === 'record.properties.usage'));
  const access = fixture();
  access.nodes[0].properties.access[0].type = 'submit';
  delete access.nodes[0].properties.access[0].methods;
  assert.ok(dataIssues(access).some(issue => issue.path?.includes('access')));
  const standards = fixture();
  standards.nodes[0].properties.data.descriptors.push({ id: 'unapproved', category: 'standard', label: 'made_up_standard' });
  assert.ok(dataIssues(standards).some(issue => issue.path?.includes('descriptors')));
});
