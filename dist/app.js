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
    error.textContent = 'Enter a Steam ID or profile URL to continue.';
    input.focus();
    return;
  }
  if (!looksLikeSteamInput(value)) {
    error.textContent = 'That does not look like a Steam ID or Steam profile URL.';
    input.focus();
    return;
  }
  error.textContent = 'Profile scanning is coming soon.';
});

input.addEventListener('input', () => {
  if (error.textContent) error.textContent = '';
});

