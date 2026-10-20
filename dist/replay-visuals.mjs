import {items,heroes} from './dota-assets.mjs';
const CDN='https://cdn.cloudflare.steamstatic.com';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>Number.isFinite(v)?v.toLocaleString('ru-RU',{maximumFractionDigits:0}):'—';
export const clock=s=>Number.isFinite(s)?`${s<0?'−':''}${Math.floor(Math.abs(s)/60)}:${String(Math.floor(Math.abs(s)%60)).padStart(2,'0')}`:'—';
const signed=v=>Number.isFinite(v)?`${v>0?'+':''}${num(v)}`:'—';
const itemById=new Map(Object.entries(items).map(([key,v])=>[v.id,{key,...v}]));
function image(path,alt,cls=''){return path?`<img class="${cls}" src="${esc(CDN+path)}" alt="${esc(alt)}" loading="lazy" decoding="async">`:'';}
export function heroPortrait(id){const h=heroes[id];return h?image(h.img,h.name,'hero-portrait'):'';}
export function itemInfo(key){return items[key]||{name:String(key||'Неизвестный предмет').replace(/^item_/,'').replaceAll('_',' ')};}
export function purchasesHTML(p){
  const inventory=Array.from({length:6},(_,i)=>itemById.get(p['item_'+i])).filter(Boolean);
  const log=Array.isArray(p.purchase_log)?p.purchase_log:[];
  return `${inventory.length?`<h4>Предметы к концу игры</h4><div class="inventory">${inventory.map(i=>`<div title="${esc(i.name)}">${image(i.img,i.name)}<span>${esc(i.name)}</span></div>`).join('')}</div>`:''}
  <h4>Покупки по ходу игры</h4><p class="muted">Время слева — момент покупки. Минус означает покупку до выхода крипов.</p>
  <ol class="purchase-timeline">${log.map(x=>{const i=itemInfo(x.key);return `<li><time>${clock(x.time)}</time><div class="purchase-item">${image(i.img,i.name)}<strong>${esc(i.name)}</strong></div></li>`;}).join('')}</ol>
  ${!log.length?'<p class="muted">Тайминги покупок пока недоступны.</p>':''}`;
}
export function mapPoints(pos){
  return Object.entries(pos||{}).flatMap(([x,ys])=>Object.entries(ys||{}).map(([y,v])=>({x:Number(x)-64,y:191-Number(y),v:Number(v)}))).filter(p=>[p.x,p.y,p.v].every(Number.isFinite)&&p.v>0&&p.x>=0&&p.x<=127&&p.y>=0&&p.y<=127);
}
export function mapVersion(patch){
  if(patch>=59)return '740';
  if(patch>=57)return '738';
  if(patch>=52)return '733';
  return '732';
}
export function laneMapHTML(m){
  const points=mapPoints(m.player?.lane_pos),max=Math.max(1,...points.map(p=>p.v)),version=mapVersion(m.patch);
  if(!points.length)return '<p class="muted">Позиции на линии пока недоступны.</p>';
  return `<div class="lane-layout"><figure class="dota-map">
  <svg viewBox="0 0 127 127" role="img" aria-label="Позиции игрока на карте Dota: светлее — чаще находился здесь">
  <image href="https://raw.githubusercontent.com/odota/web/master/public/assets/images/dota2/map/detailed_${version}.webp" width="127" height="127"/>
  <rect width="127" height="127" fill="#030b12" opacity=".25"/>
  ${points.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="${1.2+Math.sqrt(p.v/max)*1.8}" fill="#ffb745" opacity="${.15+.5*Math.sqrt(p.v/max)}"/><circle cx="${p.x}" cy="${p.y}" r=".65" fill="#fff1b2" opacity="${.2+.8*p.v/max}"><title>Частота фиксации: ${p.v}</title></circle>`).join('')}
  </svg><span class="map-side radiant">СИЛЫ СВЕТА</span><span class="map-side dire">СИЛЫ ТЬМЫ</span></figure>
  <div class="map-guide">${heroPortrait(m.heroId)}<h3>Где играл ${esc(m.hero)}</h3><p>Светлые участки показывают, где герой чаще находился на стадии линии.</p><div class="heat-legend"><span>Реже</span><i></i><span>Чаще</span></div><p class="muted">Это карта присутствия на линии. Она не показывает последовательность перемещений за всю игру.</p><small>Фон карты ${version[0]}.${version.slice(1)}. В другом патче положение объектов может отличаться; точки взяты из этой игры.</small></div></div>`;
}
export function fightsHTML(m){
  const fights=m.fights||[],max=Math.max(1,...fights.map(f=>Number.isFinite(f.damage)?f.damage:0));
  if(!fights.length)return '<p class="muted">События командных драк пока недоступны.</p>';
  return `<p class="muted">Каждая карточка — отдельная драка. Урон, смерти и изменение золота относятся к выбранному игроку. Длина полосы сравнивает его урон между драками этой игры.</p><div class="fight-grid">${fights.map((f,i)=>`<article class="fight-card ${f.deaths>0?'fight-death':''}"><header><span class="fight-number">${String(i+1).padStart(2,'0')}</span><div><b>${clock(f.start)} — ${clock(f.end)}</b><small>${Number.isFinite(f.end)&&Number.isFinite(f.start)?num(Math.max(0,f.end-f.start))+' сек.':''}</small></div>${heroPortrait(m.heroId)}</header><p class="fight-state">${f.involved?'Зафиксировано участие':'Участие не подтверждено'}</p><div class="damage-label"><span>Урон героям</span><b>${num(f.damage)}</b></div><div class="fight-damage"><i style="width:${Math.max(0,Number.isFinite(f.damage)?f.damage/max*100:0)}%"></i></div><div class="fight-stats"><div><small>Смерти</small><strong class="${f.deaths>0?'loss':''}">${num(f.deaths)}</strong></div><div><small>Золото</small><strong class="${f.goldDelta>0?'win':f.goldDelta<0?'loss':''}">${signed(f.goldDelta)}</strong></div><div><small>Лечение</small><strong>${num(f.healing)}</strong></div></div></article>`).join('')}</div>`;
}
// Gaps stay gaps; absent observations are never converted to zero.
export function chartModel(series,times){
  const count=Math.max(0,...series.map(s=>s.values?.length||0));
  const ts=Array.from({length:count},(_,i)=>Number.isFinite(times?.[i])?times[i]:i*60);
  const valid=series.flatMap(s=>(s.values||[]).filter(Number.isFinite));
  const lo=Math.min(0,...valid),hi=Math.max(1,...valid),rough=(hi-lo)/5;
  const power=10**Math.floor(Math.log10(rough)),step=([1,2,5,10].find(n=>n*power>=rough)||10)*power;
  return {count,times:ts,lo:Math.floor(lo/step)*step,hi:Math.ceil(hi/step)*step,step,maxTime:Math.max(60,...ts),valid:valid.length};
}
export function graphHTML(series,{title,times,teams=false,note}={}){
  series=series.filter(s=>s.values?.some(Number.isFinite));
  const model=chartModel(series,times);if(!model.valid)return `<p class="muted">${esc(title)}: график пока недоступен.</p>`;
  const {lo,hi,maxTime}=model,x=t=>70+t/maxTime*780,y=v=>276-(v-lo)/(hi-lo)*242;
  const grid=Array.from({length:Math.round((hi-lo)/model.step)+1},(_,i)=>{const v=lo+model.step*i;return `<line x1="70" y1="${y(v)}" x2="850" y2="${y(v)}" class="graph-grid"/><text x="60" y="${y(v)+4}" text-anchor="end">${num(v)}</text>`;}).join('');
  const timeStep=[60,120,300,600,900,1800,3600].find(t=>t>=maxTime/6)||Math.ceil(maxTime/6/3600)*3600;
  const tickTimes=Array.from({length:Math.floor(maxTime/timeStep)+1},(_,i)=>i*timeStep);
  if(maxTime-tickTimes.at(-1)>timeStep*.4)tickTimes.push(maxTime);
  const ticks=tickTimes.map(t=>`<line x1="${x(t)}" y1="34" x2="${x(t)}" y2="276" class="graph-grid"/><text x="${x(t)}" y="302" text-anchor="middle">${clock(t)}</text>`).join('');
  const paths=series.map(s=>{let connected=false;const d=s.values.map((v,i)=>{if(!Number.isFinite(v)){connected=false;return '';}const part=`${connected?'L':'M'}${x(model.times[i])},${y(v)}`;connected=true;return part;}).join(' ');return `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2.5" vector-effect="non-scaling-stroke"/>`;}).join('');
  const payload=esc(JSON.stringify({series,times:model.times}));
  return `<section class="dota-graph" data-graph="${payload}"><header><h4>${esc(title)}</h4><div class="graph-legend">${series.map(s=>`<span><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div></header>${teams?'<div class="team-labels"><span class="win">↑ Силы Света</span><span class="loss">↓ Силы Тьмы</span></div>':''}<svg viewBox="0 0 880 320" role="img" aria-label="${esc(title)}"><rect x="70" y="34" width="780" height="${Math.max(0,y(0)-34)}" fill="${teams?'#173428':'#18232d'}" opacity=".35"/>${teams?`<rect x="70" y="${y(0)}" width="780" height="${276-y(0)}" fill="#442121" opacity=".25"/>`:''}${grid}${ticks}<line x1="70" y1="${y(0)}" x2="850" y2="${y(0)}" stroke="#9aa7ab" stroke-opacity=".65"/>${paths}<line class="graph-cursor" x1="850" x2="850" y1="34" y2="276" stroke="#fff" stroke-dasharray="4 4" stroke-opacity=".7"/></svg><label class="graph-control">Момент игры <input type="range" min="0" max="${model.count-1}" value="${model.count-1}" aria-label="${esc(title)}: выбрать минуту"></label><output aria-live="polite"></output>${note?`<small>${esc(note)}</small>`:teams?'<small>Выше нуля — преимущество Света, ниже — Тьмы. Показана разница между командами.</small>':'<small>Заработанное золото — весь полученный доход, включая уже потраченный. Это не стоимость инвентаря.</small>'}</section>`;
}
export function economyHTML(m){
  const p=m.player||{};
  return graphHTML([{name:'Золото',color:'#efc34d',values:m.goldAdvantage},{name:'Опыт',color:'#b3d8f3',values:m.xpAdvantage}],{title:'Преимущество команд',teams:true})+
    graphHTML([{name:'Заработанное золото',color:'#efc34d',values:p.gold_t},{name:'Опыт',color:'#b3d8f3',values:p.xp_t}],{title:'Экономика игрока',times:p.times});
}
export function mountReplayVisuals(root=document){
  for(const graph of root.querySelectorAll('[data-graph]')){
    const {series,times}=JSON.parse(graph.dataset.graph),slider=graph.querySelector('input'),output=graph.querySelector('output');
    const update=()=>{const i=Number(slider.value),max=Math.max(60,...times),x=70+times[i]/max*780;const line=graph.querySelector('.graph-cursor');line.setAttribute('x1',x);line.setAttribute('x2',x);output.textContent=`${clock(times[i])} · ${series.map(s=>`${s.name}: ${num(s.values[i])}`).join(' · ')}`;slider.setAttribute('aria-valuetext',output.textContent);};
    slider.addEventListener('input',update);update();
    graph.querySelector('svg').addEventListener('pointerdown',e=>{const rect=e.currentTarget.getBoundingClientRect(),fraction=Math.max(0,Math.min(1,((e.clientX-rect.left)/rect.width*880-70)/780)),target=fraction*Math.max(60,...times);slider.value=times.reduce((best,t,i)=>Math.abs(t-target)<Math.abs(times[best]-target)?i:best,0);update();});
  }
}
