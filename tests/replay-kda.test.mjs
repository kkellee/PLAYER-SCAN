import test from 'node:test';import assert from 'node:assert/strict';import {replayCardHTML} from '../dist/parsing-ui.mjs';
test('card shows personal kills deaths assists including zero',()=>{assert.match(replayCardHTML({matchId:1},{player:{kills:3,deaths:0,assists:12}}),/3 \/ 0 \/ 12/);});
test('absent KDA stays unknown',()=>{assert.match(replayCardHTML({matchId:1},{}),/— \/ — \/ —/);});
