import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {metricTone,metricIcon} from '../dist/metric-style.mjs';
test('semantic metric colors and accessible decorative icons',()=>{assert.equal(metricTone('gold_per_min'),'gold');assert.equal(metricTone('xp_per_min'),'xp');assert.equal(metricTone('tower_damage'),'damage');assert.equal(metricTone('obs_placed'),'vision');assert.match(metricIcon('kills'),/aria-hidden="true"/);});
test('compact sheet is loaded and full report remains expandable',()=>{assert.match(fs.readFileSync(new URL('../dist/report.html',import.meta.url),'utf8'),/compact.css/);assert.match(fs.readFileSync(new URL('../dist/overall-report.mjs',import.meta.url),'utf8'),/<details class="overall-details">/);});
