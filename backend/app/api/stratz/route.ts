import { env } from 'cloudflare:workers';
import { validateRequest, QUERY, normalize } from '../../../lib/stratz.mjs';
const headers={'Access-Control-Allow-Origin':'https://kkellee.github.io','Access-Control-Allow-Methods':'POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type','Cache-Control':'no-store','Vary':'Origin'};
const json=(value:any,status=200)=>Response.json(value,{status,headers});
const now=()=>Math.floor(Date.now()/1000);
class Failure extends Error { constructor(message:string,public status=503){super(message);} }
export async function OPTIONS(){return new Response(null,{status:204,headers});}
export async function POST(request:Request){
  const e=env as unknown as Record<string,any>, db=e.DB;
  let lease:string|undefined;
  try {
    if(!db||!e.STRATZ_API_TOKEN)throw new Failure('STRATZ пока не настроен.');
    if(Number(request.headers.get('content-length')||0)>1024)return json({error:'Запрос слишком большой.'},413);
    const raw=await request.text();if(raw.length>1024)return json({error:'Запрос слишком большой.'},413);
    let input;try{input=validateRequest(JSON.parse(raw));}catch{return json({error:'Нужны числовой Dota ID и от 1 до 20 номеров матчей.'},400);}
    const {id,ids}=input;
    const read=async(key:string)=>{const row=await db.prepare('SELECT value FROM scan_cache WHERE key=? AND expires>?').bind(key,now()).first();return row?JSON.parse(row.value):null;};
    const write=async(key:string,value:any,ttl:number)=>db.prepare('INSERT INTO scan_cache(key,value,expires) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,expires=excluded.expires').bind(key,JSON.stringify(value),now()+ttl).run();
    const quota=async(key:string,max:number,ttl:number)=>{const r=await db.prepare('INSERT INTO scan_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(key,now()+ttl,max).first();if(!r)throw new Failure('Лимит STRATZ временно исчерпан. Отчёт OpenDota доступен.',429);};
    const key='stratz:v1:'+id+':'+ids.join(',');
    const hit=await read(key);if(hit)return json({...hit,cacheHit:true});
    if(await read('stratz:cooldown'))throw new Failure('STRATZ попросил подождать. Отчёт OpenDota доступен.',429);
    const ip=request.headers.get('cf-connecting-ip')||'unknown';
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+Math.floor(now()/86400))))).map(x=>x.toString(16).padStart(2,'0')).join('');
    await quota('sz:client:'+digest+':'+Math.floor(now()/60),10,120);
    const lock=await db.prepare('INSERT INTO scan_jobs(id,value,expires,lease) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires,lease=excluded.lease WHERE expires<? RETURNING id').bind(key,'{}',now()+45,now()+45,now()).first();
    if(!lock)throw new Failure('Этот отчёт STRATZ уже загружается. Повтори через несколько секунд.',409);
    lease=key;
    for(const [seconds,max] of [[1,15],[60,200],[3600,1800],[86400,8000]])await quota('sz:'+seconds+':'+Math.floor(now()/seconds),max,seconds*2);
    const response=await fetch('https://api.stratz.com/graphql',{method:'POST',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json','Authorization':'Bearer '+e.STRATZ_API_TOKEN,'User-Agent':'STRATZ_API','graphql-require-preflight':'1'},body:JSON.stringify({query:QUERY,variables:{id,ids}})});
    if(response.status===429){const retry=Number(response.headers.get('retry-after'));await write('stratz:cooldown',true,Math.min(86400,Math.max(120,retry||0)));throw new Failure('STRATZ ограничил частоту запросов. Данные OpenDota сохранены.',429);}
    if(!response.ok)throw new Failure('STRATZ временно не вернул данные. Данные OpenDota доступны.');
    const result=normalize(await response.json(),id,ids);
    await write(key,result,1800);
    // Bounded cleanup: expired entries only, no full-table scan/delete in one request.
    await db.batch([
      db.prepare('DELETE FROM scan_limits WHERE key IN (SELECT key FROM scan_limits WHERE expires<? LIMIT 50)').bind(now()),
      db.prepare('DELETE FROM scan_cache WHERE key IN (SELECT key FROM scan_cache WHERE expires<? LIMIT 20)').bind(now())
    ]);
    return json({...result,cacheHit:false});
  }catch(error){return json({error:error instanceof Failure?error.message:'STRATZ временно недоступен. Отчёт OpenDota доступен.'},error instanceof Failure?error.status:503);}
  finally {if(lease)await db.prepare('DELETE FROM scan_jobs WHERE id=?').bind(lease).run();}
}
