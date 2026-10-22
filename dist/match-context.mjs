// Conservative abstention, not a bonus for losing or avoiding deaths.
export function difficultLossContext(m){
 const p=m.player||{},times=p.times,series=m.goldAdvantage;
 if(m.win!==false||!Array.isArray(series)||!Number.isInteger(p.player_slot)||!Number.isFinite(m.duration))return null;
 const own=series.map(v=>Number.isFinite(v)?(p.player_slot<128?v:-v):null);
 const at20=own[20],late=(p.deaths_log||[]).filter(d=>Number.isFinite(d.time));
 const firstDeath=late.length?Math.min(...late.map(d=>d.time)):null;
 const farm=m.metrics?.find(x=>x.key==='gold_per_min')?.percentile;
 const hasActivity=Number.isFinite(m.killParticipation)&&m.killParticipation>=35&&(p.kills||0)+(p.assists||0)>=3;
 const preserved=Number.isFinite(p.deaths)&&p.deaths<=2&&firstDeath!==null&&firstDeath>=m.duration*.8;
 if(!(m.duration>=1500&&at20<=-10000&&Number.isFinite(at20)&&preserved&&hasActivity&&farm>=20))return null;
 const minute=Math.floor(firstDeath/60),deficit=own[minute];
 return {kind:'difficult-loss',deficit20:Math.abs(at20),firstDeath,deficitAtDeath:Number.isFinite(deficit)?Math.max(0,-deficit):null,
 title:'Тяжёлые условия — вклад неоднозначен',
 explanation:`К 20-й минуте команда отставала на ${Math.abs(at20).toLocaleString('ru-RU')} золота. Игрок редко погибал, первая смерть произошла в заключительной части игры; участие в убийствах команды — ${m.killParticipation}%. Низкий урон и давление на строения в таких условиях недостаточны для уверенного вывода о слабой игре. Сохранение жизни и фарма также не доказывает, что все решения были правильными.`};
}
