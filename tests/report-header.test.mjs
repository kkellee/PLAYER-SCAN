import test from 'node:test';
import assert from 'node:assert/strict';
import {replayCardHTML} from '../dist/parsing-ui.mjs';
test('cards distinguish win loss and unknown outcome',()=>{for(const [win,label] of [[true,'ПОБЕДА'],[false,'ПОРАЖЕНИЕ'],[null,'ИСХОД НЕИЗВЕСТЕН']])assert.ok(replayCardHTML({matchId:1},{win,hero:'Tusk',heroId:100}).includes(label));});
