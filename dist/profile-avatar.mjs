const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function avatarURL(profile={}){
  for(const value of [profile.avatarfull,profile.avatarmedium,profile.avatar]){
    try{const u=new URL(value);if(u.protocol==='https:'&&!u.username&&!u.password)return u.href;}catch{}
  }
  return null;
}
export function avatarHTML(profile={}){
  const name=profile.personaname||'Игрок',url=avatarURL(profile);
  const initials=Array.from(name.trim()).slice(0,2).join('').toUpperCase()||'PS';
  return `<span class="player-avatar"><span class="avatar-fallback" role="img" aria-label="Аватар недоступен">${esc(initials)}</span>${url?`<img src="${esc(url)}" alt="Аватар ${esc(name)}" width="80" height="80" decoding="async" referrerpolicy="no-referrer">`:''}</span>`;
}
export function mountAvatar(root=document){
  const img=root.querySelector('.player-avatar img');if(!img)return;
  const fallback=img.previousElementSibling;
  const success=()=>{fallback.hidden=true;};
  const failure=()=>{img.hidden=true;fallback.hidden=false;};
  img.addEventListener('load',success,{once:true});img.addEventListener('error',failure,{once:true});
  if(img.complete){if(img.naturalWidth>0)success();else failure();}
}
