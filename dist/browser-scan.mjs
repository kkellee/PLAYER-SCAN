import { accountInput, compactMatch, playerMatch, buildReport, VERSION } from './analysis.mjs';

const PREFIX = 'player-scan-v1:';
const memory = new Map();
let dbPromise;
function database() {
  if (!dbPromise) dbPromise = new Promise(resolve => {
    if (!globalThis.indexedDB) return resolve(null);
    const request = indexedDB.open('player-scan-cache', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('entries');
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () => resolve(null);
  });
  return dbPromise;
}
export function browserStorage() {
  return {
    async get(key) {
      const db = await database();
      if (!db) return memory.get(key);
      return new Promise(resolve => {
        try {
          const r = db.transaction('entries').objectStore('entries').get(key);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => resolve(memory.get(key));
        } catch { resolve(memory.get(key)); }
      });
    },
    async set(key, value) {
      memory.set(key, value);
      const db = await database();
      if (!db) return;
      await new Promise(resolve => {
        try {
          const t = db.transaction('entries', 'readwrite');
          t.objectStore('entries').put(value, key);
          t.oncomplete = t.onerror = t.onabort = () => resolve();
        } catch { resolve(); }
      });
    },
    async prune(now) {
      for (const [key, row] of memory) if (row.expires <= now) memory.delete(key);
      const db = await database();
      if (!db) return;
      await new Promise(resolve => {
        const t = db.transaction('entries', 'readwrite');
        const rows = [];
        const request = t.objectStore('entries').openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) {
            if (cursor.value.expires <= now) cursor.delete();
            else rows.push({key:cursor.key, saved:cursor.value.saved || 0});
            cursor.continue();
          } else {
            rows.sort((a,b) => b.saved-a.saved);
            for (const row of rows.slice(300)) if (!String(row.key).includes('quota')) t.objectStore('entries').delete(row.key);
          }
        };
        t.oncomplete = t.onerror = t.onabort = () => resolve();
      });
    }
  };
}

export class ScanError extends Error {
  constructor(message, status = 0) { super(message); this.status = status; }
}
export function createBrowserScanner({ storage = browserStorage(), fetcher = globalThis.fetch, clock = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), lock = task => globalThis.navigator?.locks
    ? navigator.locks.request('player-scan-opendota', task) : task() } = {}) {
  const read = async key => { const r = await storage.get(PREFIX + key); return r && r.expires > clock() ? r.value : null; };
  const write = (key, value, ttl) => storage.set(PREFIX + key, {value, saved:clock(), expires:clock()+ttl});
  const aborted = signal => { if (signal?.aborted) throw new DOMException('Отменено', 'AbortError'); };
  async function request(path, ttl, signal, progress, transform = x => x, options = {}) {
    aborted(signal);
    const cacheKey = options.method === 'POST' ? 'submit:'+path : path;
    const existing = await read(cacheKey);
    if (existing !== null) return existing;
    const quota = await read('quota') || { day:Math.floor(clock()/86400000), count:0, next:0, blockedUntil:0 };
    const day = Math.floor(clock()/86400000);
    if (quota.day !== day) { quota.day = day; quota.count = 0; }
    if (quota.blockedUntil > clock()) throw new ScanError('OpenDota временно ограничила запросы. Уже полученные матчи сохранены. Повтори после ' + new Date(quota.blockedUntil).toLocaleString('ru-RU') + '.', 429);
    const cost = options.method === 'POST' ? 10 : 1;
    if (quota.count + cost > 2000) throw new ScanError('Достигнут дневной предел запросов. Новые проверки — завтра.', 429);
    if (quota.next > clock()) await sleep(quota.next-clock());
    aborted(signal);
    quota.count += cost;
    quota.next = clock() + 1600 * cost;
    await write('quota', quota, 172800000);
    let response;
    try {
      const timeout = AbortSignal.timeout(25000);
      response = await fetcher('https://api.opendota.com/api' + path, {
        method:options.method || 'GET', credentials:'omit', signal:signal ? AbortSignal.any([signal, timeout]) : timeout,
        headers:{Accept:'application/json'}
      });
    } catch (error) {
      aborted(signal);
      throw new ScanError('Не удалось связаться с OpenDota. Проверь соединение и повтори: загруженные матчи сохранены.');
    }
    if (response.status === 429) {
      let reason = ''; try { reason = (await response.json()).error || ''; } catch {}
      const daily = /daily/i.test(reason);
      const retry = Number(response.headers.get('retry-after'));
      quota.blockedUntil = daily ? (day+1)*86400000+60000 : clock()+Math.max(60000, Number.isFinite(retry) ? retry*1000 : 0);
      await write('quota', quota, 172800000);
      throw new ScanError(daily ? 'Дневной лимит OpenDota для твоего подключения исчерпан. Полученные матчи сохранены. Повтори завтра.' : 'OpenDota просит снизить частоту запросов. Подожди минимум минуту и повтори — загруженные матчи сохранены.', 429);
    }
    if (!response.ok) {
      let message = 'OpenDota временно не вернула данные.';
      if (response.status === 404) {
        const player = path.match(/^\/players\/(\d+)(\/recentMatches)?$/);
        message = player
          ? `OpenDota не вернула ${player[2] ? 'историю матчей' : 'профиль'} для Dota ID ${player[1]}. Проверь, что скопированы все цифры ID. Можно ввести полную числовую ссылку Steam /profiles/7656… Отсутствие данных в OpenDota не означает, что Steam-аккаунта не существует.`
          : 'Данные матча не найдены в OpenDota.';
      }
      throw new ScanError(message, response.status);
    }
    let value;
    try { value = transform(await response.json()); }
    catch { throw new ScanError('OpenDota вернула неполные данные. Попробуй позже.', 502); }
    // Unparsed match data is refreshed sooner so new replay analysis can appear.
    const actualTTL = path.startsWith('/matches/') && value.version == null ? 900000 : ttl;
    await write(cacheKey, value, actualTTL);
    return value;
  }
  const scan = async function(input, { signal, onProgress = () => {} } = {}) {
    const {accountId:id, vanity} = accountInput(input);
    if (vanity) throw new ScanError('Для ссылки /id/имя нужен отдельный доступ Steam. Сейчас введи числовой Dota ID, Steam ID или ссылку /profiles/7656…', 422);
    onProgress('Проверяем сохранённый отчёт…', 0);
    return lock(async () => {
      aborted(signal);
      const cached = await read('report:'+VERSION+':'+id);
      if (cached) return {...cached, cacheHit:true};
      await storage.prune?.(clock());
      onProgress('Получаем профиль из OpenDota…', 0);
      const profile = await request('/players/'+id, 3600000, signal, onProgress);
      const recent = await request('/players/'+id+'/recentMatches', 600000, signal, onProgress);
      if (!profile || !Array.isArray(recent)) throw new ScanError('OpenDota вернула некорректную историю.', 502);
      const selected = recent.slice(0,20), matches = [], failures = [];
      for (let i=0; i<selected.length; i++) {
        const matchId = selected[i].match_id;
        if (!Number.isSafeInteger(matchId) || matchId <= 0) throw new ScanError('Некорректный номер матча у источника.', 502);
        onProgress(`Загружаем матч ${i+1} из ${selected.length}. Полученные данные сохраняются в этом браузере.`, i);
        try {
          const match = await request('/matches/'+matchId, 2592000000, signal, onProgress, compactMatch);
          matches.push(playerMatch(match, id));
        } catch (error) {
          if (error.status !== 404) throw error;
          failures.push(matchId);
        }
      }
      onProgress('Готовим вывод и пояснения…', selected.length);
      let heroes = [];
      try { heroes = await request('/heroes', 604800000, signal, onProgress); }
      catch (error) { if (error.name === 'AbortError') throw error; }
      const report = buildReport({...profile,account_id:id}, selected, matches, Object.fromEntries((Array.isArray(heroes)?heroes:[]).map(h=>[h.id,h.localized_name])));
      report.failures = failures;
      report.sources = {steam:'Числовые Steam ID поддерживаются. Персональные ссылки /id/ пока недоступны.', stratz:'Источник статистики — OpenDota. Dotabuff и STRATZ доступны по ссылкам для самостоятельного просмотра.'};
      report.delivery = 'browser';
      await write('report:'+VERSION+':'+id, report, failures.length ? 300000 : 1800000);
      return report;
    });
  };
  const validMatch = id => {if(!Number.isSafeInteger(id)||id<=0)throw new ScanError('Некорректный номер матча.',400);};
  scan.parsingStates = async report => Promise.all(report.matches.map(async m=>({...await read('replay:'+m.matchId),matchId:m.matchId,hero:m.hero,alreadyParsed:m.parsed})));
  scan.requestParsing = async (report,{signal,onProgress=()=>{},matchIds}={}) => lock(async()=>{
    const states=await scan.parsingStates(report);
    const candidates=states.filter(s=>!s.alreadyParsed&&!s.status&&(!matchIds||matchIds.includes(s.matchId))).slice(0,3);
    for(const m of candidates){
      validMatch(m.matchId);aborted(signal);onProgress(`Отправляем реплей: ${m.hero}…`);
      try {
        const result=await request('/request/'+m.matchId,86400000,signal,onProgress,x=>x,{method:'POST'});
        const jobId=String(result?.job?.jobId||'');
        if(!/^\d+$/.test(jobId))throw new ScanError('Не удалось подтвердить постановку реплея в очередь.',502);
        await write('replay:'+m.matchId,{jobId,status:'queued'},86400000);
      }catch(e){
        if([400,404,410].includes(e.status)){await write('replay:'+m.matchId,{status:'unavailable'},86400000);continue;}
        throw e;
      }
    }
    return scan.parsingStates(report);
  });
  scan.checkParsing = async (report,{signal,onProgress=()=>{}}={}) => lock(async()=>{
    const states=await scan.parsingStates(report);
    let completed=0;
    for(const m of states.filter(s=>s.status==='queued')){
      aborted(signal);onProgress(`Проверяем разбор: ${m.hero}…`);
      const job=await request('/request/'+m.jobId,0,signal,onProgress);
      // A disappeared job alone is NOT evidence of successful parsing.
      if(job && !['completed','failed'].includes(job.state) && !job.failedReason)continue;
      await write('/matches/'+m.matchId,null,0);
      const match=await request('/matches/'+m.matchId,2592000000,signal,onProgress,compactMatch);
      if(match.version!=null){
        await write('replay:'+m.matchId,{status:'complete'},86400000);
        await write('report:'+VERSION+':'+report.accountId,null,0);completed++;
      }else if(!job || job.state==='failed' || job.failedReason){
        await write('replay:'+m.matchId,{status:'unavailable'},86400000);
      }
    }
    return {completed,states:await scan.parsingStates(report)};
  });
  return scan;
}
