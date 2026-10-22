import {openReplay} from './replay-view.mjs?v=viewer-1';
import {heroPortrait,clock} from './replay-visuals.mjs?v=roles-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function replayCardHTML(state,match){
  const kda=['kills','deaths','assists'].map(k=>Number.isFinite(match?.player?.[k])?match.player[k]:'—').join(' / ');
  const ready=!!match?.parsed;
  const labels={queued:'В очереди',complete:'Обнови отчёт',unavailable:'Разбор недоступен'};
  const status=ready?'Разбор готов':labels[state.status]||(match?.stratz?.parsedAt?'Частичный разбор':'Базовая статистика');
  const date=Number.isFinite(match?.startTime)?new Date(match.startTime*1000).toLocaleDateString('ru-RU'):'';
  return `<div class="replay-card-art">${heroPortrait(match?.heroId)||'<span class="replay-art-fallback">?</span>'}<span class="replay-card-status ${ready?'ready':''}">${esc(status)}</span></div><div class="replay-card-info"><span class="replay-outcome ${match?.win===true?'won':match?.win===false?'lost':'unknown'}">${match?.win===true?'ПОБЕДА':match?.win===false?'ПОРАЖЕНИЕ':'ИСХОД НЕИЗВЕСТЕН'}</span><strong>${esc(match?.hero||state.hero)}</strong><div class="replay-kda"><b>${kda}</b><span>Убийства / смерти / помощь</span></div><small>${esc(date)}${date&&Number.isFinite(match?.duration)?' · ':''}${Number.isFinite(match?.duration)?clock(match.duration):''}</small><small class="replay-card-id">Матч ${esc(state.matchId)}</small></div>`;
}
export const parsePanelHTML=()=>`<div class="parse-panel"><h2>Разборы реплеев</h2><p>Здесь все игры из отчёта, от новых к старым. «Открыть разбор» показывает доступную статистику выбранной игры. Отметка «Разбор готов» означает, что есть подробные данные реплея. Чтобы получить больше, отправь до трёх следующих игр на разбор. Старые реплеи могут быть недоступны.</p><div class="actions"><button id="parse-request">Запросить разбор</button><button id="parse-check" disabled>Проверить готовность</button></div><p id="parse-status" role="status" aria-live="polite"></p><ul id="parse-list"></ul></div>`;
export function mountParsing(scanner,report,{refresh,signal}){
  const request=document.querySelector('#parse-request'),check=document.querySelector('#parse-check'),status=document.querySelector('#parse-status'),list=document.querySelector('#parse-list');
  let busy=false;
  async function update(){
    const states=await scanner.parsingStates(report);list.replaceChildren();
    for(const m of report.matches){
      const s=states.find(s=>s.matchId===m.matchId)||{matchId:m.matchId,hero:m.hero},ready=!!m?.parsed;
      const li=document.createElement('li');li.className='replay-card';
      li.innerHTML=replayCardHTML(s,m);
      const portrait=li.querySelector('img');if(portrait)portrait.addEventListener('error',()=>{portrait.hidden=true;li.querySelector('.replay-card-art').classList.add('art-unavailable');});
      const button=document.createElement('button');button.type='button';button.textContent='Открыть разбор';button.setAttribute('aria-label',`Открыть разбор ${m.hero}, матч ${m.matchId}`);button.onclick=()=>openReplay(m.matchId);li.append(button);
      if(!ready&&s.status==='complete'){const updateButton=document.createElement('button');updateButton.textContent='Обновить отчёт';updateButton.onclick=refresh;li.append(updateButton);}
      if(!ready&&!s.status){const parse=document.createElement('button');parse.type='button';parse.textContent='Запросить подробности';parse.setAttribute('aria-label','Запросить подробности матча '+m.matchId);parse.onclick=()=>act(false,m.matchId);li.append(parse);}
      list.append(li);
    }
    const remaining=states.some(s=>!s.alreadyParsed&&!s.status),queued=states.some(s=>s.status==='queued');
    request.disabled=busy||!remaining;check.disabled=busy||!queued;
    if(!remaining&&!queued&&!states.some(s=>s.status==='unavailable'))status.textContent='Доступные реплеи уже разобраны.';
  }
  async function act(isCheck,matchId){
    if(busy)return;busy=true;request.disabled=true;check.disabled=true;
    try{
      const opts={signal,matchIds:matchId?[matchId]:undefined,onProgress:message=>status.textContent=message};
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
