import {resolveRole} from './role-analysis.mjs?v=roles-1';
const endpoint='https://player-scan.keen-krill-5922.chatgpt.site/api/cohorts';
const brackets=['HERALD_GUARDIAN','CRUSADER_ARCHON','LEGEND_ANCIENT','DIVINE_IMMORTAL'];
const labels=['Herald–Guardian','Crusader–Archon','Legend–Ancient','Divine–Immortal'];
export function rankGroup(rank){const medal=Math.floor(rank/10);return Number.isInteger(rank)&&medal>=1&&medal<=8?{id:brackets[Math.floor((medal-1)/2)],label:labels[Math.floor((medal-1)/2)]}:null;}
const fields={kills:'kills',deaths:'deaths',assists:'assists',gold_per_min:'goldPerMinute',last_hits:'cs',hero_damage:'heroDamage',tower_damage:'towerDamage',camps_stacked:'campsStacked'};
export function compareCohorts(report,data){
 const group=rankGroup(report.rank),pairs=[];if(!group||data.bracket!==group.id)return {matchedGames:0,metrics:{},reason:'Рейтинг для сравнения не определён.'};
 for(const m of report.matches.slice(0,20)){
  const role=resolveRole(m);if(!/^[1-5]$/.test(role.key)||![1,2,3,4,5,22].includes(m.mode)||!Number.isFinite(m.duration))continue;
  const candidates=(data.rows||[]).filter(x=>x.heroId===m.heroId&&x.position==='POSITION_'+role.key&&x.bracketBasicIds===group.id&&Number.isFinite(x.time)&&Math.abs(x.time-m.duration/60)<=0.6&&Number.isFinite(x.remainingMatchCount)&&x.remainingMatchCount>=100);
  const row=candidates.sort((a,b)=>Math.abs(a.time-m.duration/60)-Math.abs(b.time-m.duration/60))[0];if(row)pairs.push({m,row});
 }
 const metrics={};for(const [key,field] of Object.entries(fields)){
  const valid=pairs.filter(({m,row})=>Number.isFinite(m.player?.[key])&&Number.isFinite(row[field])&&row[field]>=0);
  if(!valid.length)continue;
  const actual=valid.reduce((s,p)=>s+p.m.player[key],0)/valid.length,expected=valid.reduce((s,p)=>s+p.row[field],0)/valid.length;
  metrics[key]={actual,expected,games:valid.length,minSample:Math.min(...valid.map(p=>p.row.remainingMatchCount)),delta:expected>0?(actual-expected)/expected*100:null};
 }
 return {matchedGames:pairs.length,metrics,group:group.label,generatedAt:data.generatedAt,reason:pairs.length?'':'Нет достаточно большой выборки по известным позициям и длительности игр.'};
}
export async function enrichCohorts(report,{fetcher=fetch,signal}={}){
 const group=rankGroup(report.rank),known=report.matches.filter(m=>/^[1-5]$/.test(resolveRole(m).key));
 if(!group||!known.length)return {...report,cohortComparison:{matchedGames:0,metrics:{},reason:!group?'Рейтинг неизвестен — подходящую группу выбрать нельзя.':'Позиции неизвестны — подходящую группу выбрать нельзя.'}};
 try{
  const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(28000)]):AbortSignal.timeout(28000),body:JSON.stringify({bracket:group.id,heroes:[...new Set(known.map(m=>m.heroId))].slice(0,20),positions:[...new Set(known.map(m=>'POSITION_'+resolveRole(m).key))]})});
  if(!response.ok)throw new Error('unavailable');
  return {...report,cohortComparison:compareCohorts(report,await response.json())};
 }catch(error){if(signal?.aborted)throw error;return {...report,cohortComparison:{matchedGames:0,metrics:{},reason:'Сравнение с группой сейчас недоступно. Собственная статистика сохранена.'}};}
}
const n=v=>v.toLocaleString('ru-RU',{maximumFractionDigits:1});
export function cohortMetricHTML(c,key){
 const m=c?.metrics?.[key];if(!m)return '<small class="cohort-missing">Ориентир группы недоступен</small>';
 const max=Math.max(m.actual,m.expected,1);
 return `<div class="cohort-metric"><span>Игрок / группа: <b>${n(m.actual)} / ${n(m.expected)}</b></span><div class="cohort-bars"><i style="width:${m.actual/max*100}%"></i><i style="width:${m.expected/max*100}%"></i></div><span>${m.delta===null?'Процент не вычисляется при нулевом ориентире':`${m.delta>=0?'+':''}${n(m.delta)}% к ориентиру`}</span><small>Сопоставлено игр: ${m.games}; минимум ${m.minSample} наблюдений на выборку. Полосы: игрок — золотая, группа — серая.</small></div>`;
}
