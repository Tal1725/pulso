import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{collection,getDocs,doc,getDoc,setDoc,deleteDoc,addDoc,query,where}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import{onAuthStateChanged,signOut}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

const $=s=>document.querySelector(s);
let user=null;
let feedMode='forYou';
let following=new Set();
let profiles=new Map();
let currentLikes=[];
let currentComments=[];
const REACTIONS={like:'👍',love:'❤️',haha:'😂',wow:'😮',sad:'😢',angry:'😡'};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const avatarHtml=p=>p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||'?').charAt(0).toUpperCase())+'</span>';
const timeValue=v=>v?.toMillis?v.toMillis():(typeof v==='number'?v:(Date.parse(v)||0));

async function getAll(name){
  const snap=await getDocs(collection(firebaseDb,name));
  return snap.docs.map(d=>({id:d.id,...(d.data()||{})}));
}

async function init(){
  try{
    const notice=$('#notice');
    if(!firebaseAuth.currentUser){location.href='entrar.html?next=app';return;}
    user=firebaseAuth.currentUser;
    const adminBtn=$('#adminBtn');
    if(adminBtn){adminBtn.hidden=false;document.body.classList.add('pulso-admin-user');}
    const pSnap=await getDoc(doc(firebaseDb,'Perfis',user.uid));
    const p=pSnap.exists()?pSnap.data():{};
    $('#name')?.replaceChildren(document.createTextNode(p.display_name||p['Nome']||user.email||'Membro PULSO'));
    if($('#handle'))$('#handle').textContent=p.username?'@'+p.username:'';
    if($('#avatar'))$('#avatar').innerHTML=avatarHtml(p);
    if(notice)notice.textContent='Você está dentro do PULSO. Carregando publicações...';
    await refreshFollowing();
    await loadFeed();
    await loadSocialStats();
    if(notice)notice.textContent='PULSO carregado.';
  }catch(e){
    console.error('[PULSO] inicialização',e);
    const n=$('#notice');if(n)n.textContent='PULSO carregado, mas houve um erro. Recarregue a página.';
  }
}

async function refreshFollowing(){
  try{
    const rows=await getAll('follows');
    following=new Set(rows.filter(x=>x.follower_id===user.uid).map(x=>x.following_id).filter(Boolean));
  }catch(e){console.warn('[PULSO] follows não carregou',e);following=new Set();}
  window._following=following;
}

async function loadSocialStats(){
  try{
    const rows=await getAll('follows');
    const followers=rows.filter(x=>x.following_id===user.uid).length;
    const followingCount=rows.filter(x=>x.follower_id===user.uid).length;
    if($('#followersCount'))$('#followersCount').textContent=followers;
    if($('#followingCount'))$('#followingCount').textContent=followingCount;
  }catch(e){console.warn('[PULSO] stats não carregou',e);}
}

async function loadFeed(){
  const feed=$('#feed');if(!feed)return;
  try{
    let posts=(await getAll('Posts')).map(x=>({
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
    profiles=new Map();
    try{
      (await getAll('Perfis')).forEach(x=>{
        const id=x.id;
        profiles.set(id,{id,username:x.username||x['Nome de usuário']||'',display_name:x.display_name||x['Nome de usuário']||x['Nome']||'Usuário',avatar_url:x.avatar_url||null});
      });
    }catch(e){console.warn('[PULSO] perfis Firebase não carregaram',e);}
    currentLikes=await getAll('Gostos');
    currentComments=await getAll('comments');
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
    const p={id:targetId,username:x.username||x['Nome de usuário']||'',display_name:x.display_name||x['Nome de usuário']||x['Nome']||'Usuário',avatar_url:x.avatar_url||null,bio:x.bio||x.Bio||'',status:x.status||''};
    profiles.set(targetId,p);return p;
  }catch(e){return{};}
}

window.pulsoOpenProfile=async function(targetId=null){
  const id=targetId||user?.uid;
  if(!id){location.href='entrar.html?next=app';return;}
  try{await import('./pulso-profile-view.js?v=20261004a');window.pulsoOpenProfileReal?.(id);}catch(e){console.error('[PULSO] perfil',e);}
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
  return '<article class="card post" data-post="'+esc(p.id)+'"><div class="posthead" data-open-profile="'+esc(p.user_id)+'" role="button" tabindex="0"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||'Usuário')+'</strong><span>'+(prof.username?'@'+esc(prof.username):'membro PULSO')+'</span></div></div>'+media+'<div class="caption">'+esc(p.caption)+'</div><div class="actions"><div class="reaction-wrap"><button class="action '+(mine?'active':'')+'" data-like type="button" aria-pressed="'+(mine?'true':'false')+'">'+(mine?'❤️ Descurtir':'♡ Curtir')+' · '+pl.length+'</button><button class="action reaction-more" data-reaction-menu type="button" aria-expanded="false">🙂 Reagir</button><div class="reaction-picker" data-reaction-picker role="menu" style="display:none">'+Object.entries(REACTIONS).map(([k,v])=>'<button type="button" data-reaction="'+k+'" title="'+k+'">'+v+'</button>').join('')+'</div></div>'+(reactionCounts?'<div class="reaction-summary">'+reactionCounts+'</div>':'')+(p.user_id!==user.uid?'<button class="action follow-action" data-follow-user="'+esc(p.user_id)+'" type="button">'+(following.has(p.user_id)?'✓ Seguindo':'+ Seguir')+'</button>':'')+'<button class="action" data-likers type="button">👥 Quem curtiu</button><button class="action" data-focus type="button">💬 '+cs.length+'</button>'+(p.user_id===user.uid?'<button class="action delete-action" data-delete type="button" title="Excluir publicação">🗑️ Excluir</button>':'')+'</div><div class="comments"><strong>Comentários</strong><div>'+comments+'</div></div><div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send type="button">Enviar</button></div></article>';
}

function bindFeed(){
  document.querySelectorAll('[data-post]').forEach(card=>{
    const id=card.dataset.post;
    const author=card.querySelector('[data-open-profile]');
    author?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();window.pulsoOpenProfile?.(author.dataset.openProfile);});
    author?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.pulsoOpenProfile?.(author.dataset.openProfile);}});
    card.querySelector('[data-like]')?.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();await toggleReaction(id,'like');});
    const reactionMenu=card.querySelector('[data-reaction-menu]'),picker=card.querySelector('[data-reaction-picker]');
    reactionMenu?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!picker)return;const open=picker.style.display!=='none';picker.style.display=open?'none':'flex';reactionMenu.setAttribute('aria-expanded',open?'false':'true');});
    card.querySelectorAll('[data-reaction]').forEach(b=>b.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();picker&&(picker.style.display='none');reactionMenu?.setAttribute('aria-expanded','false');await toggleReaction(id,b.dataset.reaction);}));
    card.querySelector('[data-follow-user]')?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggleFollow(e.currentTarget.dataset.followUser,e.currentTarget);});
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

async function toggleFollow(id,b){
  b.disabled=true;const exists=following.has(id),followId=user.uid+'_'+id;
  try{
    if(exists){await deleteDoc(doc(firebaseDb,'follows',followId));following.delete(id);}
    else{await setDoc(doc(firebaseDb,'follows',followId),{follower_id:user.uid,following_id:id,created_at:new Date().toISOString()});following.add(id);}
    window._following=following;b.textContent=exists?'+ Seguir':'✓ Seguindo';
    const fc=$('#followingCount');if(fc){const n=Number(fc.textContent||0);fc.textContent=Math.max(0,n+(exists?-1:1));}
    document.dispatchEvent(new CustomEvent('pulso-follow-changed'));
  }catch(e){alert('Não foi possível atualizar o seguimento: '+(e.message||e));}
  b.disabled=false;
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

document.addEventListener('click',e=>{
  const b=e.target.closest?.('#feedForYou,#feedFollowing,#followersBtn,#followingBtn,#modalClose,#logoutBtn');if(!b)return;
  if(b.id==='feedForYou'){e.preventDefault();setFeedMode('forYou');}
  if(b.id==='feedFollowing'){e.preventDefault();setFeedMode('following');}
  if(b.id==='modalClose'){e.preventDefault();closeModal();}
  if(b.id==='followersBtn'){e.preventDefault();showPeople('followers');}
  if(b.id==='followingBtn'){e.preventDefault();showPeople('following');}
  if(b.id==='logoutBtn'){e.preventDefault();signOut(firebaseAuth).finally(()=>location.href='entrar.html');}
},true);

async function showPeople(kind){
  try{
    const rows=await getAll('follows');
    const ids=rows.filter(x=>kind==='followers'?x.following_id===user.uid:x.follower_id===user.uid).map(x=>kind==='followers'?x.follower_id:x.following_id);
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
