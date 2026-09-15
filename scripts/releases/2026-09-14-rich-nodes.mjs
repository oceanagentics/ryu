// One-time rich country and organization release. Production writes use the Record API.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mode = process.argv[2] ?? 'validate';
if (!['validate', 'apply', 'verify'].includes(mode)) {
  throw new Error('Usage: node scripts/releases/2026-09-14-rich-nodes.mjs [validate|apply|verify]');
}
if (!process.env.RYU_API_TOKEN) throw new Error('RYU_API_TOKEN is required');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const stateDirectory = path.join(root, '.release', commit, 'rich-nodes');
fs.mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
const base = process.env.RYU_API_BASE_URL ?? 'https://chm.oceanagentics.org/api/records';
const locales = ['ar', 'zh', 'en', 'fr', 'ru', 'es'];
const reviewNote = '2026-09-14 rich country and organization research pass completed.';
const headers = { Authorization: `Bearer ${process.env.RYU_API_TOKEN}`, 'Content-Type': 'application/json' };
const countries = ['can', 'deu', 'jpn', 'usa'].map((id) =>
  JSON.parse(fs.readFileSync(path.join(root, `research/2026-09-14-rich-countries/${id}.json`), 'utf8')));
const organizations = JSON.parse(fs.readFileSync(
  path.join(root, 'research/2026-09-14-rich-organization-operators/batch.json'), 'utf8'));
const payloads = [...countries, ...organizations];

async function request(url, options = {}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, { ...options, signal: AbortSignal.timeout(60_000) });
    const body = await response.json();
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      continue;
    }
    if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url}: HTTP ${response.status} ${JSON.stringify(body)}`);
    return body;
  }
  throw new Error(`${options.method ?? 'GET'} ${url}: rate limit retries exhausted`);
}

const get = (id) => request(`${base}/${encodeURIComponent(id)}?include=localizations,edges,sources,routes,reviewHistory`, { headers });
const pick = (value, keys) => Object.fromEntries(keys.filter((key) => key in value).map((key) => [key, value[key]]));
function assertMatches(actual, expected) {
  assert.deepEqual(pick(actual.record, Object.keys(expected.record)), expected.record, `${expected.id}: record mismatch`);
  for (const [locale, localization] of Object.entries(expected.localizations ?? {})) {
    assert.deepEqual(pick(actual.localizations[locale], Object.keys(localization)), localization,
      `${expected.id}/${locale}: localization mismatch`);
  }
  for (const edge of expected.edges ?? []) {
    const actualEdge = actual.edges.find(({ id }) => id === edge.id);
    assert.deepEqual(pick(actualEdge ?? {}, Object.keys(edge)), edge, `${expected.id}/${edge.id}: edge mismatch`);
  }
}

async function validate(id, payload, recordUpdatedAt) {
  const result = await request(`${base}/${encodeURIComponent(id)}?validateOnly=true`, {
    method: 'PUT',
    headers: { ...headers, 'x-ryu-record-updated-at': recordUpdatedAt },
    body: JSON.stringify(payload),
  });
  if (!result.valid) {
    console.error(JSON.stringify({ id, validation: result }, null, 2));
    throw new Error(`${id}: validation failed`);
  }
  return result;
}

const dryRuns = [];
for (const payload of payloads) {
  const fresh = await get(payload.id);
  assert.equal(fresh.kind, payload.record.kind, `${payload.id}: node kind changed`);
  await validate(payload.id, payload, fresh.recordUpdatedAt);
  dryRuns.push({ id: payload.id, recordUpdatedAt: fresh.recordUpdatedAt, valid: true });
}
fs.writeFileSync(path.join(stateDirectory, 'dry-runs.json'), `${JSON.stringify(dryRuns, null, 2)}\n`, { mode: 0o600 });
console.log(`Validated ${payloads.length} rich-node payloads; no writes applied.`);

if (mode === 'apply') {
  const applied = [];
  for (const payload of payloads) {
    let fresh = await get(payload.id);
    try {
      assertMatches(fresh, payload);
    } catch {
      await validate(payload.id, payload, fresh.recordUpdatedAt);
      await request(`${base}/${encodeURIComponent(payload.id)}`, {
        method: 'PUT',
        headers: { ...headers, 'x-ryu-record-updated-at': fresh.recordUpdatedAt },
        body: JSON.stringify(payload),
      });
      fresh = await get(payload.id);
      assertMatches(fresh, payload);
    }
    applied.push({ id: payload.id, recordUpdatedAt: fresh.recordUpdatedAt });
    fs.writeFileSync(path.join(stateDirectory, 'applied.json'), `${JSON.stringify(applied, null, 2)}\n`, { mode: 0o600 });
  }

  for (const payload of payloads) {
    for (const locale of locales) {
      let fresh = await get(payload.id);
      const history = fresh.localizations[locale]?.review?.history ?? [];
      if (history.some((entry) => entry.state === 'agent_researched' && entry.note === reviewNote)) continue;
      const review = { locale, reviewState: 'agent_researched', reviewerNote: reviewNote };
      await request(`${base}/${encodeURIComponent(payload.id)}/review?validateOnly=true`, {
        method: 'PATCH', headers: { ...headers, 'x-ryu-record-updated-at': fresh.recordUpdatedAt }, body: JSON.stringify(review),
      });
      fresh = await get(payload.id);
      await request(`${base}/${encodeURIComponent(payload.id)}/review`, {
        method: 'PATCH', headers: { ...headers, 'x-ryu-record-updated-at': fresh.recordUpdatedAt }, body: JSON.stringify(review),
      });
    }
  }
}

if (mode !== 'validate') {
  for (const payload of payloads) {
    const fresh = await get(payload.id);
    assertMatches(fresh, payload);
    for (const locale of locales) {
      const history = fresh.localizations[locale]?.review?.history ?? [];
      assert.ok(history.some((entry) => entry.state === 'agent_researched' && entry.note === reviewNote),
        `${payload.id}/${locale}: research review event missing`);
    }
  }
  const verification = { verifiedAt: new Date().toISOString(), records: payloads.length, locales: payloads.length * locales.length };
  fs.writeFileSync(path.join(stateDirectory, 'verification.json'), `${JSON.stringify(verification, null, 2)}\n`, { mode: 0o600 });
  console.log(`Verified ${verification.records} rich records and ${verification.locales} research review events.`);
}
