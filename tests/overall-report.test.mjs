import test from 'node:test';
import assert from 'node:assert/strict';
import {overallReportHTML} from '../dist/overall-report.mjs';
test('overall report covers roles, heroes, strengths and data gaps',()=>{const h=overallReportHTML({matches:[{heroId:5,hero:'Crystal Maiden',score:70,parsed:true}],score:70,roleSummary:[{role:'Поддержка',games:1,score:70}],comparisons:[{label:'Помощь',percentile:75,samples:10}],winrate:100});for(const text of ['Общий отчёт','70/100','Поддержка','Помощь','Crystal Maiden','пока не подтверждено'])assert.ok(h.includes(text));});
test('missing data never becomes a confident overall verdict',()=>{const h=overallReportHTML({matches:[],score:null});assert.match(h,/Данных для общей оценки пока недостаточно/);assert.doesNotMatch(h,/NaN|undefined/);});
test('untrusted hero names are escaped',()=>assert.doesNotMatch(overallReportHTML({matches:[{hero:'<script>',heroId:0}]}),/<script>/));
