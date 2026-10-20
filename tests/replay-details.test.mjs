import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceInfo,entriesFor,rankingHTML,wardEvents,wardPointValid,visionHTML,timelineEvents,eventsHTML,combatHTML,farmHTML} from '../dist/replay-details.mjs';
test('sources resolve actual ability and item art; ordinary attacks have no fake item',()=>{
  assert.equal(sourceInfo('tusk_ice_shards').name,'Ice Shards');
  assert.match(sourceInfo('tusk_ice_shards').img,/abilities\/tusk_ice_shards.png/);
  assert.equal(sourceInfo('blood_grenade').name,'Blood Grenade');
  assert.equal(sourceInfo('null').img,undefined);
  assert.match(sourceInfo('tusk_launch_snowball').img,/tusk_snowball.png/);
  assert.equal(sourceInfo('plus_high_five').img,undefined);
});
test('breakdowns preserve zero and exclude absent, negative and malformed observations',()=>{
  assert.deepEqual(entriesFor({a:null,b:0,c:100,d:'10',e:-4}),[['c',100],['b',0]]);
  const html=rankingHTML({tusk_snowball:75,null:25},{title:'Урон',share:true});
  assert.match(html,/75%/);assert.match(html,/25%/);assert.doesNotMatch(html,/NaN/);
});
test('unknown names are escaped and missing breakdown is explained',()=>{
  assert.doesNotMatch(rankingHTML({'<img onerror=x>':3},{title:'test'}),/<img onerror/);
  assert.match(rankingHTML(undefined,{title:'Урон'}),/Нет подробностей/);
});
test('wards use true coordinates, sort by time and ignore removal events',()=>{
  const events=wardEvents({obs_log:[{x:64,y:191,time:20},{x:90,y:100,time:30,entityleft:true}],sen_log:[{x:191,y:64,time:10},{time:40}]});
  assert.equal(events.length,3);assert.equal(events[0].kind,'sentry');assert.equal(events[0].mapX,127);assert.equal(events[1].mapY,0);assert.ok(wardPointValid(events[0]));assert.equal(wardPointValid(events[2]),false);
});
test('vision UI has separate toggles and distinguishes unavailable coordinates',()=>{
  const html=visionHTML({patch:60,player:{obs_placed:0,sen_log:[{time:50}]}});
  assert.match(html,/data-ward-filter="observer"/);assert.match(html,/без координат/);assert.match(html,/disabled/);
});
test('kill timeline resolves hero, merges buybacks and exact deaths without inventing timestamps',()=>{
  const events=timelineEvents({player:{kills_log:[{time:30,key:'npc_dota_hero_luna'}],buyback_log:[{time:40}]},stratz:{deaths:[{time:20,goldLost:100,timeDead:25},{goldLost:50}]}});
  assert.deepEqual(events.map(e=>e.kind),['death','kill','buyback']);assert.match(events[1].title,/Luna/);
  assert.match(eventsHTML({player:{life_state_dead:90}}),/1:30/);
});
test('farm chart has meaningful caption, no income caption on last-hit chart',()=>{
  const html=farmHTML({player:{lh_t:[0,4,9],times:[0,60,120]}});
  assert.match(html,/Общее количество добиваний/);assert.doesNotMatch(html,/весь полученный доход/);
});
test('utility actions separated from combat abilities and counts remain visible',()=>{
  const html=combatHTML({player:{ability_uses:{plus_high_five:1,tusk_ice_shards:3}}});
  assert.match(html,/Другие действия/);assert.match(html,/Дать пять/);assert.match(html,/Ice Shards/);
});
test('runes use known game asset IDs and remain in chronological order',()=>{
  const list=timelineEvents({player:{runes_log:[{time:891,key:'6'},{time:786,key:'5'}]}});
  assert.equal(list[0].title,'Руна: Богатство');assert.match(list[1].art,/\/6.png$/);
});
test('long breakdown keeps every value behind an expandable section',()=>{
  const html=rankingHTML(Object.fromEntries(Array.from({length:12},(_,i)=>['source_'+i,i])),{title:'Источники'});
  assert.match(html,/Показать остальные \(4\)/);assert.equal((html.match(/class="source-row"/g)||[]).length,12);
});
