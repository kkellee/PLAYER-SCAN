import test from 'node:test';import assert from 'node:assert/strict';
import {rememberSearch,readHistory,clearHistory} from '../dist/history.mjs';
function store(){const m=new Map();return {getItem:k=>m.get(k),setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};}
test('last five queries ordered newest first',()=>{const s=store();for(let i=1;i<=7;i++)rememberSearch(String(i),'',s,i);assert.deepEqual(readHistory(s).map(x=>x.key),['7','6','5','4','3']);});
test('Steam64 and Dota ID deduplicate and preserve nickname',()=>{const s=store();rememberSearch('123','Player',s,1);rememberSearch('76561197960265851','',s,2);assert.equal(readHistory(s).length,1);assert.equal(readHistory(s)[0].name,'Player');});
test('history is isolated per browser storage and clearable',()=>{const s=store(),other=store();rememberSearch('123','',s);assert.equal(readHistory(other).length,0);clearHistory(s);assert.deepEqual(readHistory(s),[]);});
test('blocked storage does not break a search',()=>{const s={getItem(){throw Error();},setItem(){throw Error();}};assert.doesNotThrow(()=>rememberSearch('123','',s));assert.deepEqual(readHistory(s),[]);});
