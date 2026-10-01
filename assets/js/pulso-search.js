import { db } from "./firebase.js";
import { collection, getDocs, limit, query, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
async function search(q){
  q=q.trim().toLowerCase();
  const box=$("#searchResults"); if(!box)return;
  if(!q){box.innerHTML='<div class="search-empty">Digite algo para pesquisar.</div>';return;}
  box.innerHTML='<div class="search-loading">🔎 Pesquisando no PULSO...</div>';
  try{
    const [ps,posts,hs]=await Promise.all([
      getDocs(query(collection(db,"profiles"),limit(60))),
      getDocs(query(collection(db,"posts"),orderBy("created_at","desc"),limit(60))),
      getDocs(query(collection(db,"hives"),limit(60)))
    ]);
    const profiles=ps.docs.map(d=>({id:d.id,...d.data()})).filter(p=>(p.display_name||"").toLowerCase().includes(q)||(p.username||"").toLowerCase().includes(q)).slice(0,8);
    const postRows=posts.docs.map(d=>({id:d.id,...d.data()})).filter(p=>(p.caption||"").toLowerCase().includes(q)).slice(0,8);
    const hives=hs.docs.map(d=>({id:d.id,...d.data()})).filter(h=>!h.is_private&&((h.name||"").toLowerCase().includes(q)||(h.description||"").toLowerCase().includes(q))).slice(0,8);
    let html="";
    if(profiles.length)html+='<div class="search-group"><h3>👤 Pessoas</h3>'+profiles.map(p=>`<button class="search-row" data-search-profile="${p.id}"><span class="search-avatar">${esc((p.display_name||"P")[0].toUpperCase())}</span><span><b>${esc(p.display_name||"Usuário")}</b><small>${p.username?"@"+esc(p.username):"Membro"}${p.member_number?" · #"+String(p.member_number).padStart(6,"0"):""}</small></span><i>›</i></button>`).join("")+"</div>";
    if(hives.length)html+='<div class="search-group"><h3>🐝 Colmeias</h3>'+hives.map(h=>`<button class="search-row" data-search-hive="${h.id}"><span class="search-icon">🐝</span><span><b>${esc(h.name)}</b><small>${esc(h.description||"Comunidade PULSO")}</small></span><i>›</i></button>`).join("")+"</div>";
    if(postRows.length)html+='<div class="search-group"><h3>📝 Publicações</h3>'+postRows.map(p=>`<button class="search-row" data-search-post="${p.id}"><span class="search-icon">⚡</span><span><b>${esc(p.caption||"Publicação sem texto")}</b><small>Ver publicação no feed</small></span><i>›</i></button>`).join("")+"</div>";
    box.innerHTML=html||'<div class="search-empty">Nenhum resultado para <b>'+esc(q)+'</b>.</div>';
  }catch(e){console.error("[PULSO] pesquisa",e);box.innerHTML='<div class="search-empty">Não foi possível pesquisar agora.</div>';}
}
function close(){const m=$("#searchModal");if(m)m.hidden=true}
function open(){const m=$("#searchModal");if(m)m.hidden=false;$("#searchInput")?.focus()}
document.addEventListener("click",e=>{
 const p=e.target.closest?.("[data-search-profile]"); if(p){e.preventDefault();e.stopImmediatePropagation();close();window.pulsoOpenProfile?.(p.dataset.searchProfile);return;}
 if(e.target.closest("#searchOpen")){e.preventDefault();e.stopImmediatePropagation();open();return}
 if(e.target.closest("#searchClose")){e.preventDefault();e.stopImmediatePropagation();close();return}
 const h=e.target.closest?.("[data-search-hive]");if(h){e.preventDefault();e.stopImmediatePropagation();close();window.pulsoOpenHive?.(h.dataset.searchHive);return}
 const post=e.target.closest?.("[data-search-post]");if(post){e.preventDefault();e.stopImmediatePropagation();close();const card=document.querySelector(`[data-post="${post.dataset.searchPost}"]`);card?.scrollIntoView({behavior:"smooth",block:"center"});card?.classList.add("post-highlight");setTimeout(()=>card?.classList.remove("post-highlight"),1800);}
},{capture:true});
$("#searchInput")?.addEventListener("input",e=>{clearTimeout(window._pulsoSearchTimer);window._pulsoSearchTimer=setTimeout(()=>search(e.target.value),250)});
$("#searchInput")?.addEventListener("keydown",e=>{if(e.key==="Escape")close()});
