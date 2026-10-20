import test from 'node:test';
import assert from 'node:assert/strict';
import {avatarURL,avatarHTML,mountAvatar} from '../dist/profile-avatar.mjs';
test('prefer full avatar, then medium, then small',()=>{assert.equal(avatarURL({avatarfull:'https://example.com/full',avatar:'https://example.com/small'}),'https://example.com/full');assert.equal(avatarURL({avatarfull:'bad',avatarmedium:'https://example.com/medium'}),'https://example.com/medium');});
test('absent or unsafe avatars show escaped initials',()=>{assert.equal(avatarURL({avatar:'javascript:alert(1)'}),null);assert.doesNotMatch(avatarHTML({personaname:'<script>'}),/<script>|<img/);assert.match(avatarHTML(),/avatar-fallback/);});
test('broken image restores fallback; successful image hides it',()=>{const events={},fallback={hidden:false};const img={previousElementSibling:fallback,complete:false,addEventListener:(name,fn)=>events[name]=fn};mountAvatar({querySelector:()=>img});events.load();assert.equal(fallback.hidden,true);events.error();assert.equal(img.hidden,true);assert.equal(fallback.hidden,false);});
