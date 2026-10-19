import { accountInput } from './analysis.mjs';
import {readHistory,rememberSearch,clearHistory} from './history.mjs';
const form = document.querySelector('#scan-form');
const input = document.querySelector('#steam-id');
const error = document.querySelector('#form-error');

function looksLikeSteamInput(value) {
  const text = value.trim();
  if (/^\d{16,20}$/.test(text)) return true;
  if (/^\d{1,12}$/.test(text)) return true;
  try {
    const url = new URL(text.startsWith('http') ? text : `https://${text}`);
    return /(^|\.)steamcommunity\.com$/i.test(url.hostname) && /\/(id|profiles)\/[^/]+/i.test(url.pathname);
  } catch {
    return false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) {
    error.textContent = 'Введи Steam ID или ссылку на профиль.';
    input.focus();
    return;
  }
  try { accountInput(value); } catch (e) {
    error.textContent = e.message; input.focus(); return;
  }
  rememberSearch(value);
  location.href = './report.html?id=' + encodeURIComponent(value);
});

input.addEventListener('input', () => {
  if (error.textContent) error.textContent = '';
});
function showHistory(){
  const section=document.querySelector('#recent-searches'),list=document.querySelector('#recent-list');
  const entries=readHistory();section.hidden=!entries.length;list.replaceChildren();
  entries.forEach(entry=>{const link=document.createElement('a');link.href='./report.html?id='+encodeURIComponent(entry.input);link.className='recent-search';const title=document.createElement('strong');title.textContent=entry.name||'Игрок '+entry.input;const detail=document.createElement('span');detail.textContent=(entry.name?'ID '+entry.input+' · ':'')+new Date(entry.at).toLocaleDateString('ru-RU');link.append(title,detail);list.append(link);});
}
document.querySelector('#clear-history').onclick=()=>{clearHistory();showHistory();};
window.addEventListener('pageshow',showHistory);window.addEventListener('storage',showHistory);showHistory();
