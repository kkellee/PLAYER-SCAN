import test from 'node:test';
import assert from 'node:assert/strict';
import {plainSummary} from '../dist/verdict-explanation.mjs';
test('intro explains each verdict without scoring jargon or numbers',()=>{for(const verdict of ['В ПРЕДЕЛАХ НОРМЫ','НЕ В ФОРМЕ','СКРЫТОПУЛЬНЫЙ','ТАЩИТ','НАДЁЖНЫЙ ТИММЕЙТ','НЕСТАБИЛЬНЫЙ','СМЕШАННАЯ КАРТИНА','НЕДОСТАТОЧНО ДАННЫХ']){const text=plainSummary({verdict});assert.ok(text.length>80);assert.doesNotMatch(text,/индекс|процентил|\d/);}});
