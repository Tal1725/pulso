import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{collection,getDocs,addDoc,doc,getDoc,setDoc,deleteDoc,query,orderBy}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const all=async n=>{const s=await getDocs(collection(firebaseDb,n));return s.docs.map(d=>({id:d.id,...(d.data()||{})}))};
let modal;

function ensureModal(){
 if(document.getElementById('hivesModal'))return document.getElementById('hivesModal');
 const d=document.createElement('div');
 d.id='hivesModal';d.className='modal';d.hidden=true;
 d.innerHTML='<div class="modal-card" style="max-width:720px"><div class="modal-head"><div><h2>🐝 Minhas Colmeias</h2><span class="modal-subtitle">Comunidades para transformar conexões em colaboração.</span></div><button id="hivesClose" class="modal-close">×</button></div><div id="hivesBody" class="modal-body"></div></div>';
 document.body.appendChild(d);
 d.addEventListener('click',e=>{if(e.target===d)d.hidden=true});
 d.querySelector('#hivesClose').onclick=()=>d.hidden=true;
 return d;
}
function card(h,uid){
 const members=Array.isArray(h.members)?h.members:[];
 const mine=members.includes(uid);
 return '<article style="border:1px solid rgba(255,255,255,.12);border-radius:16px;padding:16px;margin:10px 0;background:rgba(255,255,255,.04)">'+
 '<div style="display:flex;justify-content:space-between;gap:12px;align-items:center"><div><h3 style="margin:0 0 5px">'+esc(h.name||'Colmeia sem nome')+'</h3><p style="margin:0;opacity:.75">'+esc(h.description||'')+'</p></div>'+
 '<button class="pill '+(mine?'':'primary')+'" data-hive="'+h.id+'" data-action="'+(mine?'leave':'join')+'">'+(mine?'Sair':'Entrar')+'</button></div>'+
 '<small style="display:block;margin-top:10px;opacity:.65">🐝 '+members.length+' participante(s)'+(h.creator_name?' · criada por '+esc(h.creator_name):'')+'</small></article>';
}
async function render(){
 modal=ensureModal();const body=modal.querySelector('#hivesBody');const u=firebaseAuth.currentUser;
 if(!u){body.innerHTML='<p>Faça login para usar as Colmeias.</p>';return}
 body.innerHTML='<p>Carregando Colmeias...</p>';
 try{
  const hs=await all('hives');
  const mine=hs.filter(h=>(Array.isArray(h.members)&&h.members.includes(u.uid))||h.creator_id===u.uid);
  body.innerHTML='<h3 style="margin:0 0 12px">Encontre sua Colmeia</h3><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:18px"><button class="pill primary hive-category" data-category="Música" type="button">🎵 Música</button><button class="pill primary hive-category" data-category="Esporte" type="button">⚽ Esporte</button><button class="pill primary hive-category" data-category="Criatividade" type="button">🎨 Criatividade</button><button class="pill primary hive-category" data-category="Humor" type="button">😂 Humor</button><button class="pill primary hive-category" data-category="Tecnologia" type="button">💡 Tecnologia</button><button class="pill primary hive-category" data-category="Lifestyle" type="button">✨ Lifestyle</button><button id="newHive" class="pill" type="button">🐝 Criar Colmeia</button><button id="exploreHive" class="pill" type="button">🔎 Explorar</button><button id="mineHive" class="pill" type="button">⭐ Minhas</button></div>'+
   (mine.length?'<h3>Minhas Colmeias</h3>'+mine.map(h=>card(h,u.uid)).join(''):'<div style="padding:12px 0"><strong>Você ainda não participa de nenhuma Colmeia.</strong><p>Crie a sua ou entre em uma abaixo.</p></div>')+
   '<h3 style="margin-top:20px">Explorar Colmeias</h3>'+
   (hs.length?hs.map(h=>card(h,u.uid)).join(''):'<p>Nenhuma Colmeia criada ainda. Seja o primeiro.</p>');
  body.querySelector('#newHive').onclick=create;body.querySelectorAll('.hive-category').forEach(b=>b.onclick=()=>{const q=encodeURIComponent(b.dataset.category);const target=[...body.querySelectorAll('article')].filter(x=>x.textContent.toLowerCase().includes(b.dataset.category.toLowerCase()));target.forEach(x=>x.style.display='');body.querySelectorAll('article').forEach(x=>{if(!x.textContent.toLowerCase().includes(b.dataset.category.toLowerCase()))x.style.display='none'});});body.querySelector('#exploreHive').onclick=()=>body.querySelector('h3[style]')?.scrollIntoView({behavior:'smooth'});body.querySelector('#mineHive').onclick=()=>body.querySelector('h3:not([style])')?.scrollIntoView({behavior:'smooth'});
  body.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>toggle(b.dataset.hive,b.dataset.action));
 }catch(e){console.error(e);body.innerHTML='<p>Não foi possível carregar as Colmeias.</p>'}
}
async function create(){
 const u=firebaseAuth.currentUser;if(!u)return;
 const name=prompt('Nome da Colmeia:');if(!name?.trim())return;
 const description=prompt('Descrição da Colmeia:')||'';
 const ref=await addDoc(collection(firebaseDb,'hives'),{name:name.trim(),description:description.trim(),creator_id:u.uid,creator_name:u.displayName||u.email||'Membro PULSO',members:[u.uid],created_at:new Date().toISOString()});
 await render();
}
async function toggle(id,action){
 const u=firebaseAuth.currentUser;if(!u)return;
 const ref=doc(firebaseDb,'hives',id);const s=await getDoc(ref);if(!s.exists())return;
 const h=s.data()||{};let m=Array.isArray(h.members)?h.members:[];
 m=action==='join'?[...new Set([...m,u.uid])]:m.filter(x=>x!==u.uid);
 await setDoc(ref,{...h,members:m},{merge:true});await render();
}
function boot(){
 const b=document.getElementById('myHivesBtn');if(b)b.addEventListener('click',()=>{const m=ensureModal();m.hidden=false;render()});
 window.pulsoOpenHives=()=>{const m=ensureModal();m.hidden=false;render()};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
