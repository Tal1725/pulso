import { auth } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut,
} from "./firebase-auth.js";
import {
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const $=s=>document.querySelector(s);
let user=null;
let feedMode="forYou";
let following=new Set();
let profiles=new Map();
const REACTIONS={like:"👍",love:"❤️",haha:"😂",wow:"😮",sad:"😢",angry:"😡"};
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const avatarHtml=p=>p?.avatar_url?'<img class="avatar-photo" src="'+esc(p.avatar_url)+'" alt="Foto de perfil" loading="lazy">':'<span>'+esc((p?.display_name||"?").charAt(0).toUpperCase())+"</span>";

function chunk(arr,size=30){const out=[];for(let i=0;i<arr.length;i+=size)out.push(arr.slice(i,i+size));return out;}

async function readByIds(name,ids){
  if(!ids.length)return [];
  const rows=[];
  for(const part of chunk([...new Set(ids)])){
    const snap=await getDocs(query(collection(db,name),where(documentId(),"in",part)));
    snap.forEach(d=>rows.push({id:d.id,...d.data()}));
  }
  return rows;
}

async function getProfile(uid){
  const s=await getDoc(doc(db,"profiles",uid));
  return s.exists()?{id:s.id,...s.data()}:null;
}

async function ensureOwnProfile(firebaseUser){
  const existing=await getProfile(firebaseUser.uid);
  if(existing)return existing;
  const fallbackName=firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : "Membro PULSO");
  const profile={
    id:firebaseUser.uid,
    username:(fallbackName||"membro").toLowerCase().replace(/[^a-z0-9_.]/g,"").slice(0,24) || ("membro"+String(firebaseUser.uid).slice(0,6)),
    display_name:fallbackName,
    bio:"",
    avatar_url:null,
    birth_date:"",
    status:"",
    member_number:null,
    created_at:serverTimestamp(),
    updated_at:serverTimestamp()
  };
  await setDoc(doc(db,"profiles",firebaseUser.uid),profile,{merge:true});
  return profile;
}

async function ensureLegacyPosts(firebaseUser){
  const legacy=window.PULSO_LEGACY_POSTS||[];
  if(!legacy.length)return;
  let imported=0;
  for(const row of legacy){
    const [legacyId,legacyUserId,src,caption,createdAt,mediaType,parentLegacyId]=row;
    const ref=doc(db,"posts",legacyId);
    const existing=await getDoc(ref);
    if(existing.exists())continue;
    await setDoc(ref,{
      user_id:firebaseUser.uid,
      legacy_user_id:legacyUserId,
      legacy_post_id:legacyId,
      legacy_parent_post_id:parentLegacyId||null,
      caption:caption||"",
      media_type:mediaType||"text",
      media_url:src||null,
      video_url:mediaType==="video"?(src||null):null,
      media_provider:src?"legacy_supabase":"legacy_text",
      created_at:createdAt
    });
    imported++;
  }
  if(imported)console.info("[PULSO] publicações históricas registradas:",imported);
}

async function initForUser(firebaseUser){
  user=firebaseUser;
  const adminBtn=$("#adminBtn");
  if(adminBtn&&(user.email||"").toLowerCase()==="ayslan.tal@gmail.com"){adminBtn.hidden=false;localStorage.setItem("pulso_admin_migration","1");document.getElementById("legacyMediaBox")?.removeAttribute("hidden");}
  const p=await ensureOwnProfile(user);
  if(p){
    $("#name")?.replaceChildren(document.createTextNode(p.display_name||user.email||"Membro PULSO"));
    if($("#handle"))$("#handle").textContent=p.username?"@"+p.username:"";
    if($("#avatar"))$("#avatar").innerHTML=avatarHtml(p);
  }
  const notice=$("#notice");if(notice)notice.textContent="Você está dentro do PULSO. Carregando publicações...";
  await refreshFollowing();
  await ensureLegacyPosts(user);
  await loadFeed();
  await loadSocialStats();
}

async function init(){
  try{
    onAuthStateChanged(auth,async firebaseUser=>{
      if(!firebaseUser){location.href="entrar.html?next=app";return;}
      try{await initForUser(firebaseUser);}
      catch(e){console.error("[PULSO] inicialização",e);const n=$("#notice");if(n)n.textContent="PULSO carregado, mas houve um erro de conexão. Recarregue a página.";}
    });
  }catch(e){console.error("[PULSO] auth listener",e);}
}

async function refreshFollowing(){
  const snap=await getDocs(query(collection(db,"follows"),where("follower_id","==",user.uid)));
  following=new Set(snap.docs.map(d=>d.data().following_id));
  window._following=following;
}

async function countWhere(name,field,value){
  const snap=await getDocs(query(collection(db,name),where(field,"==",value)));
  return snap.size;
}

async function loadSocialStats(){
  const [followers,followingCount]=await Promise.all([
    countWhere("follows","following_id",user.uid),
    countWhere("follows","follower_id",user.uid)
  ]);
  if($("#followersCount"))$("#followersCount").textContent=followers;
  if($("#followingCount"))$("#followingCount").textContent=followingCount;
}

async function loadFeed(){
  const feed=$("#feed");if(!feed)return;
  try{
    let postSnap;
    try{
      postSnap=await getDocs(query(collection(db,"posts"),orderBy("created_at","desc"),limit(50)));
    }catch(orderError){
      console.warn("[PULSO] feed orderBy indisponível; usando leitura sem índice.",orderError);
      postSnap=await getDocs(query(collection(db,"posts"),limit(100)));
    }
    let posts=postSnap.docs.map(d=>({id:d.id,...d.data()}))
    .filter(p=>!p.legacy_post_id && p.media_provider!=="legacy_supabase");
    posts.sort((a,b)=>{
      const ta=a.created_at?.seconds?a.created_at.seconds*1000:(Date.parse(a.created_at||"")||0);
      const tb=b.created_at?.seconds?b.created_at.seconds*1000:(Date.parse(b.created_at||"")||0);
      return tb-ta;
    });
    posts=posts.slice(0,50);
    if(feedMode==="following")posts=posts.filter(p=>following.has(p.user_id)||p.user_id===user.uid);
    if(!posts.length){
      feed.innerHTML=feedMode==="following"
        ?'<div class="card empty">Você ainda não segue ninguém. Explore o PULSO e siga criadores.</div>'
        :'<div class="card empty">Ainda não há publicações.<br>Seja o primeiro a dar o primeiro PULSO.</div>';
      return;
    }
    profiles=new Map();
    const ps=await readByIds("profiles",posts.map(p=>p.user_id));
    ps.forEach(p=>profiles.set(p.id,p));
    const postIds=posts.map(p=>p.id);
    const likes=[];const comments=[];
    for(const part of chunk(postIds)){
      const [ls,cs]=await Promise.all([
        getDocs(query(collection(db,"likes"),where("post_id","in",part))),
        getDocs(query(collection(db,"comments"),where("post_id","in",part)))
      ]);
      ls.forEach(d=>likes.push({id:d.id,...d.data()}));
      cs.forEach(d=>comments.push({id:d.id,...d.data()}));
    }
    comments.sort((a,b)=>{const ta=a.created_at?.seconds?a.created_at.seconds*1000:(Date.parse(a.created_at||"")||0);const tb=b.created_at?.seconds?b.created_at.seconds*1000:(Date.parse(b.created_at||"")||0);return ta-tb;});
    feed.innerHTML=posts.map(p=>renderPost(p,likes,comments)).join("");
    bindFeed();activateLazyMedia(feed);
    document.dispatchEvent(new CustomEvent("pulso-feed-rendered"));
  }catch(e){
    console.error("[PULSO] feed",e);
    feed.innerHTML='<div class="card empty">O feed está temporariamente indisponível. Tente recarregar.</div>';
  }
}

function renderPost(p,likes,comments){
  const prof=profiles.get(p.user_id)||{};
  const mine=likes.find(x=>x.post_id===p.id&&x.user_id===user.uid);
  const pl=likes.filter(x=>x.post_id===p.id);
  const cs=comments.filter(x=>x.post_id===p.id);
  const src=p.media_url||p.video_url||"";
  let media="";
  if(src&&p.media_type==="image")media='<img class="video" src="'+esc(src)+'" alt="Publicação PULSO" loading="lazy">';
  else if(src&&p.media_type==="audio")media='<audio class="video" src="'+esc(src)+'" controls preload="none"></audio>';
  else if(src)media='<video class="video" data-src="'+esc(src)+'" controls playsinline preload="none" muted></video>';
  else media='<div class="video" style="display:grid;place-items:center;min-height:240px">📝 PULSO em texto</div>';
  const reactionCounts=Object.keys(REACTIONS).map(k=>{const n=pl.filter(x=>(x.reaction||"like")===k).length;return n?'<span class="reaction-count">'+REACTIONS[k]+" "+n+"</span>":""}).join("");
  return '<article class="card post" data-post="'+esc(p.id)+'"><div class="posthead" data-open-profile="'+esc(p.user_id)+'" role="button" tabindex="0"><div class="avatar">'+avatarHtml(prof)+'</div><div class="meta"><strong>'+esc(prof.display_name||"Usuário")+'</strong><span>'+(prof.username?"@"+esc(prof.username):"membro PULSO")+"</span></div></div>"+media+'<div class="caption">'+esc(p.caption||"")+'</div><div class="actions"><div class="reaction-wrap"><button class="action '+(mine?"active":"")+'" data-like type="button" aria-pressed="'+(mine?"true":"false")+'">'+(mine?"❤️ Descurtir":"♡ Curtir")+" · "+pl.length+'</button><button class="action reaction-more" data-reaction-menu type="button" aria-expanded="false">🙂 Reagir</button><div class="reaction-picker" data-reaction-picker role="menu" style="display:none">'+Object.entries(REACTIONS).map(([k,v])=>'<button type="button" data-reaction="'+k+'" title="'+k+'">'+v+"</button>").join("")+'</div></div>'+(reactionCounts?'<div class="reaction-summary">'+reactionCounts+"</div>":"")+(p.user_id!==user.uid?'<button class="action follow-action" data-follow-user="'+esc(p.user_id)+'" type="button">'+(following.has(p.user_id)?"✓ Seguindo":"+ Seguir")+"</button>":"")+'<button class="action" data-likers type="button">👥 Quem curtiu</button><button class="action" data-focus type="button">💬 '+cs.length+"</button>"+(p.user_id===user.uid?'<button class="action delete-action" data-delete type="button">🗑️ Excluir</button>':"")+'</div><div class="comments"><strong>Comentários</strong><div>'+(cs.map(c=>{const cp=profiles.get(c.user_id)||{};return '<div class="comment"><b>'+esc(cp.display_name||"Usuário")+"</b> "+esc(c.content||"")+"</div>"}).join("")||'<div class="file">Seja o primeiro a comentar.</div>')+'</div></div><div class="commentbox"><input data-comment maxlength="500" placeholder="Escreva um comentário..."><button class="pill" data-send type="button">Enviar</button></div></article>';
}

function bindFeed(){
  document.querySelectorAll("[data-post]").forEach(card=>{
    const id=card.dataset.post;
    card.querySelector("[data-open-profile]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();window.pulsoOpenProfile?.(card.querySelector("[data-open-profile]").dataset.openProfile)});
    card.querySelector("[data-like]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();toggleReaction(id,"like")});
    const menu=card.querySelector("[data-reaction-menu]"),picker=card.querySelector("[data-reaction-picker]");
    menu?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const open=picker?.style.display!=="none";if(picker)picker.style.display=open?"none":"flex";menu.setAttribute("aria-expanded",open?"false":"true");});
    card.querySelectorAll("[data-reaction]").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();if(picker)picker.style.display="none";toggleReaction(id,b.dataset.reaction)}));
    card.querySelector("[data-follow-user]")?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();toggleFollow(e.currentTarget.dataset.followUser,e.currentTarget)});
    card.querySelector("[data-likers]")?.addEventListener("click",()=>showLikers(id));
    card.querySelector("[data-focus]")?.addEventListener("click",()=>card.querySelector("[data-comment]")?.focus());
    card.querySelector("[data-send]")?.addEventListener("click",()=>addComment(id,card));
    card.querySelector("[data-delete]")?.addEventListener("click",()=>deletePost(id,card));
  });
}

function reactionDocId(postId,uid){return postId+"_"+uid;}

async function toggleReaction(id,reaction){
  const card=document.querySelector('[data-post="'+CSS.escape(id)+'"]'),button=card?.querySelector("[data-like]");
  if(button?.disabled)return;
  if(button)button.disabled=true;
  try{
    const ref=doc(db,"likes",reactionDocId(id,user.uid)),snap=await getDoc(ref),old=snap.exists()?snap.data().reaction:"";
    if(old===reaction)await deleteDoc(ref);
    else await setDoc(ref,{post_id:id,user_id:user.uid,reaction,created_at:serverTimestamp()},{merge:true});
    updateReactionCard(id,old===reaction?null:reaction);
  }catch(e){console.error("[PULSO] reação",e);if(button)button.disabled=false;alert("Não foi possível registrar a reação agora.");}
}

function updateReactionCard(id,reaction){
  const card=document.querySelector('[data-post="'+CSS.escape(id)+'"]');if(!card)return;
  const b=card.querySelector("[data-like]");if(!b)return;
  const m=(b.textContent||"").match(/·\s*(\d+)/);let n=Number(m?.[1]||0);
  if(reaction===null)n=Math.max(0,n-1);else if(!b.classList.contains("active"))n++;
  b.classList.toggle("active",reaction!==null);b.setAttribute("aria-pressed",reaction!==null?"true":"false");b.textContent=(reaction!==null?"❤️ Descurtir":"♡ Curtir")+" · "+n;b.disabled=false;
}

async function toggleFollow(id,b){
  if(!id||id===user.uid)return;
  b.disabled=true;const ref=doc(db,"follows",user.uid+"_"+id),snap=await getDoc(ref),exists=snap.exists();
  try{
    if(exists)await deleteDoc(ref);else await setDoc(ref,{follower_id:user.uid,following_id:id,created_at:serverTimestamp()});
    exists?following.delete(id):following.add(id);window._following=following;
    b.textContent=exists?"+ Seguir":"✓ Seguindo";b.disabled=false;document.dispatchEvent(new CustomEvent("pulso-follow-changed"));
    loadSocialStats();
  }catch(e){b.disabled=false;alert("Não foi possível atualizar o seguir agora.");}
}

async function addComment(id,card){
  const input=card.querySelector("[data-comment]"),text=input?.value.trim();if(!text)return;
  try{
    await addDoc(collection(db,"comments"),{post_id:id,user_id:user.uid,content:text,created_at:serverTimestamp()});
    input.value="";await loadFeed();
  }catch(e){alert("Não foi possível enviar o comentário agora.");}
}

async function deletePost(id,card){
  if(!confirm("Excluir esta publicação? Esta ação não pode ser desfeita."))return;
  const snap=await getDoc(doc(db,"posts",id));
  if(!snap.exists()||snap.data().user_id!==user.uid){alert("Você não pode excluir esta publicação.");return;}
  await deleteDoc(doc(db,"posts",id));card.remove();
}

async function showLikers(id){
  const snap=await getDocs(query(collection(db,"likes"),where("post_id","==",id)));
  const rows=snap.docs.map(d=>d.data()),ids=rows.map(x=>x.user_id),ps=await readByIds("profiles",ids),map=new Map(ps.map(p=>[p.id,p]));
  openModal("Quem reagiu",rows.map(x=>{const p=map.get(x.user_id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||"Usuário")+'</strong><span>'+REACTIONS[x.reaction||"like"]+" "+(p.username?"@"+esc(p.username):"")+"</span></div></div>"}).join("")||"Ainda ninguém reagiu.");
}

function openModal(title,body){const m=$("#socialModal");if(!m)return;$("#modalTitle").textContent=title;$("#modalBody").innerHTML=body;m.hidden=false;}
function closeModal(){const m=$("#socialModal");if(m)m.hidden=true;}

async function showPeople(kind){
  const field=kind==="followers"?"follower_id":"following_id",target=kind==="followers"?"following_id":"follower_id";
  const snap=await getDocs(query(collection(db,"follows"),where(target,"==",user.uid)));
  const ids=snap.docs.map(d=>d.data()[field]);
  if(!ids.length){openModal(kind==="followers"?"Quem te seguiu":"Quem você segue","Ainda não há ninguém nesta lista.");return;}
  const ps=await readByIds("profiles",ids),map=new Map(ps.map(p=>[p.id,p]));
  openModal(kind==="followers"?"Quem te seguiu":"Quem você segue",ids.map(id=>{const p=map.get(id)||{};return '<div class="person-row"><div class="avatar mini">'+avatarHtml(p)+'</div><div><strong>'+esc(p.display_name||"Usuário")+'</strong><span>'+(p.username?"@"+esc(p.username):"membro PULSO")+"</span></div></div>"}).join(""));
}

window.pulsoOpenProfile=async function(id=user?.uid){
  if(!id)return;
  const [p,postsSnap]=await Promise.all([
    getProfile(id),
    getDocs(query(collection(db,"posts"),where("user_id","==",id),orderBy("created_at","desc"),limit(50)))
  ]);
  if(!p){alert("Perfil não encontrado.");return;}
  const posts=postsSnap.docs.map(d=>({id:d.id,...d.data()}));
  const followers=await countWhere("follows","following_id",id),followingCount=await countWhere("follows","follower_id",id);
  const m=document.createElement("div");m.id="pulsoProfileView";m.style.cssText="position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.86);overflow:auto;padding:18px;box-sizing:border-box";
  m.innerHTML='<div style="max-width:720px;margin:20px auto;background:#17171b;color:#fff;border-radius:20px;padding:20px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center"><h2>Perfil</h2><button type="button" id="ppClose" style="background:#303038;color:#fff;border:0;border-radius:10px;padding:10px 14px">Fechar</button></div><div style="margin-top:18px"><div style="display:flex;gap:16px;align-items:center"><div class="avatar" style="width:86px;height:86px">'+avatarHtml(p)+'</div><div><h3 style="margin:0 0 4px">'+esc(p.display_name||"Usuário")+'</h3><div style="opacity:.7">'+(p.username?"@"+esc(p.username):"membro PULSO")+'</div><div style="margin-top:8px">'+esc(p.bio||"")+'</div></div></div><hr style="border-color:rgba(255,255,255,.1);margin:20px 0"><div><strong>'+followers+'</strong> seguidores · <strong>'+followingCount+'</strong> seguindo · <strong>'+posts.length+'</strong> publicações</div><h3>Publicações</h3>'+(posts.length?posts.map(x=>{const src=x.media_url||x.video_url||"";return '<article style="padding:14px 0;border-top:1px solid rgba(255,255,255,.1)">'+(x.media_type==="image"?'<img src="'+esc(src)+'" style="width:100%;max-height:420px;object-fit:contain;border-radius:14px">':'<video src="'+esc(src)+'" controls playsinline style="width:100%;max-height:420px;border-radius:14px"></video>')+'<div style="margin-top:8px">'+esc(x.caption||"")+"</div></article>"}).join(""):'<div style="opacity:.7">Nenhuma publicação encontrada.</div>')+"</div></div>";
  document.body.appendChild(m);m.querySelector("#ppClose").onclick=()=>m.remove();
};

function activateLazyMedia(root=document){
  const videos=root.querySelectorAll("video[data-src]");if(!videos.length)return;
  const load=v=>{const src=v.dataset.src;if(!src||v.src)return;v.src=src;v.removeAttribute("data-src");try{v.load()}catch{}};
  if(!("IntersectionObserver" in window)){videos.forEach(load);return;}
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){load(e.target);io.unobserve(e.target)}}),{rootMargin:"500px 0px"});videos.forEach(v=>io.observe(v));
}
window.pulsoActivateLazyMedia=activateLazyMedia;
window.loadFeed=loadFeed;

function setFeedMode(mode){feedMode=mode;document.querySelectorAll(".feed-switch-btn").forEach(b=>{const active=b.id===(mode==="forYou"?"feedForYou":"feedFollowing");b.classList.toggle("active",active);b.setAttribute("aria-selected",active?"true":"false")});loadFeed();}
window.pulsoSetFeedMode=setFeedMode;

document.addEventListener("click",e=>{
  const b=e.target.closest?.("#feedForYou,#feedFollowing,#followersBtn,#followingBtn,#modalClose,#logoutBtn");
  if(!b)return;
  if(b.id==="feedForYou"){e.preventDefault();setFeedMode("forYou");}
  if(b.id==="feedFollowing"){e.preventDefault();setFeedMode("following");}
  if(b.id==="modalClose"){e.preventDefault();closeModal();}
  if(b.id==="followersBtn"){e.preventDefault();showPeople("followers");}
  if(b.id==="followingBtn"){e.preventDefault();showPeople("following");}
  if(b.id==="logoutBtn"){e.preventDefault();signOut(auth).finally(()=>location.href="entrar.html");}
},true);

document.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&e.target.closest?.("[data-comment]")){e.preventDefault();e.target.closest("[data-post]")?.querySelector("[data-send]")?.click();}});
document.addEventListener("pulso-published",()=>loadFeed());
window.addEventListener("error",e=>console.error("[PULSO]",e.error||e.message));
window.addEventListener("unhandledrejection",e=>console.error("[PULSO]",e.reason));
init();