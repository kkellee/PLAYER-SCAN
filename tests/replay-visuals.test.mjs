import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mapPoints,chartModel,graphHTML,purchasesHTML,fightsHTML,laneMapHTML,clock,itemInfo} from '../dist/replay-visuals.mjs';
test('coordinates use Dota world bounds and discard invalid points',()=>{
  assert.deepEqual(mapPoints({64:{191:2},191:{64:1},999:{88:3},80:{80:0}}),[{x:0,y:0,v:2},{x:127,y:127,v:1}]);
});
test('purchase timeline uses game art, proper names and negative pregame times',()=>{
  const html=purchasesHTML({purchase_log:[{time:-89,key:'tango'},{time:90,key:'blood_grenade'},{time:100,key:'<img onerror=x>'}]});
  assert.match(html,/dota_react\/items\/tango.png/);assert.match(html,/Tango/);assert.match(html,/−1:29/);assert.doesNotMatch(html,/<img onerror/);
  assert.equal(clock(60),'1:00');assert.equal(itemInfo('magic_stick').name,'Magic Stick');
});
test('empty and missing graph data are not fabricated',()=>{
  assert.equal(chartModel([{values:[null,undefined]}]).valid,0);
  assert.match(graphHTML([],{title:'Золото'}),/недоступен/);
  const html=graphHTML([{name:'Золото',color:'#fff',values:[-10,null,50]}],{title:'График',teams:true});
  assert.match(html,/d="M[^"]* M/);assert.doesNotMatch(html,/NaN|undefined/);
});
test('graph uses actual timestamps and scales negative values',()=>{
  const m=chartModel([{values:[-300,200,900]}],[0,30,120]);
  assert.deepEqual(m.times,[0,30,120]);assert.equal(m.maxTime,120);assert.ok(m.lo<0);
});
test('fights show missing values and never claim absence of participation as fact',()=>{
  const html=fightsHTML({heroId:100,fights:[{start:100,end:125,damage:0,deaths:0,involved:false}]});
  assert.match(html,/Участие не подтверждено/);assert.match(html,/1:40 — 2:05/);assert.doesNotMatch(html,/NaN|undefined/);
});
test('lane view has map art and accurate scope caption',()=>{
  const html=laneMapHTML({patch:60,hero:'Tusk',heroId:100,player:{lane_pos:{100:{110:4}}}});
  assert.match(html,/detailed_740.webp/);assert.match(html,/не показывает последовательность/);
});
test('report has no raw code panels and mounts all visual components',()=>{
  const s=fs.readFileSync(new URL('../dist/report.js',import.meta.url),'utf8');
  assert.doesNotMatch(s,/<pre>|Все полученные показатели игрока|Подробности событий/);
  for(const name of ['purchasesHTML(p)','fightsHTML(m)','laneMapHTML(m)','economyHTML(m)','mountReplayVisuals();'])assert.ok(s.includes(name),name);
});
