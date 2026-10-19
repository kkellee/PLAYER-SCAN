export function validateRequest(body) {
  const id = body?.accountId, ids = body?.matchIds;
  if (!Number.isSafeInteger(id) || id <= 0 || id >= 4294967295 || !Array.isArray(ids) || !ids.length || ids.length > 20 || ids.some(x => !Number.isSafeInteger(x) || x <= 0 || x > 1e13)) throw new Error('Некорректный ID или список матчей (от 1 до 20).');
  return {id, ids:[...new Set(ids)].sort((a,b)=>a-b)};
}
export const QUERY = `query PlayerScan($id: Long!, $ids: [Long]) {
  player(steamAccountId: $id) {
    steamAccountId
    matches(request: {matchIds: $ids, take: 20}) {
      id durationSeconds startDateTime parsedDateTime statsDateTime
      players(steamAccountId: $id) {
        steamAccountId heroId position role lane imp
        stats {
          impPerMinute
          wards { time type positionX positionY }
          deathEvents { time timeDead goldLost positionX positionY isDieBack isAttemptTpOut }
        }
      }
    }
  }
}`;
export function normalize(data, id, ids) {
  if (data.errors?.length) throw new Error('STRATZ не смог завершить запрос.');
  const player = data.data?.player;
  if (player && player.steamAccountId !== id) throw new Error('STRATZ вернул другой профиль.');
  const matches = (player?.matches || []).filter(m=>ids.includes(m.id)).flatMap(m=>{
    const p=m.players?.find(p=>p.steamAccountId===id);
    if (!p) return [];
    return [{matchId:m.id, heroId:p.heroId, duration:m.durationSeconds, position:p.position??null, role:p.role??null, lane:p.lane??null,
      imp:typeof p.imp==='number' && Number.isFinite(p.imp)?p.imp:null,
      parsedAt:m.parsedDateTime??null, statsAt:m.statsDateTime??null,
      impPerMinute:p.stats?.impPerMinute?.slice(0,240)??null,
      wards:p.stats?.wards?.slice(0,300)??null, deaths:p.stats?.deathEvents?.slice(0,150)??null}];
  });
  return {provider:'STRATZ',accountId:id,generatedAt:new Date().toISOString(),matches};
}
