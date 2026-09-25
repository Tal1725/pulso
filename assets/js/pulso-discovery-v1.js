/* PULSO DISCOVERY V1 — descoberta simples, sem IA e sem dados falsos */
(function(){
  if(window.__pulsoDiscoveryV1)return; window.__pulsoDiscoveryV1=true;
  const interests=['Humor','Música','Futebol','Negócios','Tecnologia','Carros','Fitness','Games','Culinária','Notícias','Arte','Viagem','Moda','Educação','Criatividade'];
  const css=()=>{if(document.getElementById('pulso-discovery-css'))return;const s=document.createElement('style');s.id='pulso-discovery-css';s.textContent='.pulso-discovery{margin:0 0 12px;padding:14px 16px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:linear-gradient(135deg,rgba(255,255,255,.045),rgba(255,75,134,.055));}.pulso-discovery-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.pulso-discovery-title{font-weight:900;font-size:18px}.pulso-discovery-sub{color:#9da1b1;font-size:12px;margin-top:3px}.pulso-discovery-chips{display:flex;gap:7px;overflow:auto;padding-top:11px;scrollbar-width:none}.pulso-discovery-chip{white-space:nowrap;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#ddd;padding:7px 10px;border-radius:999px;font-size:12px}.pulso-discovery-chip.active{border-color:rgba(255,75,134,.65);color:#fff;background:rgba(255,75,134,.12)}';document.head.appendChild(s)};
  async function run(){
    const feed=document.getElementById('feed'); if(!feed||feed.dataset.discoveryReady)return;
    css(); const sb=window.supabase; if(!sb)return;
    const {data:s}=await sb.auth.getSession(); const uid=s.session?.user?.id; if(!uid)return;
    const {data:rows}=await sb.from('pulso_user_interests').select('interest_id').eq('user_id',uid);
    const ids=(rows||[]).map(x=>x.interest_id);
    const {data:all}=await sb.from('pulso_interests').select('id,name').in('id',ids.length?ids:[-1]);
    const names=(all||[]).map(x=>x.name).filter(Boolean);
    const box=document.createElement('section');box.className='pulso-discovery';
    box.innerHTML='<div class="pulso-discovery-top"><div><div class="pulso-discovery-title">Descubra seu PULSO</div><div class="pulso-discovery-sub">Escolha um assunto e encontre conteúdo da comunidade.</div></div></div><div class="pulso-discovery-chips">'+(names.length?names:interests.slice(0,8)).map(n=>'<button class="pulso-discovery-chip '+(names.includes(n)?'active':'')+'" type="button" data-interest="'+n.replace(/"/g,'&quot;')+'">'+n+'</button>').join('')+'</div>';
    feed.parentNode.insertBefore(box,feed); feed.dataset.discoveryReady='1';
    box.querySelectorAll('[data-interest]').forEach(b=>b.onclick=()=>{box.querySelectorAll('.active').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.dispatchEvent(new CustomEvent('pulso-discovery-interest',{detail:{interest:b.dataset.interest}}));});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,1200),{once:true});else setTimeout(run,1200);
  new MutationObserver(()=>{if(!document.querySelector('.pulso-discovery'))run()}).observe(document.body,{childList:true,subtree:true});
})();