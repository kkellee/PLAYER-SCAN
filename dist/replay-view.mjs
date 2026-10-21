export function openReplay(matchId,doc=document){
  const card=doc.getElementById('match-'+matchId);if(!card)return false;
  const viewer=doc.getElementById('replay-viewer');
  if(viewer){viewer.hidden=false;for(const other of viewer.querySelectorAll('.match')){other.hidden=other!==card;if(other!==card)other.open=false;}}
  card.hidden=false;
  card.open=true;
  for(const section of card.querySelectorAll('details')){
    const title=section.querySelector('summary')?.textContent||'';
    if(/Экономика|Позиции на линии|Покупки|Командные драки|Смерти и обзор|Способности, предметы|Обзор и помощь/.test(title))section.open=true;
  }
  card.querySelector('summary')?.focus({preventScroll:true});
  card.scrollIntoView({behavior:'auto',block:'start'});return true;
}
export function replayFacts(m){
  const p=m.player||{},facts=[];
  if(!m.parsed&&!m.stratz?.parsedAt)return facts;
  if(Number.isFinite(m.killParticipation))facts.push(`Участвовал в ${m.killParticipation}% убийств команды. Этот показатель оценивается с учётом роли, а не сам по себе.`);
  const fights=(m.fights||[]).filter(f=>f.involved);
  if(fights.length)facts.push(`Зафиксировано ${fights.length} командных драк с участием игрока. Смертей в этих драках: ${fights.reduce((n,f)=>n+(f.deaths||0),0)}. Подробности и тайминги — ниже.`);
  const events=m.events||[];
  if(events.length){const e=events[0];const t=`${Math.floor(e.time/60)}:${String(Math.floor(e.time%60)).padStart(2,'0')}`;facts.push(`Эпизод для проверки — ${t}: ${e.title.toLowerCase()}. ${e.text}`);}
  if(Array.isArray(p.purchase_log))facts.push(`Получены тайминги ${p.purchase_log.length} покупок. Их можно сопоставить с событиями драк на карточках ниже.`);
  if(p.lane_pos&&Object.keys(p.lane_pos).length)facts.push('Карта показывает, где игрок находился на стадии линии. Это частота присутствия, а не полный маршрут за всю игру.');
  if(!facts.length)facts.push('Реплей отмечен как обработанный, но подробных событий для этого игрока пока недостаточно. Недостающие показатели не считаются ошибками.');
  return facts;
}
