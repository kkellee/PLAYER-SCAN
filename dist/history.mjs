import {accountInput} from './analysis.mjs';
const KEY='player-scan-recent-searches-v1';
const storage=()=>{try{return globalThis.localStorage;}catch{return null;}};
export function readHistory(store=storage()) {
  try{const a=JSON.parse(store?.getItem(KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.input==='string'&&typeof x.key==='string'&&Number.isFinite(x.at)).slice(0,5):[];}catch{return [];}
}
export function rememberSearch(input,name='',store=storage(),at=Date.now()) {
  const parsed=accountInput(input),key=String(parsed.accountId||'vanity:'+parsed.vanity);
  const old=readHistory(store),previous=old.find(x=>x.key===key);
  const entry={key,input:parsed.accountId?String(parsed.accountId):String(input).trim(),name:String(name||previous?.name||'').slice(0,100),at};
  const next=[entry,...old.filter(x=>x.key!==key)].slice(0,5);
  try{store?.setItem(KEY,JSON.stringify(next));}catch{}
  return next;
}
export function clearHistory(store=storage()){try{store?.removeItem(KEY);}catch{}}
