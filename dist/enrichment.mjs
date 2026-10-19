export const STRATZ_ENDPOINT='https://player-scan.keen-krill-5922.chatgpt.site/api/stratz';
export function combineReport(base, data) {
  if(data.accountId!==base.accountId || !Array.isArray(data.matches))throw new Error('Источник вернул другой профиль.');
  const matches=base.matches.map(m=>{
    const extra=data.matches.find(s=>s.matchId===m.matchId && s.heroId===m.heroId);
    return {...m,stratz:extra||null};
  });
  // Compare the same eligible games, never add duplicated K/D/A or average unlike score scales.
  const paired=matches.filter(m=>m.score!==null && Number.isFinite(m.score) && Number.isFinite(m.stratz?.imp));
  const count=paired.length;
  const mean=count?paired.reduce((s,m)=>s+m.stratz.imp,0)/count:null;
  const positive=paired.filter(m=>m.stratz.imp>0).length,negative=paired.filter(m=>m.stratz.imp<0).length;
  const odMean=count?paired.reduce((s,m)=>s+m.score,0)/count:null;
  let summary='Для сверки оценок нужны минимум 10 одинаковых игр с оценками обоих источников. Основной вывод пока основан на OpenDota.';
  let verdict=base.verdict,tone=base.tone,description=base.description,disagreement=false;
  if(count>=10){
    disagreement=(odMean<43&&positive/count>=.6)||(odMean>=58&&negative/count>=.6);
    summary=disagreement?'Источники расходятся: показатели OpenDota и знак IMP STRATZ дают разные сигналы. Однозначный ярлык по этой серии ненадёжен.':(odMean<43&&negative/count>=.6)||(odMean>=58&&positive/count>=.6)?'Направление оценок совпадает: показатели OpenDota и знак IMP STRATZ поддерживают общий вывод.':'STRATZ дополняет картину, но однозначного подтверждения оценки OpenDota нет.';
    if(disagreement){verdict='СМЕШАННАЯ КАРТИНА';tone='neutral';description=summary;}
    else description+=' '+summary;
  }
  const found=matches.filter(m=>m.stratz).length;
  return {...base,version:base.version+'+sources-1',verdict,tone,description,matches,
    sourceComparison:{count,mean,positive,negative,odMean,disagreement,summary,originalVerdict:base.verdict},
    stratz:{status:'ok',found,generatedAt:data.generatedAt,cacheHit:!!data.cacheHit},
    sources:{...base.sources,stratz:`Получены данные STRATZ для ${found} из ${matches.length} матчей. IMP доступен для сверки в ${count} играх.`,dotabuff:'Переход к профилю и матчам. Автоматический доступ к статистике Dotabuff не подключён; в вердикте она не используется.'}};
}
export async function enrichReport(base,{fetcher=fetch,signal,onProgress=()=>{},sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}) {
  const fallback=message=>({...base,stratz:{status:'unavailable',message},sources:{...base.sources,stratz:message,dotabuff:'Только ссылки для проверки. Данные Dotabuff не участвуют в вердикте.'}});
  if(!base.matches.length)return fallback('Нет матчей для сверки со STRATZ.');
  onProgress('Сверяем те же матчи со STRATZ…');
  try{
    let response;
    for(let attempt=0;attempt<3;attempt++){
      if(signal?.aborted)throw new DOMException('Отменено','AbortError');
      response=await fetcher(STRATZ_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000),body:JSON.stringify({accountId:base.accountId,matchIds:base.matches.map(m=>m.matchId).slice(0,20)})});
      if(response.status!==409 || attempt===2)break;
      await sleep(4000);
    }
    if(!response.ok)return fallback('STRATZ сейчас недоступен или ограничил запросы. Показан отчёт OpenDota; обнови страницу позже.');
    return combineReport(base,await response.json());
  }catch(error){if(signal?.aborted)throw error;return fallback('STRATZ не ответил. Показан отчёт OpenDota; обнови страницу позже.');}
}
