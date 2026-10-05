import{firebaseAuth,firebaseDb}from'./firebase-config.js';
import{collection,getDocs,doc,getDoc,query,where,limit}from'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const timeValue=v=>v?.toMillis?v.toMillis():(typeof v==='number'?v:(Date.parse(v)||0));
function activateLazyMedia(root=document){
  const videos=root.querySelectorAll('video[data-src]');if(!videos.length)return;
  const load=v=>{const src=v.dataset.src;if(!src||v.src)return;v.src=src;v.removeAttribute('data-src');try{v.load()}catch(e){}};
  if(!('IntersectionObserver'in window)){videos.forEach(load);return;}
  const io=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){load(entry.target);io.unobserve(entry.target);}}),{rootMargin:'500px 0px'});
  videos.forEach(v=>io.observe(v));
}

async function openProfile(targetId=null){
  const user=firebaseAuth.currentUser;
  if(!user){location.href='entrar.html?next=app';return;}
  const id=targetId||user.uid;
  let m=document.getElementById('pulsoProfileView');
  if(m&&!m.querySelector('#ppBody')){m.remove();m=null;}
  if(!m){
    m=document.createElement('div');m.id='pulsoProfileView';
    m.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(10,12,20,.78);backdrop-filter:blur(12px);overflow:auto;padding:18px;box-sizing:border-box';
    m.innerHTML='<div id="ppCard" style="max-width:760px;margin:20px auto;background:#171923;color:#fff;border:1px solid rgba(255,255,255,.1);border-radius:22px;padding:20px;box-sizing:border-box;box-shadow:0 25px 80px rgba(0,0,0,.45)"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 id="ppTitle" style="margin:0">Perfil</h2><div style="display:flex;gap:8px"><button id="ppEdit" type="button" style="display:none;background:#7457e8;color:#fff;border:0;border-radius:10px;padding:10px 14px">✏️ Editar</button><button id="ppClose" type="button" style="background:#ff4b86;color:#fff;border:0;border-radius:10px;padding:10px 14px">Fechar</button></div></div><div id="ppBody" style="margin-top:18px">Carregando...</div></div>';
    document.body.appendChild(m);m.querySelector('#ppClose').onclick=e=>{e.preventDefault();e.stopPropagation();m.remove()};m.addEventListener('click',e=>{if(e.target===m){e.preventDefault();e.stopPropagation();m.remove()}},{capture:true});m.querySelector('#ppEdit').onclick=e=>{e.preventDefault();e.stopPropagation();m.remove();window.pulsoOpenEditorFallback?.()};
  }
  const body=m.querySelector('#ppBody');body.innerHTML='<div style="padding:20px 0">Carregando perfil e publicações...</div>';
  try{
    const pr=await getDoc(doc(firebaseDb,'Perfis',id));
    let p=pr.exists()?pr.data():null;
    if(!p){
      const lookups=[['user_id',id],['uid',id],['auth_uid',id]];
      for(const [field,value] of lookups){const s=await getDocs(query(collection(firebaseDb,'Perfis'),where(field,'==',value),limit(1)));if(!s.empty){p=s.docs[0].data();break;}}
    }
    const q=await getDocs(query(collection(firebaseDb,'Posts'),where('user_id','==',id),limit(100)));
    let posts=q.docs.map(d=>({id:d.id,...(d.data()||{})}));
    if(!posts.length){
      const legacy=await getDocs(query(collection(firebaseDb,'Posts'),where('legacy_user_id','==',id),limit(100)));
      posts=legacy.docs.map(d=>({id:d.id,...(d.data()||{})}));
    }
    posts.sort((a,b)=>timeValue(b.created_at)-timeValue(a.created_at));
    m.querySelector('#ppTitle').textContent=id===user.uid?'Meu perfil':'Perfil do usuário';const editBtn=m.querySelector('#ppEdit');if(editBtn)editBtn.style.display=id===user.uid?'inline-block':'none';
    const avatar=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" alt="Foto de perfil" style="width:86px;height:86px;border-radius:50%;object-fit:cover">':'<div style="width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ee3f91,#7457e8);color:#fff;font-size:34px;font-weight:900">'+esc((p.display_name||p['Nome de usuário']||p['Nome']||'P')[0].toUpperCase())+'</div>';
    const media=x=>{const s=esc(x.media_url||x.video_url||'');if(!s)return '<div style="padding:28px;border-radius:14px;background:#222532;color:#aeb2c2">Mídia indisponível</div>';if(x.media_type==='image')return '<img src="'+s+'" alt="Publicação" loading="lazy" style="display:block;width:100%;max-height:460px;object-fit:contain;border-radius:14px;background:#0b0c10">';if(x.media_type==='audio')return '<audio src="'+s+'" controls preload="none" style="width:100%"></audio>';return '<video data-src="'+s+'" controls playsinline preload="none" style="display:block;width:100%;max-height:460px;border-radius:14px;background:#090a0c"></video>';};
    const pub=posts.length?posts.map(x=>'<article style="padding:16px 0;border-top:1px solid rgba(255,255,255,.08)">'+media(x)+'<div style="margin-top:9px;line-height:1.45">'+esc(x.caption||x.legenda||'')+'</div><div style="margin-top:6px;font-size:12px;color:#9aa0b2">'+(timeValue(x.created_at)?new Date(timeValue(x.created_at)).toLocaleString('pt-BR'):'')+'</div></article>').join(''):'<div style="padding:22px 0;color:#aeb2c2">Nenhuma publicação encontrada para este perfil.</div>';
    body.innerHTML='<div style="display:flex;gap:16px;align-items:center">'+avatar+'<div><h3 style="margin:0 0 4px">'+esc(p.display_name||p['Nome de usuário']||p['Nome']||'Usuário')+'</h3><div style="opacity:.7">'+(p.username?'@'+esc(p.username):'membro PULSO')+'</div><div style="margin-top:8px">'+esc(p.bio||p.status||'')+'</div></div></div><div style="margin-top:20px;padding:12px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(238,63,145,.22),rgba(116,87,232,.22));border:1px solid rgba(255,255,255,.08);font-weight:800">Publicações: '+posts.length+'</div><div style="margin-top:8px">'+pub+'</div>';
    activateLazyMedia(body);
  }catch(e){body.innerHTML='<div style="color:#ff8a8a;padding:18px 0">Não foi possível carregar o perfil: '+esc(e.message||e)+'</div>';console.error('[PULSO] perfil',e);}
}
window.pulsoOpenProfileReal=openProfile;
window.__pulsoOpenProfileReal=openProfile;
window.__pulsoProfileModuleLoaded=true;
