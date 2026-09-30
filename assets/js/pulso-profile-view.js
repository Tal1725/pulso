import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true}});
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
async function openProfile(targetId=null){
 const {data:{user}}=await sb.auth.getUser();
 if(!user){location.href='entrar.html?next=app';return}
 const id=targetId||user.id;
 let m=document.getElementById('pulsoProfileView');
 if(!m){
  m=document.createElement('div');m.id='pulsoProfileView';
  m.style.cssText='position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.82);overflow:auto;padding:18px;box-sizing:border-box';
  m.innerHTML='<div id="ppCard" style="max-width:720px;margin:20px auto;background:#17171b;color:#fff;border-radius:20px;padding:20px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><h2 id="ppTitle" style="margin:0">Perfil</h2><button id="ppClose" type="button" style="background:#303038;color:#fff;border:0;border-radius:10px;padding:10px 14px">Fechar</button></div><div id="ppBody" style="margin-top:18px">Carregando...</div></div>';
  document.body.appendChild(m);m.querySelector('#ppClose').onclick=()=>m.remove();
 }
 const body=m.querySelector('#ppBody');body.textContent='Carregando perfil...';
 try{
  const [pr,po]=await Promise.all([
   sb.from('profiles').select('id,display_name,username,bio,avatar_url,status').eq('id',id).maybeSingle(),
   sb.from('posts').select('id,video_url,media_url,media_type,caption,created_at').eq('user_id',id).order('created_at',{ascending:false}).limit(50)
  ]);
  if(pr.error)throw pr.error;if(po.error)throw po.error;
  const p=pr.data||{};const posts=po.data||[];
  m.querySelector('#ppTitle').textContent=id===user.id?'Meu perfil':'Perfil do usuário';
  const avatar=p.avatar_url?'<img src="'+esc(p.avatar_url)+'" style="width:86px;height:86px;border-radius:50%;object-fit:cover">':'<div style="width:86px;height:86px;border-radius:50%;display:grid;place-items:center;background:#303038;font-size:34px;font-weight:900">'+esc((p.display_name||'P')[0].toUpperCase())+'</div>';
  const media=x=>{const s=esc(x.media_url||x.video_url||'');if(x.media_type==='image')return '<img src="'+s+'" style="width:100%;max-height:420px;object-fit:contain;border-radius:14px;background:#090a0c">';if(x.media_type==='audio')return '<audio src="'+s+'" controls style="width:100%"></audio>';return '<video src="'+s+'" controls playsinline style="width:100%;max-height:420px;border-radius:14px;background:#090a0c"></video>'};
  body.innerHTML='<div style="display:flex;gap:16px;align-items:center">'+avatar+'<div><h3 style="margin:0 0 4px">'+esc(p.display_name||'Usuário')+'</h3><div style="opacity:.7">'+(p.username?'@'+esc(p.username):'membro PULSO')+'</div><div style="margin-top:8px">'+esc(p.bio||p.status||'')+'</div></div></div><hr style="border-color:rgba(255,255,255,.1);margin:20px 0"><h3>Publicações ('+posts.length+')</h3>'+ (posts.length?posts.map(x=>'<article style="padding:14px 0;border-top:1px solid rgba(255,255,255,.1)">'+media(x)+'<div style="margin-top:8px">'+esc(x.caption||'')+'</div></article>').join(''):'<div style="opacity:.7;padding:20px 0">Nenhuma publicação encontrada.</div>');
 }catch(e){body.innerHTML='<div style="color:#ff8a8a">Não foi possível carregar este perfil: '+esc(e.message||e)+'</div>'}
}
window.pulsoOpenProfile=openProfile;