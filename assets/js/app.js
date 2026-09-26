/* PULSO CORE — REST-first, sem dependência do módulo Supabase para o feed */
const API='https://vqpavcyehgdifbtvzhcn.supabase.co';
const KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const $=s=>document.querySelector(s);
let user=null,profiles=new Map(); window._following=new Set();
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const REACTIONS={like:'👍',love:'❤️',haha:'😂',wow:'😮',sad:'😢',angry:'😡'};
function token(){try{const k='sb-vqpavcyehgdifbtvzhcn-auth-token',v=JSON.parse(localStorage.getItem(k)||'null');return v?.access_token||''}catch{return ''}}
function headers(){const t=token();return{apikey:KEY,Authorization:'Bearer '+(t||KEY),'Content-Type':'application/json'}}
async function api(path,opt={}){const r=await fetch(API+'/rest/v1/'+path,{...opt,headers:{...headers(),...(opt.headers||{})},cache:'no-store'});let data=null;try{data=await r.json()}catch{}if(!r.ok)throw new Error(data?.message||data?.hint||('HTTP '+r.status));return data}
function avatarHtml(p){return p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||'?').charAt(0).toUpperCase())+'</span>'}
async function init(){
 const t=token(); if(!t){location.href='entrar.html';return}
 try{
  const me=await api('profiles?select=*&id=eq.'+encodeURIComponent(JSON.parse(localStorage.getItem('sb-vqpavcyehgdifbtvzhcn-auth-token')).user?.id||'')+'&limit=1'); user=JSON.parse(localStorage.getItem('sb-vqpavcyehgdifbtvzhcn-auth-token')).user;
  const p=me?.[0]; if(p){$('#name').textContent=p.display_name||user.email;$('#handle').textContent=p.username?'@'+p.username:'';$('#avatar').innerHTML=avatarHtml(p)}
  $('#notice').textContent='Você está dentro do PULSO. Aqui, uma ideia pode começar com você e continuar pela comunidade.';
  await refreshFollowing(); await loadFeed(); await loadSocialStats();
 }catch(e){console.error('[PULSO CORE]',e);$('#notice').textContent='PULSO carregado. Não foi possível carregar os dados agora.';$('#feed').innerHTML='<div class="card empty">Não foi possível carregar as publicações.<br><button class="pill primary" type="button" id="feedRetry">↻ Tentar novamente</button></div>';$('#feedRetry').onclick=loadFeed}
}
async function refreshFollowing(){try{const d=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id));window._following=new Set((d||[]).map(x=>x.following_id))}catch(e){console.warn(e)}}
async function loadFeed(){
 const feed=$('#feed');if(!feed)return;feed.innerHTML='<div class="card empty">Carregando publicações...</div>';
 try{
  const posts=await api('posts?select=id,user_id,video_url,media_url,media_type,caption,created_at,parent_post_id&order=created_at.desc&limit=50');
  if(!Array.isArray(posts)||!posts.length){feed.innerHTML='<div class="card empty">Ainda não há publicações.</div>';return}
  const ids=[...new Set(posts.map(p=>p.user_id))], ps=await api('profiles?select=id,username,display_name,avatar_url&id=in.('+ids.map(encodeURIComponent).join(',')+')');
  profiles=new Map((ps||[]).map(p=>[p.id,p]));
  const postIds=posts.map(p=>p.id), likes=await api('likes?select=post_id,user_id,reaction&post_id=in.('+postIds.map(encodeURIComponent).join(',')+')').catch(()=>[]), comments=await api('comments?select=id,post_id,user_id,content,created_at&post_id=in.('+postIds.map(encodeURIComponent).join(',')+')&order=created_at.asc').catch(()=>[]);
  const likeIds=[...new Set(likes.map(x=>x.user_id))]; if(likeIds.length){const lp=await api('profiles?select=id,username,display_name,avatar_url&id=in.('+likeIds.map(encodeURIComponent).join(',')+')').catch(()=>[]);(lp||[]).forEach(p=>profiles.set(p.id,p))}
  feed.innerHTML=posts.map(p=>renderPost(p,likes,comments,posts)).join('');bindFeed();
 }catch(e){console.error('[PULSO FEED]',e);feed.innerHTML='<div class="card empty">Não foi possível carregar as publicações agora.<br><button class="pill primary" type="button" id="feedRetry">↻ Tentar novamente</button></div>';$('#feedRetry').onclick=loadFeed}
}
function renderPost(p,likes,comments,posts){
 const prof=profiles.get(p.user_id)||{},mine=likes.find(l=>l.post_id===p.id&&l.user_id===user.id),pl=likes.filter(l=>l.post_id===p.id),cs=comments.filter(c=>c.post_id===p.id),children=posts.filter(x=>x.parent_post_id===p.id).length,src=p.media_url||p.video_url||'';
 const media=p.media_type==='image'?'<img class="video" src="'+esc(src)+'" alt="Publicação PULSO" loading="lazy">':p.media_type==='audio'?'<audio class="video" src="'+esc(src)+'" controls></audio>':'<video class="video" src="'+esc(src)+'" controls playsinline preload="metadata"></video>';
 const mineEmoji=mine?REACTIONS[mine.reaction||'like']:'♡';
 return '<article class="card post" data-post="'+esc(p.id)+'"><div class="posthead"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||'Usuário')+'</strong><span>'+(prof.username?'@'+esc(prof.username):'membro PULSO')+'</span></div></div>'+media+'<div class="caption">'+esc(p.caption)+'</div><div class="actions"><button class="action" data-like>'+mineEmoji+' '+(mine?'Reagir':'Curtir')+' · '+pl.length+'</button>'+(p.user_id!==user.id?'<button class="action" data-follow-user="'+esc(p.user_id)+'">'+(window._following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'')+'<button class="action" data-focus>💬 '+cs.length+'</button></div><div class="comments"><strong>Comentários</strong><div>'+ (cs.map(c=>{const cp=profiles.get(c.user_id)||{};return '<div class="comment"><b>'+esc(cp.display_name||'Usuário')+'</b>'+esc(c.content)+'</div>'}).join('')||'<div class="file">Seja o primeiro a comentar.</div>')+'</div><div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send>Enviar</button></div></article>'
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
async function toggleReaction(id,b){try{const q=await api('likes?select=post_id,reaction&post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id)+'&limit=1');if(q?.[0]){if((q[0].reaction||'like')===(b.textContent.includes('❤️')?'love':'like'))await api('likes?post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id),{method:'DELETE'});else await api('likes?post_id=eq.'+encodeURIComponent(id)+'&user_id=eq.'+encodeURIComponent(user.id),{method:'PATCH',body:JSON.stringify({reaction:'like'})})}else await api('likes',{method:'POST',body:JSON.stringify({post_id:id,user_id:user.id,reaction:'like'}),headers:{Prefer:'return=minimal'}});await loadFeed()}catch(e){alert('Não foi possível curtir: '+e.message)}}
async function toggleFollow(id,b){try{const q=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id)+'&following_id=eq.'+encodeURIComponent(id)+'&limit=1');if(q?.[0]){await api('follows?follower_id=eq.'+encodeURIComponent(user.id)+'&following_id=eq.'+encodeURIComponent(id),{method:'DELETE'});window._following.delete(id);b.textContent='+ Seguir'}else{await api('follows',{method:'POST',body:JSON.stringify({follower_id:user.id,following_id:id}),headers:{Prefer:'return=minimal'}});window._following.add(id);b.textContent='✓ Seguindo'}}catch(e){alert('Não foi possível seguir: '+e.message)}}
async function addComment(id,card){const input=card.querySelector('[data-comment]'),content=input.value.trim();if(!content)return;try{await api('comments',{method:'POST',body:JSON.stringify({post_id:id,user_id:user.id,content}),headers:{Prefer:'return=minimal'}});input.value='';await loadFeed()}catch(e){alert('Não foi possível comentar: '+e.message)}}
async function loadSocialStats(){try{const a=await api('follows?select=follower_id&following_id=eq.'+encodeURIComponent(user.id));const b=await api('follows?select=following_id&follower_id=eq.'+encodeURIComponent(user.id));$('#followersCount').textContent=(a||[]).length;$('#followingCount').textContent=(b||[]).length}catch{}}
window.loadFeed=loadFeed;
$('#logoutBtn').onclick=()=>{localStorage.removeItem('sb-vqpavcyehgdifbtvzhcn-auth-token');location.href='entrar.html'};
$('#continueClose').onclick=()=>$('#continueModal').hidden=true;
$('#continueModal').addEventListener('click',e=>{if(e.target.id==='continueModal')$('#continueModal').hidden=true});
$('#followersBtn').onclick=()=>{alert('Lista de seguidores será aberta em seguida.');};
$('#followingBtn').onclick=()=>{alert('Lista de pessoas que você segue será aberta em seguida.');};
init();