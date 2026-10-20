const finite=Number.isFinite;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
export const ROLE_VERSION='2.0-role';
const labels={1:'Керри',2:'Мидер',3:'Офлейнер',4:'Поддержка',5:'Полная поддержка',support:'Поддержка',core:'Кор',unknown:'Роль не определена'};
// Heuristic weights over hero percentiles, not role-matched population percentiles.
const weights={
  1:{gold_per_min:35,xp_per_min:20,hero_damage_per_min:25,tower_damage:15,assists_per_min:5},
  2:{gold_per_min:20,xp_per_min:25,hero_damage_per_min:30,tower_damage:10,assists_per_min:15},
  3:{gold_per_min:10,xp_per_min:20,hero_damage_per_min:30,tower_damage:10,assists_per_min:30},
  4:{xp_per_min:20,hero_damage_per_min:25,assists_per_min:45,hero_healing_per_min:10},
  5:{xp_per_min:15,hero_damage_per_min:15,assists_per_min:60,hero_healing_per_min:10},
  support:{xp_per_min:15,hero_damage_per_min:20,assists_per_min:55,hero_healing_per_min:10},
  core:{gold_per_min:25,xp_per_min:20,hero_damage_per_min:30,tower_damage:15,assists_per_min:10},
  unknown:{gold_per_min:20,xp_per_min:20,hero_damage_per_min:20,tower_damage:20,assists_per_min:20}
};
export function resolveRole(m){
  const explicit=String(m.stratz?.position??'').match(/^POSITION_([1-5])$/);
  if(explicit)return {key:explicit[1],label:labels[explicit[1]],basis:'Позиция из разбора'};
  const est=m.player?.position_est;
  if(Number.isInteger(est)&&est>=1&&est<=5)return {key:String(est),label:labels[est],basis:'Автоматическая оценка позиции'};
  const role=m.stratz?.role;
  if(['SUPPORT','SOFT_SUPPORT','HARD_SUPPORT'].includes(role))return {key:'support',label:labels.support,basis:'Определена поддержка, точная позиция неизвестна'};
  if(role==='CORE')return {key:'core',label:labels.core,basis:'Определён кор, точная позиция неизвестна'};
  if(m.player?.lane_role===2&&!m.player?.is_roaming)return {key:'2',label:labels[2],basis:'Предположение по центральной линии'};
  return {key:'unknown',label:labels.unknown,basis:'Использована общая оценка; роль по герою не угадывается'};
}
export function assessMatch(m){
  const role=resolveRole(m),w=weights[role.key]||weights.support;
  const components=(m.metrics||[]).filter(x=>w[x.key]&&finite(x.percentile)&&x.percentile>=0&&x.percentile<=100&&!(x.key==='hero_healing_per_min'&&!(x.value>0))).map(x=>({...x,weight:w[x.key]}));
  const total=components.reduce((s,x)=>s+x.weight,0);
  const eligible=!m.unavailable&&[1,2,3,4,5,22].includes(m.mode)&&m.duration>=900&&components.length>=3&&total>=60;
  const score=eligible?Math.round(components.reduce((s,x)=>s+x.percentile*x.weight,0)/total):null;
  const ordered=[...components].sort((a,b)=>b.percentile-a.percentile);
  const title=score===null?'Недостаточно данных для оценки':score>=72?'Сильная игра':score>=58?'Хорошая игра':score>=43?'Средняя игра':score>=30?'Слабая игра':'Очень слабая игра';
  const reasons=score===null?['Для оценки нужны обычная игра от 15 минут и достаточный набор показателей.']:ordered.filter((x,i)=>i===0||i===ordered.length-1).map(x=>`${x.label}: ${x.percentile}/100 относительно игроков на этом герое; вес в оценке ${Math.round(x.weight/total*100)}%.`);
  if(finite(m.killParticipation))reasons.push(`Участие в ${m.killParticipation}% убийств команды. Этот показатель не отражает все полезные действия.`);
  const costly=(m.fights||[]).filter(f=>f.deaths>0&&f.goldDelta<0);
  if(costly.length)reasons.push(`В ${costly.length} зафиксированных драках игрок погиб и потерял золото. Эти эпизоды стоит пересмотреть; причины смерти по одним цифрам не установить.`);
  if(['4','5','support'].includes(role.key)&&finite(m.player?.obs_placed))reasons.push(`Поставлено обсерверов: ${m.player.obs_placed}${finite(m.player.sen_placed)?`, сентри: ${m.player.sen_placed}`:''}. Количество установок не показывает качество обзора.`);
  const context=m.win===true?'Команда победила.':m.win===false?'Команда проиграла.':'Исход неизвестен.';
  return {...m,score,assessment:{role,components,title,reasons,context:context+' Результат команды сам по себе не определяет личную оценку.'}};
}
export function reassessReport(base){
  const matches=base.matches.map(assessMatch),eligible=matches.filter(m=>m.score!==null),scores=eligible.map(m=>m.score),average=mean(scores);
  const groups=Object.values(eligible.reduce((a,m)=>{(a[m.assessment.role.key]??=[]).push(m);return a;},{}));
  const roleSummary=groups.map(g=>({role:g[0].assessment.role.label,key:g[0].assessment.role.key,games:g.length,score:Math.round(mean(g.map(m=>m.score)))}));
  const dominant=groups.find(g=>g.length>=10&&g.length/eligible.length>=.6&&g[0].assessment.role.key!=='unknown');
  const variable=dominant&&dominant.filter(m=>m.score<40).length/dominant.length>=.3&&dominant.filter(m=>m.score>=65).length/dominant.length>=.3;
  let verdict='НЕДОСТАТОЧНО ДАННЫХ',tone='neutral',description='Для общего вывода нужны хотя бы 10 игр с достаточным набором показателей.';
  if(eligible.length>=10){
    if(average<30&&scores.filter(s=>s<35).length/scores.length>=.6){verdict='СКРЫТОПУЛЬНЫЙ';tone='bad';description='В большинстве оценённых игр показатели заметно ниже ориентиров. Это игровой ярлык слабой серии, а не доказательство намеренного руина.';}
    else if(average<43){verdict='НЕ В ФОРМЕ';tone='warn';description='В серии преобладают слабые показатели с учётом задач определённых ролей.';}
    else if(average>=72){verdict='ТАЩИТ';tone='good';description='В среднем показывает сильные результаты по показателям, важным для своей роли.';}
    else if(average>=58){verdict='НАДЁЖНЫЙ ТИММЕЙТ';tone='good';description='Общий уровень серии выше среднего ориентира. Отдельные неудачные игры не перечёркивают результат.';}
    else if(variable){verdict='НЕСТАБИЛЬНЫЙ';tone='warn';description=`На роли «${dominant[0].assessment.role.label}» не менее 30% сильных и 30% слабых игр. Это колебания внутри одной роли, а не разница между ролями.`;}
    else{verdict='В ПРЕДЕЛАХ НОРМЫ';description='Серия близка к средним ориентирам. Данных для вывода о систематически слабой игре нет.';}
  }
  const paired=eligible.filter(m=>finite(m.stratz?.imp)),positive=paired.filter(m=>m.stratz.imp>0).length,negative=paired.filter(m=>m.stratz.imp<0).length,pairedMean=mean(paired.map(m=>m.score));
  const disagreement=eligible.length>=10&&paired.length>=10&&((pairedMean<43&&positive/paired.length>=.6)||(pairedMean>=58&&negative/paired.length>=.6));
  if(disagreement){verdict='СМЕШАННАЯ КАРТИНА';tone='neutral';description='Показатели с учётом роли и дополнительная оценка вклада расходятся. Однозначный вывод по этой серии ненадёжен.';}
  return {...base,version:ROLE_VERSION,matches,verdict,tone,description,score:eligible.length>=10?Math.round(average):null,roleSummary,coverage:{...base.coverage,scored:eligible.length},sourceComparison:base.sourceComparison?{...base.sourceComparison,disagreement}:undefined};
}
