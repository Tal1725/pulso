import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{collection,getDocs,doc,getDoc,setDoc,deleteDoc,addDoc,query,where,limit}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import{onAuthStateChanged,signOut}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

const $=s=>document.querySelector(s);
let user=null;
let feedMode='forYou';
let initializedUid='';
let initializing=false;
let followRows=[];
let following=new Set();
let profiles=new Map();
let currentLikes=[];
let currentComments=[];
const REACTIONS={like:'👍',love:'❤️',haha:'😂',wow:'😮',sad:'😢',angry:'😡'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const avatarHtml=p=>p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||'?').charAt(0).toUpperCase())+'</span>';
const timeValue=v=>v?.toMillis?v.toMillis():(typeof v==='number'?v:(Date.parse(v)||0));

async function getByPostIds(name,ids){
  if(!ids.length)return[];
  const out=[];
  for(let i=0;i<ids.length;i+=30){
    const batch=ids.slice(i,i+30);
    const snap=await getDocs(query(collection(firebaseDb,name),where('post_id','in',batch)));
    out.push(...snap.docs.map(d=>({id:d.id,...(d.data()||{})})));
  }
  return out;
}
async function loadProfilesByIds(ids){
  const unique=[...new Set(ids.filter(Boolean))];
  await Promise.all(unique.map(async id=>{
    if(profiles.has(id))return;
    try{
      const s=await getDoc(doc(firebaseDb,'Perfis',id));
      if(s.exists()){const p=normalizeProfile(s.data(),id);profiles.set(id,p);return;}
      const q=await getDocs(query(collection(firebaseDb,'Perfis'),where('user_id','==',id),limit(1)));
      if(!q.empty){const p=normalizeProfile(q.docs[0].data(),q.docs[0].id);profiles.set(id,p);}
    }catch(e){}
  }));
}

function normalizeProfile(x={},docId=''){
  return {
    id:x.user_id||x.uid||docId,
    username:x.username||x['Nome de usuário']||'',
    display_name:x.display_name||x['Nome']||x['Nome de usuário']||x.username||'Usuário',
    avatar_url:x.avatar_url||null,
    bio:x.bio||x.Bio||'',
    status:x.status||''
  };
}

function indexProfiles(rows){
  profiles=new Map();
  rows.forEach(x=>{
    const p=normalizeProfile(x,x.id);
    if(x.id)profiles.set(x.id,p);
    if(x.user_id)profiles.set(x.user_id,p);
    if(x.uid)profiles.set(x.uid,p);
  });
  return profiles;
}

async function getCurrentProfile(){
  const uid=user?.uid;
  if(!uid)return{};
  const direct=await getDoc(doc(firebaseDb,'Perfis',uid));
  if(direct.exists())return normalizeProfile(direct.data(),uid);
  const q=await getDocs(query(collection(firebaseDb,'Perfis'),where('user_id','==',uid),limit(1)));
  if(!q.empty)return normalizeProfile(q.docs[0].data(),q.docs[0].id);
  const q2=await getDocs(query(collection(firebaseDb,'Perfis'),where('uid','==',uid),limit(1)));
  return q2.empty?{}:normalizeProfile(q2.docs[0].data(),q2.docs[0].id);
}

async function init(){
  if(initializing||initializedUid===firebaseAuth.currentUser?.uid)return;
  initializing=true;
  try{
    const notice=$('#notice');
    if(!firebaseAuth.currentUser){location.href='entrar.html?next=app';return;}
    user=firebaseAuth.currentUser;
    const adminBtn=$('#adminBtn');
    const isAdmin=(user.email||'').toLowerCase()==='ayslan.tal@gmail.com';
    if(adminBtn){adminBtn.hidden=!isAdmin;if(isAdmin)document.body.classList.add('pulso-admin-user');}
    const p=await getCurrentProfile();
    $('#name')?.replaceChildren(document.createTextNode(p.display_name||user.email||'Membro PULSO'));
    if($('#handle'))$('#handle').textContent=p.username?'@'+p.username:'';
    if($('#avatar'))$('#avatar').innerHTML=avatarHtml(p);
    if(notice)notice.textContent='Você está dentro do PULSO. Carregando publicações...';
    await refreshFollowing();
    await loadFeed();
    await loadSocialStats();
    if(notice)notice.textContent='PULSO carregado.';
    initializedUid=user.uid;
  }catch(e){
    console.error('[PULSO] inicialização',e);
    const n=$('#notice');if(n)n.textContent='PULSO carregado, mas houve um erro. Recarregue a página.';
  }finally{
    initializing=false;
  }
}

async function refreshFollowing(){
  try{
    const snap=await getDocs(query(collection(firebaseDb,'follows'),where('follower_id','==',user.uid),limit(500)));
    followRows=snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
    following=new Set(followRows.map(x=>x.following_id).filter(Boolean));
  }catch(e){console.warn('[PULSO] follows não carregou',e);following=new Set();}
  window._following=following;
}

async function loadSocialStats(){
  try{
    const followingCount=followRows.filter(x=>x.follower_id===user.uid).length;
    const followersSnap=await getDocs(query(collection(firebaseDb,'follows'),where('following_id','==',user.uid),limit(500)));
    const followers=followersSnap.size;
    if($('#followersCount'))$('#followersCount').textContent=followers;
    if($('#followingCount'))$('#followingCount').textContent=followingCount;
  }catch(e){console.warn('[PULSO] stats não carregou',e);}
}

async function loadFeed(){
  const feed=$('#feed');if(!feed)return;
  try{
    let posts=(await getDocs(query(collection(firebaseDb,'Posts'),limit(50)))).docs.map(d=>({id:d.id,...(d.data()||{})})).map(x=>({
      id:x.id,user_id:x.user_id||x.legacy_user_id||'',
      video_url:x.video_url||x.media_url||'',media_url:x.media_url||x.video_url||'',
      media_type:x.media_type||'vídeo',caption:x.caption||x.legenda||'',created_at:x.created_at||''
    })).sort((a,b)=>timeValue(b.created_at)-timeValue(a.created_at));
    if(feedMode==='following')posts=posts.filter(p=>following.has(p.user_id)||p.user_id===user.uid);
    if(!posts.length){
      feed.innerHTML=feedMode==='following'
        ?'<div class="card empty">Você ainda não segue ninguém. Explore o PULSO e siga criadores.</div>'
        :'<div class="card empty">Ainda não há publicações.<br>Seja o primeiro a dar o primeiro PULSO.</div>';
      return;
    }
    try{
      profiles=new Map();
      await loadProfilesByIds(posts.map(p=>p.user_id));
    }catch(e){console.warn('[PULSO] perfis Firebase não carregaram',e);profiles=new Map();}
    const postIds=posts.map(p=>p.id);
    [currentLikes,currentComments]=await Promise.all([getByPostIds('Gostos',postIds),getByPostIds('comments',postIds)]);
    feed.innerHTML=posts.map(p=>renderPost(p)).join('');
    bindFeed();
    activateLazyMedia(feed);
    document.dispatchEvent(new CustomEvent('pulso-feed-rendered'));
  }catch(e){
    console.error('[PULSO] feed Firebase',e);
    feed.innerHTML='<div class="card empty"><strong>Erro no feed</strong><br>Não foi possível carregar as publicações agora.</div>';
  }
}

async function ensureProfile(targetId){
  if(!targetId)return{};
  if(profiles.has(targetId))return profiles.get(targetId);
  try{
    const s=await getDoc(doc(firebaseDb,'Perfis',targetId));
    const x=s.exists()?s.data():{};
    const p=normalizeProfile(x,targetId);
    if(p.id)profiles.set(p.id,p);
    profiles.set(targetId,p);return p;
  }catch(e){return{};}
}

window.pulsoOpenProfile=async function(targetId=null){
  const id=targetId||user?.uid;
  if(!id){location.href='entrar.html?next=app';return;}
  try{await import('./pulso-profile-view.js?v=20261005fix2');window.pulsoOpenProfileReal?.(id);}catch(e){console.error('[PULSO] perfil',e);}
};

function activateLazyMedia(root=document){
  const videos=root.querySelectorAll('video[data-src]');if(!videos.length)return;
  const load=v=>{const src=v.dataset.src;if(!src||v.src)return;v.src=src;v.removeAttribute('data-src');try{v.load()}catch(e){}};
  if(!('IntersectionObserver'in window)){videos.forEach(load);return;}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){load(entry.target);io.unobserve(entry.target);}}),{rootMargin:'500px 0px'});
  videos.forEach(v=>io.observe(v));
}
window.pulsoActivateLazyMedia=activateLazyMedia;
window.loadFeed=loadFeed;

function renderPost(p){
  const prof=profiles.get(p.user_id)||{};
  const pl=currentLikes.filter(x=>x.post_id===p.id);
  const mine=pl.find(x=>x.user_id===user.uid);
  const cs=currentComments.filter(x=>x.post_id===p.id);
  const src=p.media_url||p.video_url||'';
  let media='';
  if(p.media_type==='image')media='<img class="video" src="'+esc(src)+'" alt="Publicação PULSO" loading="lazy">';
  else if(p.media_type==='audio')media='<audio class="video" src="'+esc(src)+'" controls preload="none"></audio>';
  else media='<video class="video" data-src="'+esc(src)+'" controls playsinline preload="none" muted></video>';
  const reactionCounts=Object.keys(REACTIONS).map(k=>{const n=pl.filter(x=>(x.reaction||'like')===k).length;return n?'<span class="reaction-count">'+REACTIONS[k]+' '+n+'</span>':''}).join('');
  const comments=cs.map(c=>{const cp=profiles.get(c.user_id)||{};return '<div class="comment"><b>'+esc(cp.display_name||'Usuário')+'</b> '+esc(c.content)+'</div>';}).join('')||'<div class="file">Seja o primeiro a comentar.</div>';
  return '<article class="card post" data-post="'+esc(p.id)+'"><div class="posthead" data-open-profile="'+esc(p.user_id)+'" role="button" tabindex="0"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||'Usuário')+'</strong><span>'+(prof.username?'@'+esc(prof.username):'membro PULSO')+'</span>'+(prof.status?'<small>'+esc(prof.status)+'</small>':'')+'</div>'+(p.user_id!==user.uid?'<button class="creator-follow '+(following.has(p.user_id)?'is-following':'')+'" data-follow-user="'+esc(p.user_id)+'" type="button">'+(following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'<span class="creator-you">Você</span>')+'</div>'+media+'<div class="caption">'+esc(p.caption)+'</div><div class="actions"><div class="reaction-wrap"><button class="action '+(mine?'active':'')+'" data-like type="button" aria-pressed="'+(mine?'true':'false')+'">'+(mine?'❤️ Descurtir':'♡ Curtir')+' · '+pl.length+'</button><button class="action reaction-more" data-reaction-menu type="button" aria-expanded="false">🙂 Reagir</button><div class="reaction-picker" data-reaction-picker role="menu" style="display:none">'+Object.entries(REACTIONS).map(([k,v])=>'<button type="button" data-reaction="'+k+'" title="'+k+'">'+v+'</button>').join('')+'</div></div>'+(reactionCounts?'<div class="reaction-summary">'+reactionCounts+'</div>':'')+(p.user_id!==user.uid?'<button class="action follow-action" data-follow-user="'+esc(p.user_id)+'" type="button">'+(following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'')+'<button class="action" data-likers type="button">👥 Quem curtiu</button><button class="action" data-share type="button">↗️ Compartilhar</button><button class="action" data-focus type="button">💬 '+cs.length+'</button>'+(p.user_id===user.uid?'<button class="action delete-action" data-delete type="button" title="Excluir publicação">🗑️ Excluir</button>':'')+'</div><div class="comments"><strong>Comentários</strong><div>'+comments+'</div></div><div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send type="button">Enviar</button></div></article>';
}

async function sharePost(id){
  const url=new URL(location.href);url.searchParams.set('post',id);url.hash='pulso-post';
  const data={title:'PULSO',text:'Confira esta publicação no PULSO',url:url.href};
  try{if(navigator.share){await navigator.share(data);return;}if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.href);alert('Link da publicação copiado.');return;}window.prompt('Copie o link da publicação:',url.href);}catch(e){if(e?.name!=='AbortError')console.warn('[PULSO] compartilhar',e);}
}
window.sharePost=sharePost;

function bindFeed(){
  document.querySelectorAll('[data-post]').forEach(card=>{
    const id=card.dataset.post;
    const author=card.querySelector('[data-open-profile]');
    author?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.pulsoOpenProfile?.(author.dataset.openProfile);});
    author?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.pulsoOpenProfile?.(author.dataset.openProfile);}});
    card.querySelector('[data-like]')?.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();await toggleReaction(id,'like');});
    const reactionMenu=card.querySelector('[data-reaction-menu]'),picker=card.querySelector('[data-reaction-picker]');
    reactionMenu?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!picker)return;const open=picker.style.display!=='none';picker.style.display=open?'none':'flex';picker.classList.toggle('is-open',!open);reactionMenu.setAttribute('aria-expanded',open?'false':'true');});
    card.querySelectorAll('[data-reaction]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();picker?.classList.remove('is-open');reactionMenu?.setAttribute('aria-expanded','false');await toggleReaction(id,b.dataset.reaction);}));
      card.querySelector('[data-share]')?.addEventListener('click',()=>sharePost(id));
    card.querySelector('[data-likers]')?.addEventListener('click',()=>showLikers(id));
    card.querySelector('[data-focus]')?.addEventListener('click',()=>card.querySelector('[data-comment]')?.focus());
    card.querySelector('[data-send]')?.addEventListener('click',()=>addComment(id,card));
    card.querySelector('[data-delete]')?.addEventListener('click',()=>deletePost(id,card));
  });
}

async function toggleReaction(id,reaction){
  const card=document.querySelector('[data-post="'+CSS.escape(id)+'"]'),button=card?.querySelector('[data-like]');
  if(button)button.disabled=true;
  try{
    const existing=currentLikes.find(x=>x.post_id===id&&x.user_id===user.uid);
    const likeId=existing?.id||id+'_'+user.uid;
    if(existing?.reaction===reaction){await deleteDoc(doc(firebaseDb,'Gostos',likeId));currentLikes=currentLikes.filter(x=>x.id!==likeId);}
    else{
      const data={post_id:id,user_id:user.uid,reaction,created_at:new Date().toISOString()};
      await setDoc(doc(firebaseDb,'Gostos',likeId),data);
      currentLikes=currentLikes.filter(x=>!(x.post_id===id&&x.user_id===user.uid));currentLikes.push({id:likeId,...data});
    }
    updateReactionCard(id);
  }catch(e){console.error('[PULSO] reação',e);if(button)button.title='Não foi possível registrar a reação. Toque novamente.';}
  if(button)button.disabled=false;
}

function updateReactionCard(id){
  const card=document.querySelector('[data-post="'+CSS.escape(id)+'"]');if(!card)return;
  const pl=currentLikes.filter(x=>x.post_id===id),mine=pl.find(x=>x.user_id===user.uid),button=card.querySelector('[data-like]');
  if(button){button.classList.toggle('active',!!mine);button.setAttribute('aria-pressed',mine?'true':'false');button.textContent=(mine?'❤️ Descurtir':'♡ Curtir')+' · '+pl.length;}
  let summary=card.querySelector('.reaction-summary');
  const html=Object.keys(REACTIONS).map(k=>{const n=pl.filter(x=>(x.reaction||'like')===k).length;return n?'<span class="reaction-count">'+REACTIONS[k]+' '+n+'</span>':''}).join('');
  if(html){if(!summary){summary=document.createElement('div');summary.className='reaction-summary';card.querySelector('.actions')?.appendChild(summary);}summary.innerHTML=html;}else summary?.remove();
}

async function addComment(id,card){
  const input=card.querySelector('[data-comment]'),text=input?.value.trim();if(!text)return;
  try{
    const ref=await addDoc(collection(firebaseDb,'comments'),{post_id:id,user_id:user.uid,content:text,created_at:new Date().toISOString()});
    currentComments.push({id:ref.id,post_id:id,user_id:user.uid,content:text,created_at:new Date().toISOString()});
    input.value='';
    const box=card.querySelector('.comments>div');if(box){if(box.querySelector('.file'))box.innerHTML='';const row=document.createElement('div');row.className='comment';row.innerHTML='<b>'+esc($('#name')?.textContent||'Você')+'</b> '+esc(text);box.appendChild(row);}
    const focus=card.querySelector('[data-focus]');if(focus){const m=focus.textContent.match(/\d+/);focus.textContent='💬 '+String(Number(m?.[0]||0)+1);}
  }catch(e){alert('Não foi possível comentar: '+(e.message||e));}
}

async function deletePost(id,card){
  if(!confirm('Excluir esta publicação? Esta ação não pode ser desfeita.'))return;
  try{await deleteDoc(doc(firebaseDb,'Posts',id));card.remove();}catch(e){alert('Não foi possível excluir: '+(e.message||e));}
}

async function showLikers(id){
  try{
    const rows=currentLikes.filter(x=>x.post_id===id);
    const ids=[...new Set(rows.map(x=>x.user_id))];
    await Promise.all(ids.map(ensureProfile));
    openModal('Quem reagiu',rows.map(x=>{const p=profiles.get(x.user_id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||'Usuário')+'</strong><span>'+REACTIONS[x.reaction||'like']+' '+(p.username?'@'+esc(p.username):'')+'</span></div></div>';}).join('')||'Ainda ninguém reagiu.');
  }catch(e){alert('Não foi possível carregar as reações.');}
}

function openModal(title,body){const m=$('#socialModal');if(!m)return;$('#modalTitle').textContent=title;$('#modalBody').innerHTML=body;m.hidden=false;}
function closeModal(){const m=$('#socialModal');if(m)m.hidden=true;}
function setFeedMode(mode){feedMode=mode;document.querySelectorAll('.feed-switch-btn').forEach(b=>{const a=b.id===(mode==='forYou'?'feedForYou':'feedFollowing');b.classList.toggle('active',a);b.setAttribute('aria-selected',a?'true':'false');});loadFeed();}
window.pulsoSetFeedMode=setFeedMode;

window.pulsoLogout=async function(){
  try{
    await signOut(firebaseAuth);
  }catch(e){
    console.error('[PULSO] erro ao sair',e);
  }finally{
    location.replace('entrar.html');
  }
};

document.addEventListener('click',e=>{
  const b=e.target.closest?.('#profileBtn,#feedForYou,#feedFollowing,#followersBtn,#followingBtn,#modalClose,#logoutBtn');if(!b)return;
  if(b.id==='profileBtn'){e.preventDefault();window.pulsoOpenProfile?.(user?.uid);}
  if(b.id==='feedForYou'){e.preventDefault();setFeedMode('forYou');}
  if(b.id==='feedFollowing'){e.preventDefault();setFeedMode('following');}
  if(b.id==='modalClose'){e.preventDefault();closeModal();}
  if(b.id==='followersBtn'){e.preventDefault();showPeople('followers');}
  if(b.id==='followingBtn'){e.preventDefault();showPeople('following');}
  if(b.id==='logoutBtn'){e.preventDefault();window.pulsoLogout?.();}
},true);

async function showPeople(kind){
  try{
    const q=await getDocs(query(collection(firebaseDb,'follows'),where(kind==='followers'?'following_id':'follower_id','==',user.uid),limit(500)));
    const rows=q.docs.map(d=>({id:d.id,...(d.data()||{})}));
    const ids=rows.map(x=>kind==='followers'?x.follower_id:x.following_id).filter(Boolean);
    if(!ids.length){openModal(kind==='followers'?'Quem te seguiu':'Quem você segue','Ainda não há ninguém nesta lista.');return;}
    await Promise.all([...new Set(ids)].map(ensureProfile));
    openModal(kind==='followers'?'Quem te seguiu':'Quem você segue',[...new Set(ids)].map(id=>{const p=profiles.get(id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||'Usuário')+'</strong><span>'+(p.username?'@'+esc(p.username):'membro PULSO')+'</span></div></div>';}).join(''));
  }catch(e){alert('Não foi possível carregar a lista.');}
}

document.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&e.target.closest?.('[data-comment]')){e.preventDefault();e.target.closest('[data-post]')?.querySelector('[data-send]')?.click();}});
document.addEventListener('pulso-published',()=>loadFeed());
window.addEventListener('error',e=>console.error('[PULSO]',e.error||e.message));
window.addEventListener('unhandledrejection',e=>console.error('[PULSO]',e.reason));
onAuthStateChanged(firebaseAuth,authUser=>{if(authUser){user=authUser;init();}else{location.href='entrar.html?next=app';}});


/* PULSO mobile focus: fullscreen media with tap-to-toggle controls. */
(function pulsoMobileVideoFocus(){
  if (window.__pulsoMobileVideoFocusBound) return;
  window.__pulsoMobileVideoFocusBound = true;
  let hideTimer = 0;
  const mobile = () => window.matchMedia && window.matchMedia('(max-width: 600px)').matches;
  const focused = () => document.body.classList.contains('pulso-video-focus');

  function scheduleHide(post, delay=700) {
    clearTimeout(hideTimer);
    hideTimer = window.setTimeout(() => {
      if (focused() && post.isConnected) post.classList.add('pulso-controls-hidden');
    }, delay);
  }
  function enter(post) {
    document.body.classList.add('pulso-video-focus');
    document.querySelectorAll('#feed .post').forEach(p => {
      p.classList.remove('pulso-controls-hidden','pulso-focused-post');
    });
    post.classList.add('pulso-focused-post');
    post.classList.remove('pulso-controls-hidden');
    if (!post.querySelector('[data-exit-video-focus]')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.dataset.exitVideoFocus = '1';
      back.setAttribute('aria-label','Sair da tela cheia');
      back.title = 'Sair da tela cheia';
      back.textContent = '‹';
      back.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); exit(); });
      post.appendChild(back);
    }
    scheduleHide(post, 2200);
  }
  function exit() {
    clearTimeout(hideTimer);
    document.body.classList.remove('pulso-video-focus');
    document.querySelectorAll('#feed .post').forEach(p => {
      p.classList.remove('pulso-controls-hidden','pulso-focused-post');
      p.querySelector('[data-exit-video-focus]')?.remove();
    });
  }

  document.addEventListener('click', e => {
    if (!mobile()) return;
    const post = e.target.closest?.('#feed .post');
    if (!post) { if (focused()) exit(); return; }
    if (e.target.closest('[data-exit-video-focus]')) return;
    const media = e.target.closest?.('#feed .post > video.video, #feed .post > img.video');
    const action = e.target.closest?.('.actions button, .posthead button, [data-open-profile], input, textarea, a');

    if (!focused()) {
      if (media || !action) enter(post);
      return;
    }
    if (!post.classList.contains('pulso-focused-post')) return;
    if (action) {
      scheduleHide(post, 700);
      return;
    }
    if (post.classList.contains('pulso-controls-hidden')) {
      post.classList.remove('pulso-controls-hidden');
      scheduleHide(post, 2200);
    } else {
      post.classList.add('pulso-controls-hidden');
      clearTimeout(hideTimer);
    }
  }, true);

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && focused()) exit(); });
  window.addEventListener('resize', () => { if (!mobile()) exit(); });
  window.addEventListener('pageshow', () => { if (!mobile()) exit(); });
})();
