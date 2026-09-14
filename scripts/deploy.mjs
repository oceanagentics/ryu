import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { validateRecordQuality } from '../server/src/recordContracts.ts';
import { localizationContentFields, recordContentFields } from '../shared/domain.ts';

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = 'chm-network', region = 'us-east4';
const registry = `${region}-docker.pkg.dev/${project}/chm-apps`;
const services = ['explorer', 'explorer-admin', 'explorer-api'];
const repository = service => service === 'explorer' ? 'explorer-public' : service;
const base = 'https://chm.oceanagentics.org';

export function affectedServices(files) {
  const affected = new Set();
  for (const file of files) {
    if (/^(documentation\/|research\/|\.github\/|scripts\/|\.release\/)/.test(file) || /(^|\/)([^/]*\.md|[^/]*\.test\.[^/]+)$/.test(file)) continue;
    if (file === 'client/public/bootstrap.public.json') continue; // Export only; Postgres is canonical.
    const targets = file.startsWith('client/') && !/^client\/package(-lock)?\.json$/.test(file)
      ? services.slice(0, 2) : services;
    targets.forEach(service => affected.add(service));
  }
  return services.filter(service => affected.has(service));
}

export function revisionCommit(revision) {
  const container = revision.spec?.containers?.[0];
  if (container?.command?.length || container?.args?.length) return null; // Maintenance is not the app, even with the same image label.
  const label = revision.metadata?.labels?.['release-commit'];
  const imageTag = container?.image?.match(/:([a-f0-9]{7,40})$/)?.[1];
  return /^[a-f0-9]{40}$/.test(label ?? '') ? label : imageTag ?? null;
}

export function dataIssues(graph) {
  if (!Array.isArray(graph.nodes) || !graph.nodes.length || !Array.isArray(graph.edges)) throw Error('Canonical graph response is empty or malformed');
  return graph.nodes.flatMap(node => validateRecordQuality(node.id, {
    record: Object.fromEntries(recordContentFields[node.kind].filter(field => field in node).map(field => [field, node[field]])),
    localizations: Object.fromEntries(Object.entries(node.localizations ?? {}).map(([locale, localization]) =>
      [locale, Object.fromEntries(localizationContentFields[node.kind].filter(field => field in localization).map(field => [field, localization[field]]))])),
    edges: graph.edges.filter(edge => edge.sourceNodeId === node.id || edge.targetNodeId === node.id),
    routes: (graph.ryuRoutes ?? []).filter(route => route.nodeId === node.id),
  }).issues);
}

async function run(command, args) {
  try { return (await exec(command, args, { cwd: root, maxBuffer: 8 * 1024 * 1024 })).stdout.trim(); }
  catch (error) { throw Error(`${command} ${args.slice(0, 3).join(' ')} failed: ${error.stderr || error.message}`); }
}
const cloud = args => run('gcloud', [...args, '--project', project, '--region', region]);
const cloudJson = async args => JSON.parse(await cloud([...args, '--format=json']));
export function missingCloudResource(message) {
  return !/PERMISSION_DENIED|UNAUTHENTICATED|permission|reauth|credentials/i.test(message) && /NOT_FOUND|Cannot find revision \[|was not found|does not exist|not found/i.test(message);
}
async function optionalCloud(args) {
  try { return await cloudJson(args); }
  catch (error) { if (missingCloudResource(error.message)) return null; throw error; }
}
async function together(tasks) {
  const results = await Promise.allSettled(tasks);
  const failures = results.filter(result => result.status === 'rejected');
  if (failures.length) throw new AggregateError(failures.map(result => result.reason), failures.map(result => result.reason.message).join('\n'));
  return results.map(result => result.value);
}
async function json(url, headers = {}) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`${url.split('?')[0]} returned HTTP ${response.status}`);
  return response.json();
}
async function readGraph() {
  if (!process.env.RYU_API_TOKEN) return json(`${base}/explorer/api/graph/bootstrap`);
  const records = [];
  let cursor;
  do {
    const query = new URLSearchParams({ limit: '100', include: 'localizations,edges,sources,routes', ...(cursor ? { cursor } : {}) });
    const page = await json(`${base}/api/records?${query}`, { Authorization: `Bearer ${process.env.RYU_API_TOKEN}` });
    records.push(...page.records); cursor = page.nextCursor;
  } while (cursor);
  return { nodes: records.map(record => ({ ...record.record, localizations: record.localizations })),
    edges: [...new Map(records.flatMap(record => record.edges).map(edge => [edge.id, edge])).values()],
    ryuRoutes: records.flatMap(record => record.routes) };
}
async function smoke() {
  for (const [url, statuses, headers, errorCode] of [
    [`${base}/explorer/`, [200]], [`${base}/explorer/admin`, [302]],
    [`${base}/api/records`, [401], {}, 'missing_bearer_token'],
    [`${base}/api/records`, [403], { Authorization: 'Bearer invalid' }, 'invalid_bearer_token'],
  ]) {
    const response = await fetch(url, { headers, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    if (!statuses.includes(response.status) || (errorCode && !(await response.text()).includes(errorCode))) throw Error(`Smoke check failed: ${url} (${response.status})`);
  }
  const issues = dataIssues(await json(`${base}/explorer/api/graph/bootstrap`));
  if (issues.length) throw Error(`Public graph smoke check found ${issues.length} data contract issues`);
  console.log('Smoke checks passed: public page/data, admin IAP, and API authentication.');
}

export async function main(mode = 'publish') {
  if (!['plan', 'prepare', 'publish', 'smoke'].includes(mode)) throw Error('Usage: ./scripts/deploy.sh [plan|prepare|publish|smoke]');
  if (mode === 'smoke') return smoke();
  if (mode !== 'plan' && await run('git', ['status', '--porcelain'])) throw Error('Commit working-tree changes before preparing or publishing an image.');
  const commit = await run('git', ['rev-parse', 'HEAD']);
  const directory = path.join(root, '.release', commit);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const statePath = path.join(directory, 'state.json');
  const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath)) : { commit, builds: {}, images: {}, revisions: {} };
  delete state.error;
  const save = () => fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  const startingRevisions = {};
  try {
    const targets = (await together(services.map(async service => {
      const current = await cloudJson(['run', 'services', 'describe', service]);
      const traffic = current.status.traffic.filter(entry => entry.percent > 0);
      if (traffic.length !== 1 || traffic[0].percent !== 100) throw Error(`${service} has split traffic; finish that rollout first.`);
      startingRevisions[service] = traffic[0].revisionName;
      const revision = await cloudJson(['run', 'revisions', 'describe', traffic[0].revisionName]);
      const deployedCommit = revisionCommit(revision);
      let files = ['Dockerfile']; // Unknown provenance conservatively rebuilds the service.
      if (deployedCommit) {
        try { files = (await run('git', ['diff', '--name-only', deployedCommit, ...(mode === 'plan' ? [] : [commit])])).split('\n').filter(Boolean); }
        catch { console.log(`${service}: deployed commit is unavailable locally; rebuilding conservatively.`); }
      }
      console.log(`${service}: ${deployedCommit ?? 'unknown source commit'} → ${commit.slice(0, 12)} (${affectedServices(files).includes(service) ? 'update' : 'unchanged'})`);
      return affectedServices(files).includes(service) ? service : null;
    }))).filter(Boolean);
    state.targets = targets;
    if (!targets.length) { console.log('No runtime changes to publish.'); state.status = 'unchanged'; save(); return; }
    state.dataIssues = dataIssues(await readGraph());
    state.status = state.dataIssues.length ? 'migration_required' : 'planned';
    save();
    if (state.dataIssues.length) {
      console.log(`${state.dataIssues.length} data contract issues; migration required before publishing. Details: ${statePath}`);
      console.log(state.dataIssues.slice(0, 3).map(issue => `${issue.recordId}: ${issue.path} — ${issue.message}`).join('\n'));
      if (mode !== 'prepare') throw Error('Stopped before building or changing traffic. Use prepare to stage images for a coordinated migration.');
    }
    if (mode === 'plan') return;
    const imageFor = service => `${registry}/${repository(service)}:${commit}`;
    async function digest(service) {
      try {
        const raw = await run('gcloud', ['artifacts', 'docker', 'images', 'describe', imageFor(service), '--project', project, '--format=value(image_summary.digest)']);
        if (!/^sha256:[a-f0-9]{64}$/.test(raw)) throw Error(`Invalid image digest for ${service}`);
        return `${registry}/${repository(service)}@${raw}`;
      } catch (error) { if (missingCloudResource(error.message)) return null; throw error; }
    }
    await together(targets.map(async service => { state.images[service] = await digest(service); }));
    async function build(key, config, substitutions) {
      let build = state.builds[key] ? await cloudJson(['builds', 'describe', state.builds[key]]) : null;
      if (!build || !['QUEUED', 'WORKING'].includes(build.status)) {
        console.log(`Starting ${key} build.`);
        const id = await cloud(['builds', 'submit', '.', '--config', config, '--substitutions', `_SOURCE_COMMIT=${commit},${substitutions}`, '--async', '--format=value(id)']);
        state.builds[key] = id; save();
        build = { id, status: 'QUEUED' };
      }
      while (['QUEUED', 'WORKING'].includes(build.status)) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        build = await cloudJson(['builds', 'describe', build.id]);
      }
      if (build.status !== 'SUCCESS') throw Error(`${key} build ${build.id}: ${build.status}`);
      console.log(`${key} build succeeded (${build.id}).`);
    }
    const pending = [];
    if (targets.some(service => service !== 'explorer-api' && !state.images[service])) pending.push(build('web', 'cloudbuild.release.yaml', `_PUBLIC_IMAGE=${imageFor('explorer')},_PUBLIC_CACHE_IMAGE=${registry}/explorer-public:latest,_ADMIN_IMAGE=${imageFor('explorer-admin')},_ADMIN_CACHE_IMAGE=${registry}/explorer-admin:latest`));
    if (targets.includes('explorer-api') && !state.images['explorer-api']) pending.push(build('api', 'cloudbuild.yaml', `_TARGET=api,_IMAGE=${imageFor('explorer-api')},_CACHE_IMAGE=${registry}/explorer-api:latest`));
    await together(pending);
    await together(targets.map(async service => {
      state.images[service] = await digest(service);
      if (!state.images[service]) throw Error(`Missing built image for ${service}`);
      const name = `${service}-release-${commit.slice(0, 12)}`;
      const existing = await optionalCloud(['run', 'revisions', 'describe', name]);
      if (existing && existing.status.imageDigest !== state.images[service]) throw Error(`${name} exists with a different image`);
      if (!existing) {
        console.log(`Preparing ${service} without production traffic.`);
        await cloud(['run', 'deploy', service, '--image', state.images[service], '--revision-suffix', `release-${commit.slice(0, 12)}`, '--labels', `release-commit=${commit}`, '--command=', '--args=', '--no-traffic', '--quiet']);
      }
      const ready = existing ?? await cloudJson(['run', 'revisions', 'describe', name]);
      if (!ready.status.conditions?.some(condition => condition.type === 'Ready' && condition.status === 'True')) throw Error(`${name} is not ready; inspect the revision before retrying.`);
      state.revisions[service] = name; save();
    }));
    state.status = 'prepared'; save();
    if (mode === 'prepare') { console.log(`Prepared ${targets.length} services; production traffic unchanged. Resume with ./scripts/deploy.sh publish after the migration.`); return; }
    state.dataIssues = dataIssues(await readGraph());
    if (state.dataIssues.length) throw Error('Data changed during preparation; migration required before traffic can move.');
    await together(targets.map(async service => {
      const current = await cloudJson(['run', 'services', 'describe', service]);
      const traffic = current.status.traffic.filter(entry => entry.percent > 0);
      if (traffic.length !== 1 || traffic[0].percent !== 100 || traffic[0].revisionName !== startingRevisions[service]) throw Error(`${service} traffic changed during preparation; rerun against the current release.`);
    }));
    await together(targets.map(async service => {
      await cloud(['run', 'services', 'update-traffic', service, '--to-revisions', `${state.revisions[service]}=100`, '--quiet']);
      console.log(`Published ${service}.`);
    }));
    await smoke();
    state.status = 'published'; state.publishedAt = new Date().toISOString(); save();
  } catch (error) {
    state.error = error.message; save(); throw error;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
}
