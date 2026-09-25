import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const db=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true}});
(async()=>{
  if(localStorage.getItem('pulso-first-60s-v1'))return;
  const s=await db.auth.getSession(),uid=s.data.session?.user?.id;if(!uid)return;
  const q=await db.from('pulso_interests').select('id,name').order('name');
  if(q.error||!q.data?.length)return;
  const style=document.createElement('style');style.textContent=`
  #pulsoFirst60{position:fixed;inset:0;z-index:100002;background:rgba(3,3,7,.84);backdrop-filter:blur(18px);display:grid;place-items:center;padding:16px}
  #pulsoFirst60 .p60{width:min(650px,100%);background:#101017;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:24px;box-shadow:0 30px 100px rgba(0,0,0,.55)}
  #pulsoFirst60 h2{margin:4px 0 8px;font-size:clamp(27px,6vw,42px)} #pulsoFirst60 p{color:#aeb2c2;line-height:1.5}
  #pulsoFirst60 .p60grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:18px 0}
  #pulsoFirst60 button.tag{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.045);color:#fff;border-radius:13px;padding:12px 9px;font-weight:800}
  #pulsoFirst60 button.tag.on{background:rgba(255,61,126,.16);border-color:#ff3d7e}
  #pulsoFirst60 button.go{border:0;background:linear-gradient(135deg,#ff3d7e,#9d4edd);color:#fff;border-radius:13px;padding:13px 17px;font-weight:900;width:100%}
  #pulsoFirst60 .hint{font-size:12px;color:#858a9d;margin-top:10px;text-align:center}
  @media(max-width:620px){#pulsoFirst60 .p60grid{grid-template-columns:repeat(2,1fr)}#pulsoFirst60 .p60{padding:20px}}
  `;document.head.appendChild(style);
  const el=document.createElement('div');el.id='pulsoFirst60';
  el.innerHTML='<div class="p60"><div style="color:#ff4b86;font-size:12px;font-weight:900;letter-spacing:.12em">SEU PRIMEIRO PULSO</div><h2>Mostre o que você gosta.</h2><p>Escolha alguns assuntos. O PULSO usa essa escolha para organizar sua descoberta e aproximar você de pessoas com interesses parecidos.</p><div class="p60grid"></div><button class="go" disabled>Continuar para o PULSO</button><div class="hint">Você pode mudar isso depois em <b>Meu DNA</b>.</div></div>';
  document.body.appendChild(el);
  const grid=el.querySelector('.p60grid'),go=el.querySelector('.go');
  q.data.forEach(x=>{const b=document.createElement('button');b.className='tag';b.type='button';b.textContent=x.name;b.dataset.id=x.id;b.onclick=()=>{b.classList.toggle('on');go.disabled=!grid.querySelector('.on')});
    grid.appendChild(b);
  });
  go.onclick=async()=>{
    go.disabled=true;go.textContent='Preparando seu PULSO...';
    const ids=[...grid.querySelectorAll('.on')].map(x=>x.dataset.id);
    const del=await db.from('pulso_user_interests').delete().eq('user_id',uid);
    if(!del.error&&ids.length)await db.from('pulso_user_interests').insert(ids.map(interest_id=>({user_id:uid,interest_id})));
    localStorage.setItem('pulso-first-60s-v1','1');el.remove();
    document.dispatchEvent(new CustomEvent('pulso-interests-ready'));
  };
})();