import { db, auth } from "./firebase.js";
import { collection, doc, getDoc, getDocs, addDoc, limit, orderBy, query, where, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
let me=null,current=null,peopleCache=[];
const modal=()=>document.getElementById("messagesModal");
const setMsg=(t,ok=false)=>{const e=document.getElementById("messageStatus");if(e){e.textContent=t;e.className=ok?"message-status ok":"message-status"}};
const age=v=>{if(!v)return null;const d=new Date(v+"T00:00:00"),n=new Date();let a=n.getFullYear()-d.getFullYear(),m=n.getMonth()-d.getMonth();if(m<0||(m===0&&n.getDate()<d.getDate()))a--;return a};
async function profile(id){const d=await getDoc(doc(db,"profiles",id));return d.exists()?{id:d.id,...d.data()}:null}
async function isMutual(id){if(!me||!id||id===me)return false;const [a,b]=await Promise.all([getDoc(doc(db,"follows",me+"_"+id)),getDoc(doc(db,"follows",id+"_"+me))]);return a.exists()&&b.exists()}
async function myAge(){const p=await profile(me);return age(p?.birth_date)}
async function loadPeople(){
 const box=document.getElementById("messagePeople");if(!box||!me)return;
 const a=await myAge();if(a===null){box.innerHTML='<div class="message-empty">🛡️ Informe sua data de nascimento em <strong>Editar perfil</strong>.</div>';return}
 if(a<18){box.innerHTML='<div class="message-empty">🛡️ Mensagens privadas são liberadas somente para usuários adultos.</div>';return}
 const f=await getDocs(query(collection(db,"follows"),where("follower_id","==",me),limit(100)));
 const ids=f.docs.map(d=>d.data().following_id);peopleCache=[];
 for(const id of ids){if(await isMutual(id)){const p=await profile(id);if(p&&age(p.birth_date)>=18)peopleCache.push(p)}}
 renderPeople("");
}
function renderPeople(q=""){
 const box=document.getElementById("messagePeople");if(!box)return;const n=q.trim().toLowerCase();const matches=peopleCache.filter(p=>!n||(p.display_name||"").toLowerCase().includes(n)||(p.username||"").toLowerCase().includes(n));
 box.innerHTML='<div class="message-search"><span>🔎</span><input id="messageContactSearch" type="search" placeholder="Procure alguém para conversar..." value="'+esc(q)+'"></div>'+(n?matches.map(p=>`<button class="message-person" data-person="${p.id}" type="button"><span class="message-avatar">${p.avatar_url?`<img src="${esc(p.avatar_url)}" alt="">`:esc((p.display_name||"?")[0].toUpperCase())}</span><span><b>${esc(p.display_name||"Usuário")}</b><small>@${esc(p.username||"membro")} · #${String(p.member_number||0).padStart(6,"0")}</small></span></button>`).join(""):'<div class="message-empty">Digite o nome ou @usuário para encontrar alguém.</div>');
 document.getElementById("messageContactSearch")?.addEventListener("input",e=>renderPeople(e.target.value));box.querySelectorAll("[data-person]").forEach(b=>b.onclick=()=>selectPerson(peopleCache.find(p=>p.id===b.dataset.person)));if(n&&!matches.length)box.insertAdjacentHTML("beforeend",'<div class="message-empty">Nenhuma pessoa encontrada.</div>');
}
async function selectPerson(p){if(!p)return false;if((await myAge())<18||age(p.birth_date)<18){setMsg("Mensagens privadas exigem usuários adultos.");return false}if(!(await isMutual(p.id))){setMsg("Vocês precisam seguir um ao outro para trocar mensagens.");return false}current=p;document.getElementById("messageTitle").textContent="💬 "+(p.display_name||"Usuário");document.getElementById("messagePeople").hidden=true;document.getElementById("messageThread").hidden=false;await refresh();document.getElementById("messageInput")?.focus();return true}
async function refresh(){
 if(!me||!current)return;
 const pairs=[me,current.id];
 const snap=await getDocs(query(collection(db,"direct_messages"),where("conversation_id","==",[...pairs].sort().join("_")),orderBy("created_at","asc"),limit(100))).catch(()=>null);
 const rows=snap?snap.docs.map(d=>({id:d.id,...d.data()})):[];
 const thread=document.getElementById("messageThread");if(thread)thread.innerHTML=rows.map(x=>`<div class="message-bubble ${x.sender_id===me?"mine":"theirs"}">${esc(x.body)}<small>${x.created_at?.toDate?x.created_at.toDate().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}):""}</small></div>`).join("")||'<div class="message-empty">Ainda não há mensagens. Comece a conversa. 👋</div>';
 thread?.scrollTo({top:thread.scrollHeight,behavior:"smooth"});
}
async function send(){
 const input=document.getElementById("messageInput"),body=input?.value.trim();if(!body||!current)return;
 if((await myAge())<18||age(current.birth_date)<18){setMsg("Mensagens privadas são liberadas somente entre adultos.");return}
 if(!(await isMutual(current.id))){setMsg("Vocês precisam seguir um ao outro para trocar mensagens.");return}
 const conv=[me,current.id].sort().join("_");input.value="";setMsg("Enviando...");
 try{await addDoc(collection(db,"direct_messages"),{conversation_id:conv,sender_id:me,receiver_id:current.id,body,created_at:serverTimestamp(),read_at:null});setMsg("Enviada ✓",true);await refresh()}catch(e){input.value=body;setMsg("Não foi possível enviar agora.")}
}
function ensureUI(){const btn=document.getElementById("messagesBtn");if(btn&&!document.getElementById("messageBadge")){const b=document.createElement("span");b.id="messageBadge";b.className="message-badge";b.hidden=true;btn.appendChild(b)}}
function bind(){document.getElementById("messagesBtn")?.addEventListener("click",open);document.getElementById("messagesClose")?.addEventListener("click",close);document.getElementById("messageSend")?.addEventListener("click",send);document.getElementById("messageInput")?.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send()}})}
async function open(){modal().hidden=false;document.getElementById("messagePeople").hidden=false;document.getElementById("messageThread").hidden=true;document.getElementById("messageTitle").textContent="💬 Mensagens";current=null;await loadPeople()}
function close(){modal().hidden=true}
auth.onAuthStateChanged?.(u=>{me=u?.uid||null;if(me){ensureUI();bind()}});
