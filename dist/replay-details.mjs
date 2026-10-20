import {items,heroes} from './dota-assets.mjs';
import {abilities} from './dota-abilities.mjs';
import {clock,heroPortrait,graphHTML,mapVersion} from './replay-visuals.mjs?v=detail-2';
const CDN='https://cdn.cloudflare.steamstatic.com';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=(v,d=0)=>Number.isFinite(v)?v.toLocaleString('ru-RU',{maximumFractionDigits:d}):'—';
const human=s=>String(s||'Неизвестный источник').replace(/^item_|^npc_dota_hero_/g,'').replaceAll('_',' ');
const utilityNames={plus_high_five:'Дать пять',plus_guild_banner:'Знамя гильдии',twin_gate_portal_warp:'Переход через парные порталы',ability_lamp_use:'Взаимодействие со Смотрителем',ability_capture:'Захват объекта'};
const runeNames=['Усиление урона','Ускорение','Иллюзии','Невидимость','Регенерация','Богатство','Волшебство','Вода','Мудрость','Щит'];
const heroByKey=Object.fromEntries(Object.entries(heroes).map(([id,h])=>['npc_dota_hero_'+h.img?.split('/').at(-1)?.replace('.png',''),{id,...h}]));
function icon(meta){return meta?.img?`<img src="${esc(CDN+meta.img)}" alt="" loading="lazy" decoding="async">`:'<span class="detail-icon-fallback" aria-hidden="true">◆</span>';}
export function sourceInfo(key){
  if(key==='null'||key===''||key==='undefined')return {name:'Атаки и урон без указанной способности'};
  // The secondary Snowball action has no separate image on the Steam CDN.
  if(key==='tusk_launch_snowball')return {...abilities[key],img:abilities.tusk_snowball?.img};
  if(key==='plus_high_five')return {name:utilityNames[key]};
  if(utilityNames[key])return {...abilities[key],name:utilityNames[key]};
  return abilities[key]||items[key]||items[key.replace(/^item_/,'')]||{name:human(key)};
}
export function entriesFor(data){
  return Object.entries(data||{}).filter(([,v])=>Number.isFinite(v)&&v>=0).sort((a,b)=>b[1]-a[1]);
}
export function rankingHTML(data,{title,unit='урона',share=false,empty='Нет подробностей в полученном разборе.'}={}){
  const entries=entriesFor(data),max=Math.max(1,...entries.map(([,v])=>v)),sum=entries.reduce((s,[,v])=>s+v,0);
  const rows=entries.map(([key,v])=>{const meta=sourceInfo(key);return `<div class="source-row">${icon(meta)}<div><div class="source-label"><span>${esc(meta.name)}</span><b>${n(v)} <small>${esc(unit)}</small></b></div><div class="source-bar"><i style="width:${v/max*100}%"></i></div>${share?`<small>${sum?Math.round(v/sum*100):0}% от показанной разбивки</small>`:''}</div></div>`;});
  return `<section class="detail-ranking"><h4>${esc(title)}</h4>${entries.length?`<div class="source-ranking">${rows.slice(0,8).join('')}${rows.length>8?`<details class="more-sources"><summary>Показать остальные (${rows.length-8})</summary>${rows.slice(8).join('')}</details>`:''}</div>`:`<p class="muted">${esc(empty)}</p>`}</section>`;
}
function stat(label,value,desc,meta){return `<div class="detail-stat">${meta?icon(meta):''}<div><small>${label}</small><strong>${value}</strong><p>${desc}</p></div></div>`;}
export function combatHTML(m){
  const p=m.player||{},uses=p.ability_uses;
  const abilitiesOnly=uses?Object.fromEntries(Object.entries(uses).filter(([key])=>!utilityNames[key])):null;
  const other=uses?Object.fromEntries(Object.entries(uses).filter(([key])=>utilityNames[key])):null;
  return `<div class="detail-stats">
  ${stat('Урон героям',n(p.hero_damage),'За всю катку',heroes[m.heroId])}
  ${stat('Урон строениям',n(p.tower_damage),'Давление на объекты')}
  ${stat('Лечение героев',n(p.hero_healing),'Учтённое лечение союзных героев')}
  ${stat('Оглушения',n(p.stuns,1)+' сек.','Суммарная длительность контроля')}
  </div><p class="muted">Иконки показывают, какой способностью или предметом нанесён урон. Полоса сравнивает источники внутри списка; процент — долю в доступной разбивке.</p>
  <div class="detail-columns">
  ${rankingHTML(p.damage_inflictor,{title:'Чем наносил урон героям',share:true})}
  ${rankingHTML(p.damage_inflictor_received,{title:'От чего получал урон',share:true})}
  </div><div class="detail-columns">
  ${rankingHTML(abilitiesOnly,{title:'Применения способностей',unit:'раз'})}
  ${rankingHTML(p.item_uses,{title:'Использование предметов',unit:'раз'})}
  </div>${other&&Object.keys(other).length?rankingHTML(other,{title:'Другие действия',unit:'раз'}):''}
  <p class="muted">Число применений не показывает, попал ли игрок по цели или выбрал ли удачный момент. Пассивные эффекты могут наносить урон без отдельного применения.</p>`;
}
export function wardEvents(p){
  return [['obs_log','observer'],['sen_log','sentry']].flatMap(([key,kind])=>(Array.isArray(p[key])?p[key]:[]).filter(w=>w.entityleft!==true).map(w=>({...w,kind})))
    .sort((a,b)=>(a.time??Infinity)-(b.time??Infinity)).map((w,i)=>({...w,index:i+1,mapX:Number.isFinite(w.x)?w.x-64:null,mapY:Number.isFinite(w.y)?191-w.y:null}));
}
export function wardPointValid(w){return Number.isFinite(w.mapX)&&Number.isFinite(w.mapY)&&w.mapX>=0&&w.mapX<=127&&w.mapY>=0&&w.mapY<=127;}
export function visionHTML(m){
  const p=m.player||{},events=wardEvents(p),points=events.filter(wardPointValid),version=mapVersion(m.patch);
  const wardName=kind=>kind==='observer'?'Observer Ward':'Sentry Ward';
  const map=points.length?`<figure class="dota-map ward-map"><svg viewBox="0 0 127 127" role="img" aria-label="Места установки вардов игрока"><image href="https://raw.githubusercontent.com/odota/web/master/public/assets/images/dota2/map/detailed_${version}.webp" width="127" height="127"/><rect width="127" height="127" fill="#031019" opacity=".3"/>${points.map(w=>`<g class="ward-marker" data-kind="${w.kind}" data-ward-point="${w.index}"><circle cx="${w.mapX}" cy="${w.mapY}" r="3.1" fill="#071018" stroke="${w.kind==='observer'?'#f9cb54':'#77bce9'}" stroke-width=".7"/><text x="${w.mapX}" y="${w.mapY+1.1}" text-anchor="middle" fill="white" font-size="3.2">${w.index}</text><title>${wardName(w.kind)} · ${clock(w.time)}</title></g>`).join('')}</svg><figcaption>Фон карты ${version[0]}.${version.slice(1)} · номера соответствуют списку установок</figcaption></figure>`:'<p class="muted">Координаты установки вардов пока недоступны.</p>';
  return `<div class="detail-stats">
  ${stat('Обсерверы поставлены',n(p.obs_placed),'Количество установок',items.ward_observer)}
  ${stat('Сентри поставлены',n(p.sen_placed),'Количество установок',items.ward_sentry)}
  ${stat('Стаки лагерей',n(p.camps_stacked),'Зафиксированные стаки')}
  ${stat('Крипы в стаках',n(p.creeps_stacked),'Учтённое число крипов')}
  </div><div class="ward-explorer"><div class="ward-filters"><label><input type="checkbox" data-ward-filter="observer" checked> Обсерверы</label><label><input type="checkbox" data-ward-filter="sentry" checked> Сентри</label></div><div class="ward-layout">${map}<div><h4>Когда и где ставил варды</h4><p class="muted">Нажми на установку, чтобы выделить её на карте. Это места установки за всю катку; варды не обязательно стояли одновременно.</p><ol class="ward-list">${events.map(w=>`<li data-kind="${w.kind}"><button type="button" data-ward-select="${w.index}" ${wardPointValid(w)?'':'disabled'} aria-pressed="false" aria-label="${wardName(w.kind)}, установка ${w.index}, ${clock(w.time)}">${icon(items[w.kind==='observer'?'ward_observer':'ward_sentry'])}<span><b>${w.index}. ${wardName(w.kind)}</b><small>${clock(w.time)}${wardPointValid(w)?'':' · без координат'}</small></span></button></li>`).join('')||'<li class="muted">Список установок пока недоступен.</li>'}</ol><output class="ward-selection" aria-live="polite">Выбери установку из списка.</output></div></div></div>
  <p class="muted">Карта не оценивает качество обзора, обнаруженных врагов или время жизни варда: для этого нужны дополнительные события.</p>`;
}
export function farmHTML(m){
  const p=m.player||{};
  return `<div class="detail-stats">${stat('Добивания',n(p.last_hits),'Добитые крипы')}${stat('Денаи',n(p.denies),'Добитые союзные юниты')}${stat('Ценность к концу',n(p.net_worth),'Итоговый net worth')}${stat('Действия в минуту',n(p.actions_per_min),'Частота действий, не оценка качества')}</div>`+
    graphHTML([{name:'Добивания',color:'#8ccea8',values:p.lh_t}],{title:'Как накапливались добивания',times:p.times,note:'Общее количество добиваний к выбранной минуте. Паузы в росте могут быть связаны с драками, перемещениями или смертью.'});
}
export function timelineEvents(m){
  const p=m.player||{};
  const kills=(p.kills_log||[]).map(e=>({time:e.time,title:'Убийство: '+(heroByKey[e.key]?.name||human(e.key)),hero:heroByKey[e.key],kind:'kill'}));
  const buybacks=(p.buyback_log||[]).map(e=>({time:e.time,title:'Выкуп',kind:'buyback'}));
  const runes=(p.runes_log||[]).map(e=>({time:e.time,title:'Руна: '+(runeNames[e.key]||'неизвестный тип'),kind:'rune',art:runeNames[e.key]?`https://raw.githubusercontent.com/odota/web/master/public/assets/images/dota2/runes/${Number(e.key)}.png`:null}));
  const deaths=(m.stratz?.deaths||[]).map(e=>({time:e.time,title:'Смерть',kind:'death',detail:`Потеря золота: ${n(e.goldLost)} · вне игры: ${n(e.timeDead)} сек.${e.isDieBack?' · после выкупа':''}${e.isAttemptTpOut?' · попытка телепорта':''}`}));
  return [...kills,...buybacks,...deaths,...runes].filter(e=>Number.isFinite(e.time)).sort((a,b)=>a.time-b.time);
}
export function eventsHTML(m){
  const p=m.player||{},events=timelineEvents(m);
  return `<div class="detail-stats">${stat('Убийства',n(p.kills),'За всю катку',heroes[m.heroId])}${stat('Смерти',n(p.deaths),'За всю катку')}${stat('Ассисты',n(p.assists),'Помощь в убийствах')}${stat('Время мёртвым',Number.isFinite(p.life_state_dead)?clock(p.life_state_dead):'—','Суммарно за катку')}</div>
  <ol class="combat-timeline">${events.map(e=>`<li class="timeline-${e.kind}"><time>${clock(e.time)}</time>${e.hero?icon(e.hero):e.art?`<img class="rune-icon" src="${esc(e.art)}" alt="" loading="lazy">`:`<span class="event-symbol" aria-hidden="true">${e.kind==='death'?'×':'↻'}</span>`}<div><b>${esc(e.title)}</b>${e.detail?`<small>${esc(e.detail)}</small>`:''}</div></li>`).join('')||'<li class="muted">Точные события пока недоступны.</li>'}</ol><p class="muted">Показаны только события с известным временем. Список может быть неполным; итоговые счётчики выше относятся ко всей катке.</p>`;
}
export function detailedReplayHTML(m){
  return `<details open class="detail-section"><summary>Способности, предметы и урон</summary>${combatHTML(m)}</details>
  <details open class="detail-section"><summary>Обзор и помощь команде</summary>${visionHTML(m)}</details>
  <details class="detail-section"><summary>Фарм и темп игры</summary>${farmHTML(m)}</details>
  <details class="detail-section"><summary>Убийства, смерти, выкупы и руны</summary>${eventsHTML(m)}</details>`;
}
export function mountReplayDetails(root=document){
  for(const panel of root.querySelectorAll('.ward-explorer')){
    for(const input of panel.querySelectorAll('[data-ward-filter]'))input.addEventListener('change',()=>{
      const kind=input.dataset.wardFilter;for(const el of panel.querySelectorAll(`[data-kind="${kind}"]`))el.style.display=input.checked?'':'none';
      for(const el of panel.querySelectorAll('.selected-ward'))el.classList.remove('selected-ward');
      for(const el of panel.querySelectorAll('[data-ward-select]'))el.setAttribute('aria-pressed','false');
      panel.querySelector('output').textContent='Выбери установку из списка.';
    });
    for(const button of panel.querySelectorAll('[data-ward-select]'))button.addEventListener('click',()=>{
      for(const el of panel.querySelectorAll('.selected-ward'))el.classList.remove('selected-ward');
      for(const el of panel.querySelectorAll('[data-ward-select]'))el.setAttribute('aria-pressed','false');
      button.classList.add('selected-ward');button.setAttribute('aria-pressed','true');
      const marker=panel.querySelector(`[data-ward-point="${button.dataset.wardSelect}"]`);
      if(marker){marker.classList.add('selected-ward');marker.parentNode.append(marker);}
      panel.querySelector('output').textContent=button.getAttribute('aria-label');
    });
  }
  // A missing CDN image should leave the readable name, not a broken-image glyph.
  for(const img of root.querySelectorAll('.source-row img,.detail-stat img,.combat-timeline img,.ward-list img')){
    img.addEventListener('error',()=>{img.hidden=true;},{once:true});
  }
}
