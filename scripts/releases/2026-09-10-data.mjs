// One-time metrics/standards/access release. Production writes use the Record API.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { PGlite } from '@electric-sql/pglite';
import { validateRecordAggregateContentInput, validateRecordQuality } from '../../server/src/recordContracts.ts';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const dir=path.resolve(process.argv[3]??path.join(root,'.release',commit,'migration'));
const mode=process.argv[2]??'prepare';
if(!['prepare','validate','apply','verify'].includes(mode))throw Error('Usage: node --import tsx scripts/releases/2026-09-10-data.mjs [prepare|validate|apply|verify] [state-directory]');
if(!process.env.RYU_API_TOKEN)throw Error('RYU_API_TOKEN is required; it is never written into release state.');
fs.mkdirSync(dir,{recursive:true,mode:0o700});
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const readState=name=>read(`${dir}/${name}.json`);
const write=(name,data)=>fs.writeFileSync(`${dir}/${name}.json`,JSON.stringify(data,null,2)+'\n',{mode:0o600});
const content=r=>({record:Object.fromEntries(Object.entries(r.record).filter(([k])=>!['updatedAt','createdAt'].includes(k))),localizations:Object.fromEntries(Object.entries(r.localizations).map(([locale,l])=>[locale,Object.fromEntries(Object.entries(l).filter(([k])=>!['contentUpdatedAt','updatedAt','createdAt'].includes(k)))])),edges:r.edges,routes:r.routes});
async function readCanonicalRecords(){
 const records=[];let cursor;
 do{
  const query=new URLSearchParams({limit:'100',include:'localizations,edges,sources,routes,reviewHistory',...(cursor?{cursor}:{})});
  const response=await fetch(`https://chm.oceanagentics.org/api/records?${query}`,{headers:{Authorization:`Bearer ${process.env.RYU_API_TOKEN}`},signal:AbortSignal.timeout(60000)});
  if(!response.ok)throw Error(`Canonical record read failed: HTTP ${response.status}`);
  const page=await response.json();records.push(...page.records);cursor=page.nextCursor;
 }while(cursor);
 assert.equal(new Set(records.map(r=>r.id)).size,records.length,'Duplicate canonical records');
 return records;
}
async function prepare(){
 if(fs.existsSync(`${dir}/applied.json`)&&readState('applied').length)throw Error('This migration has applied records; resume apply or verify instead of replacing its snapshot.');
const before=await readCanonicalRecords();
write('records-before',{records:before,total:before.length});
const records=structuredClone(before);
const db=new PGlite();
await db.exec('CREATE TABLE nodes(id text PRIMARY KEY, properties_json jsonb, sources jsonb); CREATE TABLE node_localizations(node_id text, locale text, description text, details_json jsonb, review_json jsonb);');
for(const r of records){
  await db.query('INSERT INTO nodes VALUES ($1,$2,$3)',[r.id,r.record.properties,r.record.sources]);
  for(const [locale,l] of Object.entries(r.localizations)) await db.query('INSERT INTO node_localizations VALUES ($1,$2,$3,$4,$5)',[r.id,locale,l.description,l.details,l.review]);
}
const sql=fs.readFileSync(`${root}/server/schema/013_system_metrics.sql`,'utf8');
await db.exec(sql);
const metricsNodes=(await db.query('SELECT * FROM nodes ORDER BY id')).rows;
const metricsLocales=(await db.query('SELECT * FROM node_localizations ORDER BY node_id,locale')).rows;
await db.exec(sql);
assert.deepEqual((await db.query('SELECT * FROM nodes ORDER BY id')).rows,metricsNodes);
assert.deepEqual((await db.query('SELECT * FROM node_localizations ORDER BY node_id,locale')).rows,metricsLocales);
for(const r of records){
  r.record.properties=metricsNodes.find(n=>n.id===r.id).properties_json;
  for(const l of metricsLocales.filter(l=>l.node_id===r.id)){
    assert.deepEqual(r.localizations[l.locale].review,l.review_json);
    r.localizations[l.locale].description=l.description;
    r.localizations[l.locale].details=l.details_json;
  }
}
await db.close();
write('records-after-metrics',records);
const byId=new Map(records.map(r=>[r.id,r]));
function mergeSources(r,sources){
  for(const [id,source] of Object.entries(sources??{})){
    const existing=r.record.sources[id];
    if(existing) assert.equal(existing.url,source.url,`${r.id} source collision: ${id}`);
    else r.record.sources[id]=structuredClone(source);
  }
}
const standards=read(`${root}/research/2026-09-10-typed-standards/standards.json`).systems;
for(const batch of standards){
  const r=byId.get(batch.id); assert.ok(r, batch.id);
  mergeSources(r,batch.sources);
  const p=r.record.properties;
  const old=p.data.descriptors.filter(d=>d.category==='standard');
  const ids=new Set(old.map(d=>d.id));
  const descriptors=batch.standards.map(s=>({id:old.find(d=>d.label===s.label)?.id??`${r.id}-standard-${s.label}`,category:'standard',label:s.label,source:s.source}));
  p.data.descriptors=[...p.data.descriptors.filter(d=>d.category!=='standard'),...descriptors];
  for(const [locale,l] of Object.entries(r.localizations)){
    const details=l.details;
    details.data.descriptors=[...details.data.descriptors.filter(d=>!ids.has(d.id)),...descriptors.map((d,i)=>({id:d.id,description:batch.standards[i].description[locale]}))];
    if(batch.researchGap?.[locale]) details.researchGaps={...details.researchGaps,standards:batch.researchGap[locale]};
    for(const move of batch.proseMoves??[]){
      const prose=move.description[locale]; assert.ok(prose,`${r.id} missing prose ${locale}`);
      if(!l.description?.includes(prose))l.description=[l.description,prose].filter(Boolean).join('\n\n');
      details.profile={...details.profile,sourceRefs:[...new Set([...(details.profile?.sourceRefs??[]),move.source])]};
    }
  }
}
for(const direction of ['read','write']){
  const batches=read(`${root}/research/2026-09-10-${direction}-access/access.json`);
  for(const batch of batches){
    const r=byId.get(batch.nodeId); assert.ok(r,batch.nodeId); mergeSources(r,batch.sources);
    const matches=a=>direction==='read'?a.type==='read':['write','submit','partner_sync'].includes(a.type);
    const ids=new Set(r.record.properties.access.filter(matches).map(a=>a.id));
    r.record.properties.access=[...r.record.properties.access.filter(a=>!matches(a)),...structuredClone(batch.access)];
    for(const [locale,l] of Object.entries(r.localizations)){
      assert.ok(batch.localizations[locale],`${r.id} missing access ${locale}`);
      l.details.access=[...l.details.access.filter(a=>!ids.has(a.id)),...structuredClone(batch.localizations[locale])];
      if(batch.researchGaps?.[locale])l.details.researchGaps={...l.details.researchGaps,access:batch.researchGaps[locale]};
    }
  }
}
const pick=(obj,keys)=>Object.fromEntries(keys.filter(k=>k in obj).map(k=>[k,obj[k]]));
const results=[];
for(const r of records){
  const b=before.find(b=>b.id===r.id);
  assert.deepEqual(r.edges,b.edges); assert.deepEqual(r.routes,b.routes);
  assert.equal(r.record.recordDepth,b.record.recordDepth);
  for(const [locale,l] of Object.entries(r.localizations))assert.deepEqual(l.review,b.localizations[locale].review);
  for(const [id,source] of Object.entries(b.record.sources))assert.deepEqual(r.record.sources[id],source);
  const input={id:r.id,record:pick(r.record,['kind','countryCode','url','recordDepth','properties','sources']),localizations:Object.fromEntries(Object.entries(r.localizations).map(([locale,l])=>[locale,pick(l,['title','summary','description','details','translatedFromLocale'])])),edges:r.edges.map(e=>pick(e,['id','sourceNodeId','targetNodeId','kind','note','properties','sources'])),routes:r.routes.map(route=>pick(route,['id','nodeId','status','mode','priority','capabilities','target','upstream','format','contractRef','caveat','properties']))};
  const shape=validateRecordAggregateContentInput(r.id,input),quality=validateRecordQuality(r.id,input);
  results.push({id:r.id,valid:shape.valid&&quality.valid,issues:[...shape.issues,...quality.issues]});
}
write('records-after',records); write('validation',results);
const metrics=read(`${dir}/records-after-metrics.json`);
const patches=records.flatMap(r=>{
  const previous=metrics.find(m=>m.id===r.id),patch={};
  if(JSON.stringify(r.record.properties)!==JSON.stringify(previous.record.properties)||JSON.stringify(r.record.sources)!==JSON.stringify(previous.record.sources))patch.record={propertiesReplace:r.record.properties,sourcesReplace:r.record.sources};
  const localizations={};
  for(const [locale,l] of Object.entries(r.localizations)){
    const old=previous.localizations[locale],p={mode:'patch'};
    if(JSON.stringify(l.details)!==JSON.stringify(old.details))p.detailsReplace=l.details;
    if(l.description!==old.description)p.description=l.description;
    if(Object.keys(p).length>1)localizations[locale]=p;
  }
  if(Object.keys(localizations).length)patch.localizations=localizations;
  return Object.keys(patch).length?[{id:r.id,patch}]:[];
});
write('patches',patches);
const failures=results.filter(r=>!r.valid);
console.log(JSON.stringify({records:records.length,patches:patches.length,standards:records.reduce((s,r)=>s+(r.record.properties.data?.descriptors??[]).filter(d=>d.category==='standard').length,0),access:records.reduce((s,r)=>s+(r.record.properties.access?.length??0),0),preserved:['edges','routes','depth','review history','existing sources'],failures},null,2));
if(failures.length)throw Error('Prepared data has validation issues; no writes applied.');

}
async function applyRecords(){
const expected=new Map(readState('records-after-metrics').map(r=>[r.id,r]));
const after=new Map(readState('records-after').map(r=>[r.id,r]));
const patches=readState('patches');
const headers={Authorization:`Bearer ${process.env.RYU_API_TOKEN}`,'Content-Type':'application/json'};
const include='localizations,edges,sources,routes,reviewHistory';
const get=async id=>{
 const r=await fetch(`https://chm.oceanagentics.org/api/records/${encodeURIComponent(id)}?include=${include}`,{headers,signal:AbortSignal.timeout(60000)});
 const data=await r.json(); if(!r.ok)throw Error(`${id} GET ${r.status}: ${JSON.stringify(data)}`); return data;
};
const checked=[];
const applied=[];
for(const {id,patch} of patches){
 const fresh=await get(id);
 if(isDeepStrictEqual(content(fresh),content(after.get(id)))){
  applied.push({id,recordUpdatedAt:fresh.recordUpdatedAt});
  continue;
 }
 if(!isDeepStrictEqual(content(fresh),content(expected.get(id)))){
  fs.writeFileSync(`${dir}/conflict-${id}.json`,JSON.stringify({actual:content(fresh),expected:content(expected.get(id))},null,2),{mode:0o600});
  throw Error(`${id} changed since the release rehearsal; refusing to replace content`);
 }
 const r=await fetch(`https://chm.oceanagentics.org/api/records/${id}?validateOnly=true`,{method:'PATCH',headers:{...headers,'x-ryu-record-updated-at':fresh.recordUpdatedAt},body:JSON.stringify(patch),signal:AbortSignal.timeout(60000)});
 const result=await r.json();
 if(!r.ok||!result.valid){ console.log(JSON.stringify({id,status:r.status,validation:result}));throw Error(`${id} dry run failed`); }
 checked.push({id,patch,recordUpdatedAt:fresh.recordUpdatedAt});
 if(checked.length%10===0)console.log(`Validated ${checked.length}/${patches.length} records`);
}
fs.writeFileSync(`${dir}/api-dry-runs.json`,JSON.stringify(checked.map(({id,recordUpdatedAt})=>({id,recordUpdatedAt,valid:true})),null,2),{mode:0o600});
if(mode==='apply'){
 for(const {id,patch,recordUpdatedAt} of checked){
  const r=await fetch(`https://chm.oceanagentics.org/api/records/${id}`,{method:'PATCH',headers:{...headers,'x-ryu-record-updated-at':recordUpdatedAt},body:JSON.stringify(patch),signal:AbortSignal.timeout(60000)});
  const result=await r.json();
  if(!r.ok){console.log(JSON.stringify({id,status:r.status,result}));throw Error(`${id} apply failed`);}
  const fresh=await get(id);
  assert.deepEqual(content(fresh),content(after.get(id)),`${id} round-trip mismatch`);
  applied.push({id,recordUpdatedAt:fresh.recordUpdatedAt});
  fs.writeFileSync(`${dir}/applied.json`,JSON.stringify(applied,null,2),{mode:0o600});
  if(applied.length%10===0)console.log(`Applied and verified ${applied.length}/${patches.length} records`);
 }
 write('applied',applied);
}

}
async function verify(){
 const records=await readCanonicalRecords(),expected=readState('records-after');
 assert.equal(records.length,expected.length,'Record count changed');
 for(const record of records)assert.deepEqual(content(record),content(expected.find(r=>r.id===record.id)),`${record.id} changed after the migration`);
 write('records-verified',{records,total:records.length});
 write('verification',{verifiedAt:new Date().toISOString(),records:records.length,applied:readState('applied').length});
 console.log(`Verified ${records.length} canonical records, including relationships, routes, sources and reviews.`);
}
await (mode==='prepare'?prepare():mode==='verify'?verify():applyRecords());
console.log(`Migration state: ${dir}`);
