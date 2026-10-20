import test from 'node:test';
import assert from 'node:assert/strict';
import {replayCardHTML} from '../dist/parsing-ui.mjs';
test('ready replay card includes actual hero portrait and compact metadata',()=>{const html=replayCardHTML({matchId:123,hero:'Crystal Maiden'},{heroId:5,hero:'Crystal Maiden',parsed:true,startTime:1700000000,duration:1800});assert.match(html,/crystal_maiden.png/);assert.match(html,/Разбор готов/);assert.match(html,/30:00/);assert.match(html,/Матч 123/);});
test('unknown hero and incomplete states have an honest fallback',()=>{const html=replayCardHTML({matchId:123,hero:'Unknown',status:'queued'},null);assert.match(html,/replay-art-fallback/);assert.match(html,/В очереди/);assert.doesNotMatch(html,/undefined|NaN|Разбор готов/);});
test('hero names and IDs cannot inject HTML',()=>{const html=replayCardHTML({matchId:'<script>',hero:'<img onerror=alert(1)>'},null);assert.doesNotMatch(html,/<script>|<img onerror/);assert.match(html,/&lt;script&gt;/);});
