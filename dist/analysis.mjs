export const VERSION = '1.0.0-beta';
export const metricNames = {gold_per_min:'Золото в минуту',xp_per_min:'Опыт в минуту',hero_damage_per_min:'Урон героям в минуту',tower_damage:'Урон строениям',last_hits_per_min:'Добивания в минуту',assists_per_min:'Помощь в минуту',hero_healing_per_min:'Лечение в минуту'};
export function accountInput(value) {
  let s=String(value??'').trim();
  if(s.length>200) throw new Error('Слишком длинный ID или адрес.');
  if(/^STEAM_[0-5]:[01]:\d+$/.test(s)){const p=s.split(':');s=String(BigInt(p[2])*2n+BigInt(p[1]));}
  const s3=s.match(/^\[U:1:(\d+)\]$/);if(s3)s=s3[1];
  if(!/^\d+$/.test(s)) {
    let u;try{u=new URL(s.includes('://')?s:'https://'+s);}catch{throw new Error('Введи Steam ID, Dota ID или ссылку на Steam-профиль.');}
    if(!['steamcommunity.com','www.steamcommunity.com'].includes(u.hostname)||!['https:','http:'].includes(u.protocol)||u.username||u.password||u.port) throw new Error('Нужна ссылка на steamcommunity.com.');
    const p=u.pathname.match(/^\/(profiles|id)\/([^/]+)\/?$/);if(!p)throw new Error('Нужна ссылка на профиль /profiles/ID или /id/имя.');
    if(p[1]==='id')return {vanity:decodeURIComponent(p[2])};s=p[2];
  }
  let id;try{id=BigInt(s);}catch{throw new Error('Некорректный Steam ID.');}
  if(id>=76561197960265728n)id-=76561197960265728n;
  if(id<=0n||id>=4294967295n)throw new Error('ID вне допустимого диапазона Dota 2.');
  return {accountId:Number(id),steamId:String(id+76561197960265728n)};
}
const num=v=>typeof v==='number'&&Number.isFinite(v);
const avg=a=>a.length?a.reduce((a,b)=>a+b,0)/a.length:null;
export function compactMatch(m){
  const keys=['account_id','player_slot','hero_id','kills','deaths','assists','gold_per_min','xp_per_min','hero_damage','tower_damage','hero_healing','last_hits','denies','net_worth','level','lane_role','is_roaming','position_est','rank_tier','benchmarks','obs_placed','sen_placed','camps_stacked','creeps_stacked','stuns','teamfight_participation','lane_efficiency_pct','purchase_log','kills_log','deaths_log','buyback_log','runes_log','connection_log','lane_pos','obs_log','sen_log','times','gold_t','xp_t','lh_t','networth_t','item_0','item_1','item_2','item_3','item_4','item_5','item_neutral','ability_uses','item_uses','damage_inflictor','damage_inflictor_received','life_state_dead','actions_per_min','leaver_status'];
  return {match_id:m.match_id,version:m.version,duration:m.duration,start_time:m.start_time,radiant_win:m.radiant_win,game_mode:m.game_mode,lobby_type:m.lobby_type,patch:m.patch,region:m.region,radiant_score:m.radiant_score,dire_score:m.dire_score,radiant_gold_adv:m.radiant_gold_adv,radiant_xp_adv:m.radiant_xp_adv,objectives:m.objectives,teamfights:m.teamfights,players:(m.players||[]).map(p=>Object.fromEntries(keys.filter(k=>p[k]!==undefined).map(k=>[k,p[k]])))};
}
export function matchReport(m,id,heroNames={}) {
  const index=(m.players||[]).findIndex(p=>p.account_id===id);if(index<0)return null;
  const p=m.players[index], minutes=m.duration/60;
  const sameSide=q=>(q.player_slot<128)===(p.player_slot<128);
  const teamKills=(m.players||[]).filter(sameSide).reduce((a,q)=>a+(q.kills||0),0);
  const metrics=Object.entries(metricNames).flatMap(([key,label])=>{const b=p.benchmarks?.[key];return b&&num(b.pct)?[{key,label,value:b.raw,percentile:Math.round(b.pct*100)}]:[]});
  // Hero benchmarks are not rank-/role-matched. Do not treat low support farm as proof of poor play.
  const preferred=['gold_per_min','xp_per_min','hero_damage_per_min','tower_damage','assists_per_min'];
  const scoreMetrics=metrics.filter(x=>preferred.includes(x.key));
  const score=scoreMetrics.length>=3&&[1,2,3,4,5,22].includes(m.game_mode)&&minutes>=15?Math.round(avg(scoreMetrics.map(x=>x.percentile))):null;
  const fights=(m.teamfights||[]).flatMap(f=>{const q=f.players?.[index];if(!q)return [];return [{start:f.start,end:f.end,deaths:q.deaths,damage:q.damage,healing:q.healing,goldDelta:q.gold_delta,buybacks:q.buybacks,involved:(q.damage||0)>0||(q.deaths||0)>0||Object.keys(q.ability_uses||{}).length>0}];});
  const events=fights.filter(f=>f.deaths>0&&f.goldDelta<0).sort((a,b)=>a.goldDelta-b.goldDelta).slice(0,3).map(f=>({time:f.start,title:'Смерть в невыгодной драке',text:`Смертей: ${f.deaths}; изменение золота: ${f.goldDelta}; урон: ${f.damage??'нет данных'}. Эпизод для просмотра реплея, не доказательство виновности.`}));
  return {matchId:m.match_id,heroId:p.hero_id,hero:heroNames[p.hero_id]||`Герой ${p.hero_id}`,win:typeof m.radiant_win==='boolean'?(p.player_slot<128)===m.radiant_win:null,duration:m.duration,startTime:m.start_time,mode:m.game_mode,patch:m.patch,parsed:m.version!=null,score,metrics,killParticipation:teamKills?Math.min(100,Math.round(((p.kills||0)+(p.assists||0))/teamKills*100)):null,events,fights,player:p,goldAdvantage:m.radiant_gold_adv,xpAdvantage:m.radiant_xp_adv,objectives:m.objectives||[],rank:p.rank_tier??null};
}
export function playerMatch(m,id){
  const index=m.players.findIndex(p=>p.account_id===id);
  return {...m,players:m.players.map((p,i)=>i===index?p:{account_id:p.account_id,player_slot:p.player_slot,kills:p.kills}),teamfights:(m.teamfights||[]).map(f=>({...f,players:f.players?.map((p,i)=>i===index?p:null)}))};
}
export function buildReport(profile,recent,matches,heroNames={}) {
  const id=profile.profile?.account_id??profile.account_id;
  const reports=recent.slice(0,20).map(r=>{const m=matches.find(m=>m.match_id===r.match_id);return m?matchReport(m,id,heroNames):{matchId:r.match_id,heroId:r.hero_id,hero:heroNames[r.hero_id]||`Герой ${r.hero_id}`,win:typeof r.radiant_win==='boolean'?(r.player_slot<128)===r.radiant_win:null,duration:r.duration,startTime:r.start_time,mode:r.game_mode,parsed:false,score:null,metrics:[],player:r,events:[],fights:[],unavailable:true};}).filter(Boolean);
  const eligible=reports.filter(r=>r.score!==null);const scores=eligible.map(r=>r.score);const score=avg(scores);const spread=score===null?0:Math.sqrt(avg(scores.map(s=>(s-score)**2)));
  let verdict='НЕДОСТАТОЧНО ДАННЫХ',tone='neutral',description='Для вывода нужны хотя бы 10 обычных матчей с сопоставимыми показателями. Недоступные данные не считаются плохой игрой.';
  if(eligible.length>=10){
    if(score<30&&scores.filter(s=>s<35).length/scores.length>=.6){verdict='СКРЫТОПУЛЬНЫЙ';tone='bad';description='В большинстве доступных игр показатели заметно ниже ориентиров OpenDota. Это игровой ярлык нашей экспериментальной оценки, а не доказательство скрытого пула или намеренного руина.';}
    else if(score<43){verdict='НЕ В ФОРМЕ';tone='warn';description='В доступной серии чаще встречаются показатели ниже ориентиров по героям. Стоит посмотреть конкретные слабые игры.';}
    else if(spread>18){verdict='НЕСТАБИЛЬНЫЙ';tone='warn';description='Сильные и слабые показатели заметно чередуются. Одна игра плохо описывает всю серию.';}
    else if(score>=72){verdict='ТАЩИТ';tone='good';description='В этой серии показатели часто выше ориентиров по героям. Это сильная статистика, но не доказательство единоличного вклада в победы.';}
    else if(score>=58){verdict='НАДЁЖНЫЙ ТИММЕЙТ';tone='good';description='В доступных играх показатели в целом выше ориентиров OpenDota по тем же героям.';}
    else{verdict='В ПРЕДЕЛАХ НОРМЫ';tone='neutral';description='Серия находится около ориентиров OpenDota. Устойчиво слабую игру по доступным цифрам не видно.';}
  }
  const aggregates={};for(const k of ['kills','deaths','assists','gold_per_min','xp_per_min','hero_damage','tower_damage','hero_healing','last_hits','obs_placed','sen_placed','camps_stacked','stuns']){const values=reports.map(r=>r.player[k]).filter(num);aggregates[k]={value:avg(values),samples:values.length};}
  const comparisons=Object.entries(metricNames).map(([key,label])=>{const v=reports.flatMap(r=>r.metrics.filter(m=>m.key===key));return {key,label,percentile:avg(v.map(x=>x.percentile)),samples:v.length};});
  const nWins=reports.filter(r=>r.win!==null);return {version:VERSION,generatedAt:new Date().toISOString(),accountId:id,profile:profile.profile||{},rank:profile.rank_tier??null,verdict,tone,description,score:eligible.length>=10?Math.round(score):null,coverage:{requested:20,found:reports.length,details:reports.filter(r=>!r.unavailable).length,parsed:reports.filter(r=>r.parsed).length,scored:eligible.length},winrate:nWins.length?Math.round(nWins.filter(r=>r.win).length/nWins.length*100):null,aggregates,comparisons,matches:reports,limitations:['Оценка экспериментальная и не является вероятностью намеренного руина.','Ориентиры OpenDota — по герою; совпадение рейтинга, роли и патча не гарантировано.','Нет доступа к числу репортов, скрытому пулу и полному командному/голосовому чату.','lane_pos показывает агрегированные позиции на линии, а не полный маршрут героя.','Точный момент проигрыша и намерения игрока нельзя установить только по этим данным.']};
}
