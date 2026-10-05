import{firebaseAuth,firebaseDb}from'./firebase-config.js';import{collection,getDocs,addDoc,updateDoc,doc,getDoc,query,where,limit}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let me=null,current=null,people=[];
async function all(n){return(await getDocs(collection(firebaseDb,n))).docs.map(d=>({id:d.id,...d.data()}))}
async function profile(id){
  const direct=await getDoc(doc(firebaseDb,'Perfis',id));
  if(direct.exists()){const d=direct.data();return{id,...d,__uid:d.user_id||d.uid||id};}
  const s=await getDocs(query(collection(firebaseDb,'Perfis'),where('user_id','==',id),limit(1)));
  return s.empty?{}:{id:s.docs[0].id,...s.docs[0].data(),__uid:s.docs[0].data().user_id||s.docs[0].data().uid||id};
}
function age(v){if(!v)return null;const d=new Date(v+'T00:00:00'),n=new Date();let a=n.getFullYear()-d.getFullYear(),m=n.getMonth()-d.getMonth();if(m<0||(m===0&&n.getDate()<d.getDate()))a--;return a}
async function mutual(id){
  const [a,b]=await Promise.all([
    getDocs(query(collection(firebaseDb,'follows'),where('follower_id','==',me),where('following_id','==',id),limit(1))),
    getDocs(query(collection(firebaseDb,'follows'),where('follower_id','==',id),where('following_id','==',me),limit(1)))
  ]);
  return !a.empty&&!b.empty;
}
function modal(){return $('#messagesModal')}function status(t){const x=$('#messageStatus');if(x)x.textContent=t}
async function refresh(){if(!me||!current)return;const [a,b]=await Promise.all([
    getDocs(query(collection(firebaseDb,'direct_messages'),where('sender_id','==',me),where('receiver_id','==',current.__uid||current.user_id||current.uid||current.id),limit(100))),
    getDocs(query(collection(firebaseDb,'direct_messages'),where('sender_id','==',current.__uid||current.user_id||current.uid||current.id),where('receiver_id','==',me),limit(100)))
  ]);
  const r=[...a.docs,...b.docs].map(d=>({id:d.id,...d.data()})).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at)),box=$('#messageThread');if(!box)return;box.innerHTML=r.map(x=>'<div class="message-bubble '+(x.sender_id===me?'mine':'theirs')+'">'+esc(x.body)+'<small>'+new Date(x.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+'</small></div>').join('')||'<div class="message-empty">Ainda não há mensagens. Comece a conversa. 👋</div>';box.scrollTop=box.scrollHeight;for(const x of r.filter(x=>x.receiver_id===me&&!x.read_at))await updateDoc(doc(firebaseDb,'direct_messages',x.id),{read_at:new Date().toISOString()})}
async function loadPeople(){const p=await profile(me);if(age(p.birth_date)<18){$('#messagePeople').innerHTML='<div class="message-empty">Mensagens privadas são liberadas somente para adultos.</div>';return}const f=(await getDocs(query(collection(firebaseDb,'follows'),where('follower_id','==',me),limit(500)))).docs.map(d=>({id:d.id,...d.data()}));
const ids=[];
for(const x of f)if(x.following_id&&!ids.includes(x.following_id)&&await mutual(x.following_id))ids.push(x.following_id);
const ps=await Promise.all(ids.map(profile));people=ps.filter(x=>x.id&&(!x.birth_date||age(x.birth_date)>=18));renderPeople('')}
function renderPeople(q){const box=$('#messagePeople');if(!box)return;const n=q.toLowerCase(),m=people.filter(p=>!n||String(p.display_name||'').toLowerCase().includes(n)||String(p.username||'').toLowerCase().includes(n));box.innerHTML='<div class="message-search"><span>🔎</span><input id="messageContactSearch" type="search" placeholder="Procure alguém..." value="'+esc(q)+'"></div>'+(n?m.map(p=>'<button class="message-person" data-person="'+p.id+'" type="button"><span class="message-avatar">'+esc((p.display_name||'?')[0].toUpperCase())+'</span><span><b>'+esc(p.display_name||'Usuário')+'</b><small>@'+esc(p.username||'membro')+'</small></span></button>').join(''):'<div class="message-empty">Digite o nome para encontrar alguém.</div>');$('#messageContactSearch')?.addEventListener('input',e=>renderPeople(e.target.value));box.querySelectorAll('[data-person]').forEach(b=>b.onclick=()=>select(people.find(p=>p.id===b.dataset.person)))}
async function select(p){if(!p||age(p.birth_date)<18||!(await mutual(p.__uid||p.user_id||p.uid||p.id))){status('Vocês precisam ser adultos e seguir um ao outro.');return}current=p;$('#messageTitle').textContent='💬 '+(p.display_name||'Usuário');$('#messagePeople').hidden=true;$('#messageThread').hidden=false;await refresh()}
async function send(){const i=$('#messageInput'),body=i?.value.trim();if(!body||!current)return;if(!(await mutual(current.__uid||current.user_id||current.uid||current.id))){status('Vocês precisam se seguir mutuamente.');return}try{await addDoc(collection(firebaseDb,'direct_messages'),{sender_id:me,receiver_id:current.__uid||current.user_id||current.uid||current.id,body,created_at:new Date().toISOString(),read_at:null});i.value='';status('Enviada ✓');await refresh()}catch(e){status('Não foi possível enviar: '+e.message)}}
async function open(){me=firebaseAuth.currentUser?.uid;if(!me)return;modal().hidden=false;$('#messagePeople').hidden=false;$('#messageThread').hidden=true;current=null;await loadPeople()}
function close(){modal().hidden=true}
window.openConversation=async id=>{const p=await profile(id);modal().hidden=false;await select(p)}
window.addEventListener('load',()=>{$('#messagesBtn')?.addEventListener('click',open);$('#messagesClose')?.addEventListener('click',close);$('#messageSend')?.addEventListener('click',send);$('#messageInput')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}})});