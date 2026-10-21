import test from 'node:test';import assert from 'node:assert/strict';
import {rankGroup,compareCohorts,enrichCohorts,cohortMetricHTML} from '../dist/cohort-comparison.mjs';
const match=(hero=5,kills=10)=>({heroId:hero,duration:1800,mode:22,player:{position_est:5,kills},metrics:[]});
const row=(hero=5,kills=5)=>({heroId:hero,time:30,position:'POSITION_5',bracketBasicIds:'LEGEND_ANCIENT',remainingMatchCount:1000,kills});
test('ranks are broad groups, unknown rank stays unavailable',()=>{assert.equal(rankGroup(65).id,'LEGEND_ANCIENT');assert.equal(rankGroup(null),null);assert.equal(rankGroup(0),null);});
test('cohort weights follow player hero mix, not population size',()=>{const c=compareCohorts({rank:65,matches:[match(),match(),match(1,20)]},{bracket:'LEGEND_ANCIENT',rows:[row(),row(1,20)]});assert.equal(c.matchedGames,3);assert.equal(c.metrics.kills.expected,10);assert.equal(c.metrics.kills.actual,40/3);});
test('wrong role, time, hero or small sample not compared',()=>{for(const r of [{...row(),time:25},{...row(),position:'POSITION_1'},{...row(),heroId:2},{...row(),remainingMatchCount:99}])assert.equal(compareCohorts({rank:65,matches:[match()]},{bracket:'LEGEND_ANCIENT',rows:[r]}).matchedGames,0);});
test('null metrics remain missing and zero benchmark has no percent',()=>{const c=compareCohorts({rank:65,matches:[match()]},{bracket:'LEGEND_ANCIENT',rows:[row(5,0)]});assert.equal(c.metrics.kills.delta,null);assert.equal(c.metrics.gold_per_min,undefined);assert.match(cohortMetricHTML(c,'kills'),/нулевом/);});
test('API failure does not remove player report',async()=>{const r=await enrichCohorts({rank:65,matches:[match()],score:60},{fetcher:async()=>({ok:false})});assert.equal(r.score,60);assert.equal(r.cohortComparison.matchedGames,0);});
