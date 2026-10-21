import {heroPortrait} from './replay-visuals.mjs?v=roles-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const n=v=>Number.isFinite(v)?v.toLocaleString('ru-RU',{maximumFractionDigits:1}):'—';
export function overallReportHTML(r){
 const games=r.matches||[],scored=games.filter(m=>Number.isFinite(m.score));
 const strong=scored.filter(m=>m.score>=65).length,weak=scored.filter(m=>m.score<40).length;
 const metrics=(r.comparisons||[]).filter(x=>Number.isFinite(x.percentile)&&x.samples>=5);
 const strengths=metrics.filter(x=>x.percentile>=60).sort((a,b)=>b.percentile-a.percentile);
 const weaknesses=metrics.filter(x=>x.percentile<40).sort((a,b)=>a.percentile-b.percentile);
 const groups=Object.values(games.reduce((a,m)=>{const g=a[m.heroId]??={id:m.heroId,name:m.hero,count:0,scores:[]};g.count++;if(Number.isFinite(m.score))g.scores.push(m.score);return a;},{})).sort((a,b)=>b.count-a.count);
 const parsed=games.filter(m=>m.parsed||m.stratz?.parsedAt).length;
 const costly=games.filter(m=>(m.fights||[]).some(f=>f.deaths>0&&f.goldDelta<0));
 const facts=xs=>xs.length?'<ul>'+xs.map(x=>`<li><b>${esc(x.label)}</b>: ${n(x.percentile)}/100 · игр с данными: ${x.samples}.</li>`).join('')+'</ul>':'<p class="muted">Устойчиво выраженных отклонений по доступной выборке не выделено.</p>';
 return `<section class="overall-report"><h2>Общий отчёт</h2><p>Система разобрала доступные показатели ${games.length} игр. Для итоговой оценки подошли ${scored.length}. ${Number.isFinite(r.score)?`Общий индекс — <b>${r.score}/100</b>. Это взвешенная оценка игровых показателей, а не шанс победы или вероятность руина.`:'Данных для общего индекса пока недостаточно.'}</p>
 <div class="overall-counts"><span><b>${strong}</b> сильных игр</span><span><b>${weak}</b> слабых игр</span><span><b>${scored.length-strong-weak}</b> средних игр</span><span><b>${parsed}</b> с разбором реплея</span></div>
 <h3>На каких ролях играет</h3><p>${(r.roleSummary||[]).map(g=>`${esc(g.role)} — ${g.games} игр, индекс ${g.score}/100`).join('; ')||'Роли пока не определены.'}. Каждая игра оценивается отдельно; низкий фарм поддержки не снижает её оценку.</p>
 <div class="overall-columns"><div><h3>Сильные показатели</h3>${facts(strengths)}</div><div><h3>Что проседает</h3>${facts(weaknesses)}</div></div><p class="muted">Здесь показаны процентили по тем же героям. Они не означают точного сравнения с тем же рейтингом и позицией; фарм и урон зависят от роли.</p>
 <h3>Герои в серии</h3><div class="overall-heroes">${groups.map(g=>`<div>${heroPortrait(g.id)}<span><b>${esc(g.name)}</b><small>${g.count} игр · ${g.scores.length?`индекс ${Math.round(g.scores.reduce((a,b)=>a+b,0)/g.scores.length)}/100`:'оценка недоступна'}</small></span></div>`).join('')}</div>
 <h3>Повторяющиеся эпизоды</h3><p>${costly.length>=2?`В ${costly.length} играх зафиксированы смерти в драках с потерей золота. Эти эпизоды стоит пересмотреть в подробных разборах.`:costly.length===1?'В одной игре найден эпизод смерти в драке с потерей золота. Одного случая недостаточно, чтобы назвать это привычкой.':'Повторяющиеся смерти в невыгодных драках по имеющимся событиям не подтверждены.'} ${parsed<games.length?'Часть игр не имеет подробного разбора, поэтому вывод о повторяющихся ошибках неполный.':''}</p>
 <h3>Насколько полна картина</h3><p>Оценено ${scored.length} из ${games.length} игр. Победы: ${n(r.winrate)}%. ${r.sourceComparison?.disagreement?'Дополнительная оценка вклада расходится с игровыми показателями.':''} ${r.cohortComparison?.matchedGames?`Сравнение с группой рейтинга (не точным MMR), героем и позицией доступно для ${r.cohortComparison.matchedGames} игр; подробности ниже.`:'Точное сравнение с сочетанием рейтинга, роли и героя пока не подтверждено.'} Намеренный руин, скрытый пул и количество репортов эти данные не устанавливают.</p></section>`;
}
