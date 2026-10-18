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
  if (!looksLikeSteamInput(value)) {
    error.textContent = 'Проверь Steam ID или ссылку на профиль Steam.';
    input.focus();
    return;
  }
  error.textContent = 'Сканирование профиля скоро появится.';
});

input.addEventListener('input', () => {
  if (error.textContent) error.textContent = '';
});

