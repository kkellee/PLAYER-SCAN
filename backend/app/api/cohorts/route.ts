import {env} from 'cloudflare:workers';
const headers={'Access-Control-Allow-Origin':'https://kkellee.github.io','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','Vary':'Origin'};
const json=(x:any,status=200)=>Response.json(x,{status,headers});
const brackets=['HERALD_GUARDIAN','CRUSADER_ARCHON','LEGEND_ANCIENT','DIVINE_IMMORTAL'];
const query=`query Cohorts($heroes:[Short],$brackets:[RankBracketBasicEnum],$positions:[MatchPlayerPositionType]){heroStats{stats(heroIds:$heroes,bracketBasicIds:$brackets,positionIds:$positions,groupByPosition:true,groupByBracket:true,groupByTime:true){heroId week time position bracketBasicIds matchCount remainingMatchCount kills deaths assists goldPerMinute xp cs heroDamage towerDamage healingAllies campsStacked stunDuration}}}`;
export async function OPTIONS(){return new Response(null,{status:204,headers});}
export async function POST(request:Request){
 const e=env as unknown as Record<string,any>,now=Math.floor(Date.now()/1000);let key:string|undefined;
 try{
  const raw=await request.text();if(raw.length>1500)return json({error:'Слишком большой запрос'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Некорректный запрос'},400);}
  if(!brackets.includes(body.bracket)||!Array.isArray(body.heroes)||!body.heroes.length||body.heroes.length>20||body.heroes.some((x:any)=>!Number.isInteger(x)||x<1||x>200)||!Array.isArray(body.positions)||!body.positions.length||body.positions.length>5||body.positions.some((x:any)=>!/^POSITION_[1-5]$/.test(x)))return json({error:'Некорректные фильтры'},400);
  const heroes=[...new Set(body.heroes)].sort(),positions=[...new Set(body.positions)].sort();
  key='cohort:v2:'+body.bracket+':'+heroes.join(',')+':'+positions.join(',');
  const hit=await e.DB.prepare('SELECT value FROM scan_cache WHERE key=? AND expires>?').bind(key,now).first();if(hit)return json(JSON.parse(hit.value));
  if(!e.STRATZ_API_TOKEN)return json({error:'Сравнение недоступно'},503);
  const lock=await e.DB.prepare('INSERT INTO scan_jobs(id,value,expires,lease) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires,lease=excluded.lease WHERE expires<? RETURNING id').bind(key,'{}',now+35,now+35,now).first();if(!lock){key=undefined;return json({error:'Выборка загружается'},409);}
  for(const [seconds,max] of [[60,20],[86400,1500]]){const row=await e.DB.prepare('INSERT INTO scan_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind('cohort:'+seconds+':'+Math.floor(now/seconds),now+seconds*2,max).first();if(!row)return json({error:'Лимит сравнений'},429);}
  const r=await fetch('https://api.stratz.com/graphql',{method:'POST',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+e.STRATZ_API_TOKEN,'User-Agent':'STRATZ_API','graphql-require-preflight':'1'},body:JSON.stringify({query,variables:{heroes,positions,brackets:[body.bracket]}})});
  if(!r.ok)return json({error:'Выборка временно недоступна'},503);const data:any=await r.json();if(data.errors?.length)return json({error:'Выборка недоступна'},503);
  const result={bracket:body.bracket,generatedAt:new Date().toISOString(),rows:data.data?.heroStats?.stats||[]};
  await e.DB.prepare('INSERT INTO scan_cache(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires').bind(key,JSON.stringify(result),now+21600).run();return json(result);
 }catch{return json({error:'Сравнение временно недоступно'},503);}
 finally{if(key)await e.DB.prepare('DELETE FROM scan_jobs WHERE id=?').bind(key).run();}
}
