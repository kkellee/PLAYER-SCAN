import {openReplay} from './replay-view.mjs?v=roles-1';
import {heroPortrait,clock} from './replay-visuals.mjs?v=roles-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function replayCardHTML(state,match){
  const ready=!!(match?.parsed||match?.stratz?.parsedAt);
  const labels={queued:'В очереди',complete:'Обнови отчёт',unavailable:'Разбор недоступен'};
  const status=ready?'Разбор готов':labels[state.status]||'Ожидает разбора';
  const date=Number.isFinite(match?.startTime)?new Date(match.startTime*1000).toLocaleDateString('ru-RU'):'';
  return `<div class="replay-card-art">${heroPortrait(match?.heroId)||'<span class="replay-art-fallback">?</span>'}<span class="replay-card-status ${ready?'ready':''}">${esc(status)}</span></div><div class="replay-card-info"><strong>${esc(match?.hero||state.hero)}</strong><small>${esc(date)}${date&&Number.isFinite(match?.duration)?' · ':''}${Number.isFinite(match?.duration)?clock(match.duration):''}</small><small class="replay-card-id">Матч ${esc(state.matchId)}</small></div>`;
}
export const parsePanelHTML=()=>`<div class="parse-panel"><h2>Разборы реплеев</h2><p>Готовые разборы открываются кнопкой рядом с матчем: краткие итоги, позиции на линии, покупки и события драк. Чтобы получить больше, отправь до трёх следующих игр на разбор. Старые реплеи могут быть недоступны.</p><div class="actions"><button id="parse-request">Запросить разбор</button><button id="parse-check" disabled>Проверить готовность</button></div><p id="parse-status" role="status" aria-live="polite"></p><ul id="parse-list"></ul></div>`;
export function mountParsing(scanner,report,{refresh,signal}){
  const request=document.querySelector('#parse-request'),check=document.querySelector('#parse-check'),status=document.querySelector('#parse-status'),list=document.querySelector('#parse-list');
  let busy=false;
  async function update(){
    const states=await scanner.parsingStates(report);list.replaceChildren();
    for(const s of states){
      const m=report.matches.find(m=>m.matchId===s.matchId),ready=!!(m?.parsed||m?.stratz?.parsedAt);
      if(!ready&&!s.status)continue;
      const li=document.createElement('li');li.className='replay-card';
      li.innerHTML=replayCardHTML(s,m);
      const portrait=li.querySelector('img');if(portrait)portrait.addEventListener('error',()=>{portrait.hidden=true;li.querySelector('.replay-card-art').classList.add('art-unavailable');});
      if(ready){const button=document.createElement('button');button.type='button';button.textContent='Открыть разбор';button.setAttribute('aria-label',`Открыть разбор ${s.hero}, матч ${s.matchId}`);button.onclick=()=>openReplay(s.matchId);li.append(button);}
      else if(s.status==='complete'){const button=document.createElement('button');button.textContent='Обновить отчёт';button.onclick=refresh;li.append(button);}
      list.append(li);
    }
    const remaining=states.some(s=>!s.alreadyParsed&&!s.status),queued=states.some(s=>s.status==='queued');
    request.disabled=busy||!remaining;check.disabled=busy||!queued;
    if(!remaining&&!queued&&!states.some(s=>s.status==='unavailable'))status.textContent='Доступные реплеи уже разобраны.';
  }
  async function act(isCheck){
    if(busy)return;busy=true;request.disabled=true;check.disabled=true;
    try{
      const opts={signal,onProgress:message=>status.textContent=message};
      if(isCheck){
        const result=await scanner.checkParsing(report,opts);
        if(result.completed){await refresh();const next=document.querySelector('#parse-status');if(next)next.textContent='Разборы готовы. Нажми «Открыть разбор» рядом с нужным матчем.';return;}
        status.textContent='Статусы обновлены. Если разбор ещё в очереди, проверь готовность позже.';
      }else{
        await scanner.requestParsing(report,opts);status.textContent='Запросы отправлены. Нажми «Проверить готовность», чтобы добавить готовые разборы в отчёт.';
      }
    }catch(e){if(e.name!=='AbortError')status.textContent=e.status===429?'Слишком много запросов. Подожди и попробуй позже.':'Не удалось завершить запрос. Уже отправленные реплеи остаются в очереди; проверь готовность позже.';}
    finally{busy=false;if(request.isConnected)await update();}
  }
  request.onclick=()=>act(false);check.onclick=()=>act(true);update();
}
