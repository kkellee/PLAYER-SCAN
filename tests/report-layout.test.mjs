import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
test('replays follow verdict, contribution, explanation and series statistics',()=>{
 const source=fs.readFileSync(new URL('../dist/report.js',import.meta.url),'utf8');
 const render=source.slice(source.indexOf('function render('));
 const markers=['class="report-card verdict','${sourcesHTML(r)}','<h2>Почему такой вывод</h2>','<h2>Статистика серии</h2>','${parsePanelHTML()}','<h2>Последние игры</h2>'];
 const positions=markers.map(x=>render.indexOf(x));
 assert.ok(positions.every((x,i)=>x>=0&&(i===0||x>positions[i-1])));
 assert.equal(render.split('${parsePanelHTML()}').length-1,1);
});
