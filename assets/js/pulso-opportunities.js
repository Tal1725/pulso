import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>v==null?'Valor definido na campanha':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v));
const typeLabel={challenge:'Desafio',campaign:'Campanha',gig:'Oportunidade',idea:'Ideia',community:'Comunidade'};
async function openOpportunities(){
 const modal=document.getElementById('opportunitiesModal'),body=document.getElementById('opportunitiesBody'),title=document.getElementById('opportunitiesTitle');
 if(!modal||!body)return;
 modal.hidden=false;title.textContent='💰 Oportunidades';body.innerHTML='<div class="opportunity-loading">Carregando oportunidades...</div>';
 const{data:session}=await sb.auth.getSession(),uid=session.session?.user?.id||null;
 const{data:ops,error}=await sb.from('pulso_opportunities').select('id,title,description,opportunity_type,reward_total,currency,starts_at,ends_at,max_participants,eligibility_text,sponsor_name').order('created_at',{ascending:false});
 if(error){body.innerHTML='<div class="opportunity-empty"><strong>Não foi possível carregar agora.</strong><span>Tente novamente em alguns segundos.</span></div>';return}
 let entries=[];
 if(uid&&ops?.length){const r=await sb.from('pulso_opportunity_entries').select('opportunity_id,status').eq('user_id',uid).in('opportunity_id',ops.map(x=>x.id));entries=r.data||[]}
 const joined=new Map(entries.map(x=>[x.opportunity_id,x.status]));
 body.innerHTML=`<div class="opportunity-hero"><strong>Crie. Participe. Encontre oportunidades.</strong><span>O PULSO está preparando um espaço para campanhas, desafios e trabalhos criativos. Valores só aparecem quando uma oportunidade real estiver definida.</span></div>${(ops||[]).map(o=>`<article class="opportunity-card"><div class="opportunity-top"><span class="opportunity-type">${typeLabel[o.opportunity_type]||'Oportunidade'}</span>${o.sponsor_name?`<span class="opportunity-sponsor">por ${esc(o.sponsor_name)}</span>`:''}</div><h3>${esc(o.title)}</h3><p>${esc(o.description||'')}</p><div class="opportunity-reward">💰 ${esc(money(o.reward_total))}</div>${o.eligibility_text?`<div class="opportunity-eligibility">Quem pode participar: ${esc(o.eligibility_text)}</div>`:''}<button class="pill primary opportunity-join" data-opportunity="${o.id}" ${!uid||joined.has(o.id)?'disabled':''}>${!uid?'Entre para participar':joined.has(o.id)?'✓ Você já está participando':'Quero participar'}</button><div class="opportunity-entry-msg" id="opmsg-${o.id}">${joined.has(o.id)?'Participação registrada.':' '}</div></article>`).join('')||'<div class="opportunity-empty"><strong>Nenhuma oportunidade ativa ainda.</strong><span>Em breve este espaço receberá campanhas e desafios reais.</span></div>'}`;
 body.querySelectorAll('[data-opportunity]').forEach(b=>b.onclick=()=>joinOpportunity(b.dataset.opportunity,b,uid));
}
async function joinOpportunity(id,button,uid){
 if(!uid){document.getElementById('loginBtn')?.click();return}
 const msg=document.getElementById('opmsg-'+id);button.disabled=true;button.textContent='Entrando...';msg.textContent='';
 const{error}=await sb.from('pulso_opportunity_entries').insert({opportunity_id:id,user_id:uid});
 if(error){
   if(error.code==='23505'){button.textContent='✓ Você já está participando';msg.textContent='Participação já registrada.'}
   else{button.disabled=false;button.textContent='Quero participar';msg.textContent='Não foi possível registrar agora.'}
   return;
 }
 button.textContent='✓ Participando';msg.textContent='Sua participação foi registrada no PULSO.';
}
function close(){document.getElementById('opportunitiesModal').hidden=true}
function boot(){
 const b=document.getElementById('opportunitiesBtn');if(b)b.onclick=openOpportunities;
 document.getElementById('opportunitiesClose')?.addEventListener('click',close);
 document.getElementById('opportunitiesModal')?.addEventListener('click',e=>{if(e.target.id==='opportunitiesModal')close()});
 window.pulsoOpenOpportunities=openOpportunities;
}
boot();
async function openWallet(){
 const modal=document.getElementById('opportunitiesModal'),body=document.getElementById('opportunitiesBody'),title=document.getElementById('opportunitiesTitle');
 if(!modal||!body)return;
 modal.hidden=false;title.textContent='💰 Minha carteira';
 const{data:s}=await sb.auth.getSession(),uid=s.session?.user?.id;
 if(!uid){body.innerHTML='<div class="opportunity-empty"><strong>Entre no PULSO para acessar sua carteira.</strong></div>';return}
 const{data:rows,error}=await sb.from('pulso_wallet_ledger').select('amount,currency,status,description,created_at').eq('user_id',uid).order('created_at',{ascending:false}).limit(50);
 if(error){body.innerHTML='<div class="opportunity-empty"><strong>Não foi possível carregar sua carteira.</strong></div>';return}
 const available=(rows||[]).filter(x=>x.status==='available').reduce((a,x)=>a+Number(x.amount),0),pending=(rows||[]).filter(x=>x.status==='pending').reduce((a,x)=>a+Number(x.amount),0);
 const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
 body.innerHTML='<div class="wallet-hero"><span>Saldo disponível</span><strong>'+fmt(available)+'</strong><small>Pendente: '+fmt(pending)+'</small></div><div class="opportunity-hero"><strong>Como funciona</strong><span>Ganhos só entram aqui quando uma oportunidade, campanha ou outra fonte de receita gerar um lançamento confirmado. Nenhum saldo fictício é criado.</span></div>'+((rows||[]).map(x=>'<div class="wallet-row"><strong>'+esc(x.description||x.status)+'</strong><span>'+new Intl.NumberFormat('pt-BR',{style:'currency',currency:x.currency||'BRL'}).format(Number(x.amount))+'</span></div>').join('')||'<div class="opportunity-empty"><strong>Ainda não há lançamentos.</strong><span>Participe das oportunidades para começar sua trajetória.</span></div>');
}
window.pulsoOpenWallet=openWallet;