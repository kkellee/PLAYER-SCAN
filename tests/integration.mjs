import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:5173';
const request=async(path,options)=>{const r=await fetch(origin+path,options);const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;};
let j=await request('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:'86745912'})});
for(let i=0;!j.report&&i<12;i++){j=await request('/api/scan?id=86745912');console.log('progress',j.progress??'complete');if(j.retryAfter===30)throw new Error('Upstream quota exhausted');}
assert.ok(j.report,'report returned');assert.equal(j.report.accountId,86745912);assert.equal(j.report.coverage.found,20);assert.ok(j.report.coverage.details>0);assert.ok(j.report.matches.some(m=>m.metrics.length));
fs.writeFileSync(new URL('../../../work/report-live.json',import.meta.url),JSON.stringify(j.report));
const start=performance.now();const cached=await request('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input:'76561198047011640'})});assert.equal(cached.report.generatedAt,j.report.generatedAt);console.log(JSON.stringify({coverage:j.report.coverage,verdict:j.report.verdict,cachedMs:Math.round(performance.now()-start)}));
for(const input of ['0','https://evil.com/id/test','https://steamcommunity.com/id/test']){const r=await fetch(origin+'/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({input})});assert.ok(r.status>=400);console.log('invalid/unsupported',r.status);}
const preflight=await fetch(origin+'/api/scan',{method:'OPTIONS',headers:{Origin:'https://kkellee.github.io'}});assert.equal(preflight.headers.get('access-control-allow-origin'),'https://kkellee.github.io');console.log('integration passed');
