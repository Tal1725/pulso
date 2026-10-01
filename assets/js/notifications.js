import { db } from "./firebase.js";
import { auth } from "./firebase.js";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
function icon(type){return type==="like"?"❤️":type==="follow"?"➕":type==="share"?"↗":"💬"}
function text(type,name){return type==="like"?`${name} curtiu seu vídeo`:type==="follow"?`${name} começou a seguir você`:type==="share"?`${name} compartilhou um vídeo com você`:`${name} comentou no seu vídeo`}
function ago(date){const d=date?.toDate?date.toDate():new Date(date||Date.now()),s=Math.max(1,Math.floor((Date.now()-d.getTime())/1000));if(s<60)return"agora";if(s<3600)return`há ${Math.floor(s/60)} min`;if(s<86400)return`há ${Math.floor(s/3600)} h`;if(s<604800)return`há ${Math.floor(s/86400)} d`;return d.toLocaleDateString("pt-BR")}
async function profile(id){const d=await getDoc(doc(db,"profiles",id));return d.exists()?{id:d.id,...d.data()}:null}
async function loadNotifications(){
 const uid=auth.currentUser?.uid;if(!uid)return;
 const snap=await getDocs(query(collection(db,"notifications"),where("recipient_id","==",uid),orderBy("created_at","desc"),limit(40)));
 const data=snap.docs.map(d=>({id:d.id,...d.data()}));
 const ids=[...new Set(data.map(n=>n.actor_id).filter(Boolean))];
 const map=new Map();for(const id of ids){const p=await profile(id);if(p)map.set(id,p)}
 const unread=data.filter(n=>!n.read_at).length,badge=$("#notificationBadge");if(badge){badge.textContent=unread>99?"99+":unread;badge.hidden=unread===0}
 const body=$("#notificationBody");if(!body)return;
 if(!data.length){body.innerHTML='<div class="notification-empty"><div class="notification-empty-icon">🔔</div><strong>Tudo tranquilo por aqui</strong><span>Quando alguém interagir com você, a novidade aparece aqui.</span></div>';return}
 body.innerHTML=data.map(n=>{const p=map.get(n.actor_id)||{};return `<button class="notification-row ${n.read_at?"":"unread"}" data-notification data-type="${esc(n.type)}" data-actor="${esc(n.actor_id||"")}" data-post="${esc(n.post_id||"")}" data-id="${n.id}"><span class="notification-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.display_name||"U")[0].toUpperCase())}<i>${icon(n.type)}</i></span><span class="notification-copy"><strong>${esc(p.display_name||"Usuário")}</strong><span>${esc(text(n.type,p.display_name||"Alguém"))}</span><small>${ago(n.created_at)}</small></span><span class="notification-arrow">›</span></button>`}).join("");
 body.querySelectorAll("[data-notification]").forEach(row=>row.onclick=async()=>{await markRead(row.dataset.id);row.classList.remove("unread");if(row.dataset.type==="follow"){window.pulsoOpenProfile?.(row.dataset.actor);return}if(row.dataset.post){const card=document.querySelector(`[data-post="${row.dataset.post}"]`);card?.scrollIntoView({behavior:"smooth",block:"center"});close();}});
}
async function markRead(id){const uid=auth.currentUser?.uid;if(!uid)return;await updateDoc(doc(db,"notifications",id),{read_at:new Date()}).catch(()=>{})}
async function markAllRead(){
 const uid=auth.currentUser?.uid;if(!uid)return;
 const snap=await getDocs(query(collection(db,"notifications"),where("recipient_id","==",uid),where("read_at","==",null),limit(100)));
 await Promise.all(snap.docs.map(d=>updateDoc(d.ref,{read_at:new Date()}))).catch(()=>{});
 await loadNotifications();
}
function open(){const m=$("#notificationModal");if(m){m.hidden=false;loadNotifications()}}
function close(){const m=$("#notificationModal");if(m)m.hidden=true}
window.loadNotifications=loadNotifications;
window.addEventListener("load",()=>{const b=$("#notificationBtn");if(b)b.onclick=open;$("#notificationClose")?.addEventListener("click",close);$("#notificationMarkAll")?.addEventListener("click",markAllRead);$("#notificationModal")?.addEventListener("click",e=>{if(e.target.id==="notificationModal")close()});loadNotifications()});
