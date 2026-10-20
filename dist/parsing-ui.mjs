import {openReplay} from './replay-view.mjs';
export const parsePanelHTML=()=>`<div class="parse-panel"><h2>Разборы реплеев</h2><p>Готовые разборы открываются кнопкой рядом с матчем: краткие итоги, позиции на линии, покупки и события драк. Чтобы получить больше, отправь до трёх следующих каток на разбор. Старые реплеи могут быть недоступны.</p><div class="actions"><button id="parse-request">Запросить разбор</button><button id="parse-check" disabled>Проверить готовность</button></div><p id="parse-status" role="status" aria-live="polite"></p><ul id="parse-list"></ul></div>`;
export function mountParsing(scanner,report,{refresh,signal}){
  const request=document.querySelector('#parse-request'),check=document.querySelector('#parse-check'),status=document.querySelector('#parse-status'),list=document.querySelector('#parse-list');
  let busy=false;
  const labels={queued:'В очереди на разбор',complete:'Разбор готов',unavailable:'Реплей недоступен или разбор не завершился'};
  async function update(){
    const states=await scanner.parsingStates(report);list.replaceChildren();
    for(const s of states){
      const m=report.matches.find(m=>m.matchId===s.matchId),ready=!!(m?.parsed||m?.stratz?.parsedAt);
      if(!ready&&!s.status)continue;
      const li=document.createElement('li'),text=document.createElement('span');
      text.textContent=`${s.hero} · ${s.matchId}: ${ready?'Разбор доступен':s.status==='complete'?'Нужно обновить данные':labels[s.status]}`;li.append(text);
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
