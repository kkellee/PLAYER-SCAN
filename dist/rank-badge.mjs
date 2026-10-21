export function rankBadgeHTML(rank){
 const names=['Ранг неизвестен','Рекрут','Страж','Рыцарь','Герой','Легенда','Властелин','Божество','Титан'];
 const medal=Number.isInteger(rank)?Math.floor(rank/10):0,stars=Number.isInteger(rank)?rank%10:0;
 const valid=medal>=1&&medal<=8&&(medal===8||stars>=1&&stars<=5),tier=valid?medal:0;
 const label=names[tier]+(valid&&medal<8?' '+stars:'');
 return `<span class="rank-badge"><img src="https://raw.githubusercontent.com/odota/web/master/public/assets/images/dota2/rank_icons/rank_icon_${tier}.png" width="56" height="56" alt=""><span><small>Ранг игрока</small><b>${label}</b></span></span>`;
}
