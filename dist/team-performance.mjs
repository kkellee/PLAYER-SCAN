const finite=Number.isFinite,clamp=x=>Math.max(0,Math.min(100,x));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
export function teamPerformance(m,role){
 const p=m.player||{},team=m.teamPlayers||[],support=['4','5','support'].includes(role),core=['1','2','3','core'].includes(role);
 const shares={},evidence=[],signals=[];
 for(const key of ['hero_damage','net_worth','gold_per_min','tower_damage','kills','assists','deaths']){
  if(team.length!==5||!finite(p[key])||!team.every(q=>finite(q[key])))continue;
  const sum=team.reduce((s,q)=>s+q[key],0);if(sum>0)shares[key]=p[key]/sum;
 }
 const kp=finite(m.killParticipation)?m.killParticipation:null;
 if(kp!==null){signals.push(clamp(50+(kp-(support?55:45))*1.3));evidence.push(`Участие в убийствах команды: ${Math.round(kp)}%.`);}
 if(finite(shares.hero_damage)){
  // Compare output with resources; being the richest core alone earns no bonus.
  const resource=shares.gold_per_min,expected=finite(resource)?Math.max(support?.10:.16,resource):support?.14:.24;
  signals.push(clamp(50+70*(shares.hero_damage/expected-1)));
  evidence.push(`Доля командного урона: ${Math.round(shares.hero_damage*100)}%${finite(resource)?`, доля заработанного золота: ${Math.round(resource*100)}%`:''}.`);
 }
 if(finite(shares.tower_damage))signals.push(clamp(50+100*(shares.tower_damage-(support?.08:.25))));
 if(finite(shares.net_worth)){const expected=({1:.30,2:.27,3:.23,4:.12,5:.10,support:.11,core:.27})[role]??.20;signals.push(clamp(50+80*(shares.net_worth/expected-1)));}
 if(finite(shares.kills)||finite(shares.assists)){const parts=[];if(finite(shares.kills))parts.push(clamp(50+100*(shares.kills-(support?.10:.25))));if(finite(shares.assists))parts.push(clamp(50+100*(shares.assists-(support?.25:.15))));signals.push(mean(parts));}
 if(finite(shares.net_worth)){const rank=1+team.filter(q=>q.net_worth>p.net_worth).length;evidence.push(`Нетворс: ${p.net_worth.toLocaleString('ru-RU')}, место в команде — ${rank}; доля — ${Math.round(shares.net_worth*100)}%. Экономика оценивается относительно ожидаемой доли ресурсов для роли.`);}
 if(finite(shares.tower_damage))evidence.push(`Урон строениям: ${p.tower_damage}; доля команды — ${Math.round(shares.tower_damage*100)}%.`);
 let survival=null;
 if(finite(p.deaths)&&finite(m.duration)&&m.duration>0){
  const per30=p.deaths*1800/m.duration;
  survival=clamp(100-per30*(support?8:10));
  if(p.deaths>=4&&finite(p.kills)&&p.deaths>=2*Math.max(1,p.kills))survival=clamp(survival-8*Math.max(0,1-(p.assists||0)/Math.max(1,2*p.deaths)));
  // Survival only helps when some participation is confirmed.
  if(!(kp>=30))survival=Math.min(survival,50);
  evidence.push(`Смерти: ${p.deaths} за ${Math.round(m.duration/60)} мин. (${per30.toFixed(1)} в пересчёте на 30 мин.). Для поддержки допустимый темп смертей выше.`);
 }
 const utilitySignals=[];
 for(const [key,label,target] of [['obs_placed','Обсерверы',support?5:1],['sen_placed','Сентри',support?8:2],['observer_kills','Снятые обсерверы',support?2:1],['camps_stacked','Стаки',support?3:1]]){
  if(!finite(p[key])||!(m.duration>0))continue;utilitySignals.push(clamp(50*p[key]*1800/m.duration/target));evidence.push(`${label}: ${p[key]}. Учитывается объём действий, а не качество обзора.`);
 }
 if(finite(p.item_uses?.smoke_of_deceit)){const count=p.item_uses.smoke_of_deceit;utilitySignals.push(clamp(50*count/(support?2:1)));evidence.push(`Использовано смоков: ${count}. Это не число раскрытых вражеских смоков и не оценка успешности выхода.`);}
 for(const [key,label] of [['hero_healing','Лечение'],['stuns','Контроль']]){if(!(p[key]>0)||team.length!==5||!team.every(q=>finite(q[key])))continue;const sum=team.reduce((s,q)=>s+q[key],0);utilitySignals.push(clamp(50+100*(p[key]/sum-.25)));evidence.push(`${label}: ${Math.round(p[key])}, доля команды ${Math.round(p[key]/sum*100)}%.`);}
 const utility=utilitySignals.length>=2?mean(utilitySignals):null;
 const pressure=Array.isArray(m.goldAdvantage)&&Number.isInteger(p.player_slot)?m.goldAdvantage.map(v=>finite(v)?v*(p.player_slot<128?1:-1):null):[];
 const severe=pressure.filter(v=>finite(v)&&v<=-10000).length>=5;
 return {contribution:signals.length>=2?mean(signals):null,survival,utility,shares,evidence,severe,signals:signals.length};
}
