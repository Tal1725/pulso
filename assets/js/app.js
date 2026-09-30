import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const SUPABASE_URL='https://vqpavcyehgdifbtvzhcn.supabase.co';
const SUPABASE_KEY='sb_publishable_915zO84U'+'7fk0ZAjE4vdsFQ_yRWDA6Cm';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.supabase=supabase;
const $=s=>document.querySelector(s);
let user=null;
let feedMode='forYou';
let following=new Set();
let profiles=new Map();
const REACTIONS={like:'👍',love:'❤️',haha:'😂',wow:'😮',sad:'😢',angry:'😡'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const avatarHtml=p=>p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||'?').charAt(0).toUpperCase())+'</span>';

async function init(){
 try{
  const notice=$('#notice');
  let session=(await supabase.auth.getSession()).data?.session;
  if(!session){await new Promise(r=>setTimeout(r,800));session=(await supabase.auth.getSession()).data?.session;}
  if(!session){location.href='entrar.html?next=app';return;}
  user=session.user;
  const adminBtn=$('#adminBtn');
  if(adminBtn && (user.email||'').toLowerCase()==='ayslan.tal@gmail.com') adminBtn.hidden=false;
  const p=await supabase.from('profiles').select('id,display_name,username,avatar_url,account_status').eq('id',user.id).maybeSingle();
  if(p.data){
   if(p.data.account_status==='suspended'){await supabase.auth.signOut();location.href='entrar.html?blocked=1';return;}
   $('#name')?.replaceChildren(document.createTextNode(p.data.display_name||user.email||'Membro PULSO'));
   $('#handle')&&( $('#handle').textContent=p.data.username?'@'+p.data.username:'' );
   $('#avatar')&&($('#avatar').innerHTML=avatarHtml(p.data));
  }
  if(notice)notice.textContent='Você está dentro do PULSO. Carregando publicações...';
  await refreshFollowing();
  await loadFeed();
  await loadSocialStats();
 }catch(e){
  console.error('[PULSO] inicialização',e);
  const n=$('#notice');if(n)n.textContent='PULSO carregado, mas houve um erro de conexão. Recarregue a página.';
 }
}

async function refreshFollowing(){
 const r=await supabase.from('follows').select('following_id').eq('follower_id',user.id);
 following=new Set((r.data||[]).map(x=>x.following_id));
 window._following=following;
}

async function loadSocialStats(){
 const a=await supabase.from('follows').select('*',{count:'exact',head:true}).eq('following_id',user.id);
 const b=await supabase.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',user.id);
 if($('#followersCount'))$('#followersCount').textContent=a.count||0;
 if($('#followingCount'))$('#followingCount').textContent=b.count||0;
}

async function loadFeed(){
 const feed=$('#feed');if(!feed)return;
 try{
  const r=await supabase.from('posts').select('id,user_id,video_url,media_url,media_type,caption,created_at,parent_post_id').order('created_at',{ascending:false}).limit(20);
  if(r.error)throw r.error;
  let posts=r.data||[];
  if(feedMode==='following')posts=posts.filter(p=>following.has(p.user_id)||p.user_id===user.id);
  if(!posts.length){
   feed.innerHTML=feedMode==='following'?'<div class="card empty">Você ainda não segue ninguém. Explore o PULSO e siga criadores.</div>':'<div class="card empty">Ainda não há publicações.<br>Seja o primeiro a dar o primeiro PULSO.</div>';
   return;
  }
  profiles=new Map();
  const ids=[...new Set(posts.map(p=>p.user_id))];
  const ps=await supabase.from('profiles').select('id,username,display_name,avatar_url').in('id',ids);
  (ps.data||[]).forEach(p=>profiles.set(p.id,p));
  const postIds=posts.map(p=>p.id);
  const [lr,cr]=await Promise.all([
   supabase.from('likes').select('post_id,user_id,reaction').in('post_id',postIds),
   supabase.from('comments').select('id,post_id,user_id,content,created_at').in('post_id',postIds).order('created_at',{ascending:true})
  ]);
  const likes=lr.data||[],comments=cr.data||[];
  feed.innerHTML=posts.map(p=>renderPost(p,likes,comments,posts)).join('');
  bindFeed();
  document.dispatchEvent(new CustomEvent('pulso-feed-rendered'));
 }catch(e){
  console.error('[PULSO] feed',e);
  if(!feed.querySelector('[data-post]'))feed.innerHTML='<div class="card empty">Não foi possível carregar as publicações agora. Tente novamente.</div>';
 }
}
window.loadFeed=loadFeed;
window.pulsoToggleReaction=toggleReaction;

function renderPost(p,likes,comments,posts){
 const prof=profiles.get(p.user_id)||{};
 const mine=likes.find(x=>x.post_id===p.id&&x.user_id===user.id);
 const pl=likes.filter(x=>x.post_id===p.id);
 const cs=comments.filter(x=>x.post_id===p.id);
 const src=p.media_url||p.video_url||'';
 let media='';
 if(p.media_type==='image')media='<img class="video" src="'+esc(src)+'" alt="Publicação PULSO" loading="lazy">';
 else if(p.media_type==='audio')media='<audio class="video" src="'+esc(src)+'" controls preload="none"></audio>';
 else media='<video class="video" src="'+esc(src)+'" controls playsinline preload="metadata"></video>';
 const reactionCounts=Object.keys(REACTIONS).map(k=>{const n=pl.filter(x=>(x.reaction||'like')===k).length;return n?'<span class="reaction-count">'+REACTIONS[k]+' '+n+'</span>':''}).join('');
 const children=posts.filter(x=>x.parent_post_id===p.id);
 return '<article class="card post" data-post="'+esc(p.id)+'">'+
  '<div class="posthead" data-open-profile="'+esc(p.user_id)+'" role="button" tabindex="0"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||'Usuário')+'</strong><span>'+(prof.username?'@'+esc(prof.username):'membro PULSO')+'</span></div>'+
  (p.user_id===user.id?'<button class="post-menu" data-delete type="button" title="Excluir">🗑️ Excluir</button>':'')+'</div>'+
  media+'<div class="caption">'+esc(p.caption)+'</div><div class="actions">'+
  '<div class="reaction-wrap"><button class="action '+(mine?'active':'')+'" data-like type="button" aria-pressed="'+(mine?'true':'false')+'">'+(mine?'❤️ Descurtir':'♡ Curtir')+' · '+pl.length+'</button><button class="action reaction-more" data-reaction-menu type="button" aria-expanded="false">🙂 Reagir</button><div class="reaction-picker" data-reaction-picker role="menu" style="display:none">'+Object.entries(REACTIONS).map(([k,v])=>'<button type="button" data-reaction="'+k+'" title="'+k+'">'+v+'</button>').join('')+'</div></div>'+
  (reactionCounts?'<div class="reaction-summary">'+reactionCounts+'</div>':'')+
  (p.user_id!==user.id?'<button class="action follow-action" data-follow-user="'+esc(p.user_id)+'" type="button">'+(following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'')+
  '<button class="action" data-likers type="button">👥 Quem curtiu</button><button class="action" data-focus type="button">💬 '+cs.length+'</button><button class="action continue-action" data-continue type="button">🐝 Dar continuidade'+(children.length?' · '+children.length:'')+'</button>'+
  '</div><div class="comments"><strong>Comentários</strong><div>'+(cs.map(c=>{const cp=profiles.get(c.user_id)||{};return '<div class="comment"><b>'+esc(cp.display_name||'Usuário')+'</b> '+esc(c.content)+'</div>'}).join('')||'<div class="file">Seja o primeiro a comentar.</div>')+'</div></div>'+
  '<div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send type="button">Enviar</button></div>'+
  '</article>';
}

function bindFeed(){
 document.querySelectorAll('[data-post]').forEach(card=>{
  const id=card.dataset.post;
  const like=card.querySelector('[data-like]');
  like?.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();await toggleReaction(id,'like')});
  const reactionMenu=card.querySelector('[data-reaction-menu]');
  const reactionPicker=card.querySelector('[data-reaction-picker]');
  reactionMenu?.addEventListener('click',e=>{
   e.preventDefault();e.stopPropagation();
   if(!reactionPicker)return;
   const open=reactionPicker.style.display!=='none';
   reactionPicker.style.display=open?'none':'flex';
   reactionMenu.setAttribute('aria-expanded',open?'false':'true');
  });
  card.querySelectorAll('[data-reaction]').forEach(b=>b.addEventListener('click',async e=>{
   e.preventDefault();e.stopPropagation();
   if(reactionPicker)reactionPicker.style.display='none';
   reactionMenu?.setAttribute('aria-expanded','false');
   await toggleReaction(id,b.dataset.reaction);
  }));
  card.querySelector('[data-follow-user]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleFollow(e.currentTarget.dataset.followUser,e.currentTarget)});
  card.querySelector('[data-likers]')?.addEventListener('click',()=>showLikers(id));
  card.querySelector('[data-focus]')?.addEventListener('click',()=>card.querySelector('[data-comment]')?.focus());
  card.querySelector('[data-send]')?.addEventListener('click',()=>addComment(id,card));
  card.querySelector('[data-delete]')?.addEventListener('click',()=>deletePost(id,card));
 });
}
async function toggleReaction(id,reaction){
 try{
  const q=await supabase.from('likes').select('post_id,user_id,reaction').eq('post_id',id).eq('user_id',user.id).maybeSingle();
  if(q.error)throw q.error;
  let r;
  if(q.data?.reaction===reaction){
   r=await supabase.from('likes').delete().eq('post_id',id).eq('user_id',user.id);
  }else if(q.data){
   r=await supabase.from('likes').update({reaction}).eq('post_id',id).eq('user_id',user.id);
  }else{
   r=await supabase.from('likes').insert({post_id:id,user_id:user.id,reaction});
  }
  if(r.error)throw r.error;
  await loadFeed();
 }catch(error){
  console.error('[PULSO] reação',error);
  const card=document.querySelector('[data-post="'+CSS.escape(id)+'"]');
  const button=card?.querySelector('[data-like]');
  if(button){
   button.disabled=false;
   button.title='Não foi possível registrar a reação. Toque novamente.';
  }
 }
}
async function toggleFollow(id,b){
 b.disabled=true;
 const exists=following.has(id);
 const r=exists?await supabase.from('follows').delete().eq('follower_id',user.id).eq('following_id',id):await supabase.from('follows').insert({follower_id:user.id,following_id:id});
 if(r.error){alert(r.error.message);b.disabled=false;return}
 exists?following.delete(id):following.add(id);window._following=following;
 await loadSocialStats();await loadFeed();document.dispatchEvent(new CustomEvent('pulso-follow-changed'));
}
async function addComment(id,card){
 const input=card.querySelector('[data-comment]'),text=input?.value.trim();if(!text)return;
 const r=await supabase.from('comments').insert({post_id:id,user_id:user.id,content:text});
 if(r.error)alert(r.error.message);else{input.value='';await loadFeed();}
}
async function deletePost(id,card){
 if(!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.'))return;
 const r=await supabase.from('posts').delete().eq('id',id).eq('user_id',user.id);
 if(r.error)alert('Não foi possível excluir: '+r.error.message);else card.remove();
}
async function showLikers(id){
 const r=await supabase.from('likes').select('user_id,reaction').eq('post_id',id);
 if(r.error){alert(r.error.message);return}
 const ids=[...new Set((r.data||[]).map(x=>x.user_id))];
 const ps=ids.length?await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids):{data:[]};
 const map=new Map((ps.data||[]).map(p=>[p.id,p]));
 openModal('Quem reagiu',(r.data||[]).map(x=>{const p=map.get(x.user_id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||'Usuário')+'</strong><span>'+REACTIONS[x.reaction||'like']+' '+(p.username?'@'+esc(p.username):'')+'</span></div></div>'}).join('')||'Ainda ninguém reagiu.');
}
function openModal(title,body){const m=$('#socialModal');if(!m)return;$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;m.hidden=false}
function closeModal(){const m=$('#socialModal');if(m)m.hidden=true}
function setFeedMode(mode){feedMode=mode;document.querySelectorAll('.feed-switch-btn').forEach(b=>{const a=b.id===(mode==='forYou'?'feedForYou':'feedFollowing');b.classList.toggle('active',a);b.setAttribute('aria-selected',a?'true':'false')});loadFeed()}
window.pulsoSetFeedMode=setFeedMode;

document.addEventListener('click',e=>{
 const b=e.target.closest?.('#feedForYou,#feedFollowing,#followersBtn,#followingBtn,#modalClose,#logoutBtn');
 if(!b)return;
 if(b.id==='feedForYou'){e.preventDefault();setFeedMode('forYou')}
 if(b.id==='feedFollowing'){e.preventDefault();setFeedMode('following')}
 if(b.id==='modalClose'){e.preventDefault();closeModal()}
 if(b.id==='followersBtn'){e.preventDefault();showPeople('followers')}
 if(b.id==='followingBtn'){e.preventDefault();showPeople('following')}
 if(b.id==='logoutBtn'){e.preventDefault();supabase.auth.signOut().finally(()=>location.href='entrar.html')}
},true);

async function showPeople(kind){
 const col=kind==='followers'?'follower_id':'following_id';
 const r=await supabase.from('follows').select(col).eq(kind==='followers'?'following_id':'follower_id',user.id);
 if(r.error){alert(r.error.message);return}
 const ids=(r.data||[]).map(x=>x[col]);
 if(!ids.length){openModal(kind==='followers'?'Quem te seguiu':'Quem você segue','Ainda não há ninguém nesta lista.');return}
 const ps=await supabase.from('profiles').select('id,display_name,username,avatar_url').in('id',ids);
 const map=new Map((ps.data||[]).map(p=>[p.id,p]));
 openModal(kind==='followers'?'Quem te seguiu':'Quem você segue',ids.map(id=>{const p=map.get(id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||'Usuário')+'</strong><span>'+(p.username?'@'+esc(p.username):'membro PULSO')+'</span></div></div>'}).join(''));
}

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.closest?.('[data-comment]')){e.preventDefault();e.target.closest('[data-post]')?.querySelector('[data-send]')?.click()}});
document.addEventListener('pulso-published',()=>loadFeed());
window.addEventListener('error',e=>console.error('[PULSO]',e.error||e.message));
window.addEventListener('unhandledrejection',e=>console.error('[PULSO]',e.reason));
init();