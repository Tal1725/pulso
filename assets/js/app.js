/* PULSO CORE — REST-first, sem dependência do módulo Supabase para o feed */
const API='https://vqpavcyehgdifbtvzhcn.supabase.co';
const KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const $=s=>document.querySelector(s);
let user=null,profiles=new Map(); window._following=new Set();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const REACTIONS={like:'👍',love:'❤️',haha:'😂',wow:'😮',sad:'😢',angry:'😡'};
function sessionData(){try{return JSON.parse(localStorage.getItem('sb-vqpavcyehgdifbtvzhcn-auth-token')||'null')}catch{return null}}\nfunction token(){return sessionData()?.access_token||''}\nasync function restoreSession(){const s=sessionData();if(s?.access_token&&s?.user)return s;if(!s?.refresh_token)return null;try{const r=await fetch(API+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:s.refresh_token}),cache:'no-store'});const d=await r.json().catch(()=>null);if(!r.ok||!d?.access_token||!d?.user)return null;const next={...s,...d,expires_at:d.expires_at||Math.floor(Date.now()/1000)+3600};localStorage.setItem('sb-vqpavcyehgdifbtvzhcn-auth-token',JSON.stringify(next));return next}catch(e){console.warn('[PULSO AUTH]',e);return null}}
function headers(){const t=token(),h={apikey:KEY,'Content-Type':'application/json'};if(t)h.Authorization='Bearer '+t;return h}
async function api(path,opt={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const r=await fetch(API+'/rest/v1/'+path,{...opt,headers:{...headers(),...(opt.headers||{})},cache:'no-store',signal:controller.signal});let data=null;try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.message||data?.hint||('HTTP '+r.status));return data}catch(e){if(e?.name==='AbortError')throw new Error('Tempo limite ao conectar ao PULSO');throw e}finally{clearTimeout(timer)}}
function avatarHtml(p){return p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||'?').charAt(0).toUpperCase())+'</span>'}
async function init(){
 try{
  const t=token(),raw=localStorage.getItem('sb-vqpavcyehgdifbtvzhcn-auth-token');
  user=t&&raw?JSON.parse(raw).user:null;
  if(user?.id){
   const me=await api('profiles?select=*&id=eq.'+encodeURIComponent(user.id)+'&limit=1').catch(()=>[]);
   const p=me?.[0];
   if(p){$('#name').textContent=p.display_name||user.email||'Meu perfil';$('#handle').textContent=p.username?'@'+p.username:'';$('#avatar').innerHTML=avatarHtml(p)}
   await refreshFollowing();
  }else{
   $('#name').textContent='Visitante';
   $('#handle').textContent='Entre para interagir';
  }
  $('#notice').textContent='PULSO — Sinta o ritmo do conteúdo real.';
  loadFeed();
  if(user?.id) loadSocialStats();
  bindGlobal();
 }catch(e){
  console.error('[PULSO CORE]',e);
  $('#notice').textContent='PULSO carregado. Alguns recursos podem exigir login.';
  loadFeed();
  bindGlobal();
 }
}
function bindGlobal(){
 const q=(s,fn)=>{const el=$(s);if(el)el.onclick=fn};
 q('#logoutBtn',()=>{localStorage.removeItem('sb-vqpavcyehgdifbtvzhcn-auth-token');location.href='entrar.html'});
 q('#continueClose',()=>{const el=$('#continueModal');if(el)el.hidden=true});
 const cm=$('#continueModal');if(cm)cm.addEventListener('click',e=>{if(e.target.id==='continueModal')cm.hidden=true});
 q('#followersBtn',()=>user?.id?alert('Lista de seguidores será aberta em seguida.'):location.href='entrar.html');
 q('#followingBtn',()=>user?.id?alert('Lista de pessoas que você segue será aberta em seguida.'):location.href='entrar.html');
}
async function refreshFollowing(){try{const d=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id));window._following=new Set((d||[]).map(x=>x.following_id))}catch(e){console.warn(e)}}
async function loadFeed(){
 const feed=$('#feed');if(!feed)return;feed.innerHTML='<div class="card empty">Carregando publicações...</div>';
 try{
  const posts=await api('posts?select=id,user_id,video_url,media_url,media_type,caption,created_at,parent_post_id&order=created_at.desc&limit=50');
  if(!Array.isArray(posts)||!posts.length){feed.innerHTML='<div class="card empty">Ainda não há publicações.</div>';return}
  const ids=[...new Set(posts.map(p=>p.user_id))], ps=await api('profiles?select=id,username,display_name,avatar_url').catch(()=>[]);
  profiles=new Map((ps||[]).map(p=>[p.id,p]));
  const postIds=posts.map(p=>p.id), likes=await api('likes?select=post_id,user_id,reaction').catch(()=>[]), comments=await api('comments?select=id,post_id,user_id,content,created_at&order=created_at.asc').catch(()=>[]);
  const likeIds=[...new Set(likes.map(x=>x.user_id))];
  feed.innerHTML=posts.map(p=>renderPost(p,likes,comments,posts)).join('');bindFeed();
 }catch(e){console.error('[PULSO FEED]',e);feed.innerHTML='<div class="card empty">Não foi possível carregar as publicações agora.<br><button class="pill primary" type="button" id="feedRetry">↻ Tentar novamente</button></div>';$('#feedRetry').onclick=loadFeed}
}
function renderPost(p,likes,comments,posts){
 const prof=profiles.get(p.user_id)||{},mine=likes.find(l=>l.post_id===p.id&&l.user_id===user?.id),pl=likes.filter(l=>l.post_id===p.id),cs=comments.filter(c=>c.post_id===p.id),children=posts.filter(x=>x.parent_post_id===p.id).length,src=p.media_url||p.video_url||'';
 const media=p.media_type==='image'?'<img class="video" src="'+esc(src)+'" alt="Publicação PULSO" loading="lazy">':p.media_type==='audio'?'<audio class="video" src="'+esc(src)+'" controls></audio>':'<video class="video" src="'+esc(src)+'" controls playsinline preload="metadata"></video>';
 const mineEmoji=mine?REACTIONS[mine.reaction||'like']:'♡';
 return '<article class="card post" data-post="'+esc(p.id)+'"><div class="posthead"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||'Usuário')+'</strong><span>'+(prof.username?'@'+esc(prof.username):'membro PULSO')+'</span></div></div>'+media+'<div class="caption">'+esc(p.caption)+'</div><div class="actions"><button class="action" data-like>'+mineEmoji+' '+(mine?'Reagir':'Curtir')+' · '+pl.length+'</button>'+(p.user_id!==(user?.id||'')?'<button class="action" data-follow-user="'+esc(p.user_id)+'">'+(window._following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'')+'<button class="action" data-focus>💬 '+cs.length+'</button></div><div class="comments"><strong>Comentários</strong><div>'+ (cs.map(c=>{const cp=profiles.get(c.user_id)||{};return '<div class="comment"><b>'+esc(cp.display_name||'Usuário')+'</b>'+esc(c.content)+'</div>'}).join('')||'<div class="file">Seja o primeiro a comentar.</div>')+'</div><div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send>Enviar</button></div></article>'
}
function bindFeed(){
 document.querySelectorAll('[data-post]').forEach(card=>{
  const id=card.dataset.post;
  card.querySelector('[data-like]').onclick=()=>toggleReaction(id,card);
  card.querySelector('[data-focus]').onclick=()=>card.querySelector('[data-comment]').focus();
  card.querySelector('[data-send]').onclick=()=>addComment(id,card);
  const f=card.querySelector('[data-follow-user]');if(f)f.onclick=()=>toggleFollow(f.dataset.followUser,f);
 });
}
async function toggleReaction(id,b){if(!user){location.href='entrar.html';return}try{const q=await api('likes?select=post_id,reaction&post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1');if(q?.[0]){if((q[0].reaction||'like')===(b.textContent.includes('❤️')?'love':'like'))await api('likes?post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id),{method:'DELETE'});else await api('likes?post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id),{method:'PATCH',body:JSON.stringify({reaction:'like'})})}else await api('likes',{method:'POST',body:JSON.stringify({post_id:id,user_id:user.id,reaction:'like'}),headers:{Prefer:'return=minimal'}});await loadFeed()}catch(e){alert('Não foi possível curtir: '+e.message)}}
async function toggleFollow(id,b){if(!user){location.href='entrar.html';return}try{const q=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id)+'&following_id=eq.'+encodeURIComponent(id)+'&limit=1');if(q?.[0]){await api('follows?follower_id=eq.'+encodeURIComponent(user.id)+'&following_id=eq.'+encodeURIComponent(id),{method:'DELETE'});window._following.delete(id);b.textContent='+ Seguir'}else{await api('follows',{method:'POST',body:JSON.stringify({follower_id:user.id,following_id:id}),headers:{Prefer:'return=minimal'}});window._following.add(id);b.textContent='✓ Seguindo'}}catch(e){alert('Não foi possível seguir: '+e.message)}}
async function addComment(id,card){if(!user){location.href='entrar.html';return}const input=card.querySelector('[data-comment]'),content=input.value.trim();if(!content)return;try{await api('comments',{method:'POST',body:JSON.stringify({post_id:id,user_id:user.id,content}),headers:{Prefer:'return=minimal'}});input.value='';await loadFeed()}catch(e){alert('Não foi possível comentar: '+e.message)}}
async function loadSocialStats(){try{const a=await api('follows?select=follower_id&following_id=eq.'+encodeURIComponent(user.id));const b=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id));$('#followersCount').textContent=(a||[]).length;$('#followingCount').textContent=(b||[]).length}catch{}}
window.loadFeed=loadFeed;
init();