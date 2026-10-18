import assert from 'node:assert/strict';
const origin=process.env.TEST_ORIGIN||'http://127.0.0.1:8787';
const count=250,concurrency=20,times=[];let next=0,errors=0;
const start=performance.now();await Promise.all(Array.from({length:concurrency},async()=>{while(next++<count){const t=performance.now();try{const r=await fetch(origin+'/api/scan?id=86745912');const d=await r.json();if(!r.ok||!d.report)errors++;}catch{errors++;}times.push(performance.now()-t);}}));times.sort((a,b)=>a-b);console.log(JSON.stringify({requests:count,concurrency,errors,totalMs:Math.round(performance.now()-start),p50:Math.round(times[Math.floor(count*.5)]),p95:Math.round(times[Math.floor(count*.95)]),scope:'local cached reports only; not a production capacity certification'}));assert.equal(errors,0);
