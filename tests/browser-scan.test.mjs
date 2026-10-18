import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserScanner} from '../dist/browser-scan.mjs';

function harness(handler) {
  let now=Date.UTC(2026,9,18,12), calls=[];
  const data=new Map();
  const storage={get:async k=>data.get(k),set:async(k,v)=>data.set(k,v)};
  const recent=Array.from({length:20},(_,i)=>({match_id:100+i,hero_id:1,player_slot:0,radiant_win:true}));
  const fetcher=async(url,options)=>{
    calls.push({url,time:now,options});
    if(handler){const r=handler(url,calls.length);if(r)return r;}
    if(url.endsWith('/recentMatches'))return Response.json(recent);
    if(url.endsWith('/heroes'))return Response.json([{id:1,localized_name:'Anti-Mage'}]);
    if(url.includes('/matches/'))return Response.json({match_id:Number(url.split('/').pop()),version:22,game_mode:22,duration:1800,radiant_win:true,players:[{account_id:123,player_slot:0,hero_id:1,kills:4,deaths:2,assists:6,benchmarks:Object.fromEntries(['gold_per_min','xp_per_min','hero_damage_per_min'].map(k=>[k,{raw:100,pct:.7}]))}]});
    return Response.json({profile:{account_id:123,personaname:'Test'}});
  };
  const scan=createBrowserScanner({storage,fetcher,clock:()=>now,sleep:async ms=>{now+=ms;},lock:f=>f()});
  return {scan,calls,data,advance:ms=>{now+=ms;}};
}
test('20-match scan uses keyless requests, pacing, and zero requests on cached revisit',async()=>{
  const h=harness(); const report=await h.scan('123');
  assert.equal(report.coverage.details,20);assert.equal(report.coverage.scored,20);assert.equal(h.calls.length,23);
  assert.ok(h.calls.every(c=>!c.url.includes('api_key')&&c.options.credentials==='omit'));
  assert.ok(h.calls.slice(1).every((c,i)=>c.time-h.calls[i].time>=1600));
  assert.equal((await h.scan('123')).cacheHit,true);assert.equal(h.calls.length,23);
});
test('refresh reuses parsed matches, fetching only profile and recent history',async()=>{
  const h=harness();await h.scan('123');h.advance(3600001);await h.scan('123');assert.equal(h.calls.length,25);
});
test('minute 429 stops immediately and retry respects cooldown',async()=>{
  const h=harness(()=>Response.json({error:'minute rate limit exceeded'},{status:429}));
  await assert.rejects(h.scan('123'),e=>e.status===429);await assert.rejects(h.scan('123'),e=>e.status===429);assert.equal(h.calls.length,1);
});
test('daily 429 does not retry after only a minute',async()=>{
  const h=harness(()=>Response.json({error:'daily api limit exceeded'},{status:429}));
  await assert.rejects(h.scan('123'));h.advance(120000);await assert.rejects(h.scan('123'));assert.equal(h.calls.length,1);
});
test('network interruption resumes from previously saved matches',async()=>{
  let fail=true;const h=harness(url=>{if(fail&&url.endsWith('/matches/105')){fail=false;throw new TypeError('network');}});
  await assert.rejects(h.scan('123'));assert.equal(h.calls.length,8);
  assert.equal((await h.scan('123')).coverage.details,20);
  assert.equal(h.calls.filter(c=>c.url.endsWith('/matches/100')).length,1);
});
test('404 match remains explicitly unavailable',async()=>{
  const h=harness(url=>url.endsWith('/matches/100')?Response.json({error:'not found'},{status:404}):null);
  const r=await h.scan('123');assert.equal(r.coverage.details,19);assert.deepEqual(r.failures,[100]);assert.equal(r.matches[0].unavailable,true);
});
test('bad IDs and vanity links make no API requests',async()=>{
  const h=harness();for(const id of ['0','https://evil.test/123','https://steamcommunity.com/id/test'])await assert.rejects(h.scan(id));assert.equal(h.calls.length,0);
});
test('cancelled scan makes no requests',async()=>{
  const h=harness();const controller=new AbortController();controller.abort();await assert.rejects(h.scan('123',{signal:controller.signal}),e=>e.name==='AbortError');assert.equal(h.calls.length,0);
});
