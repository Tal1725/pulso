import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const db=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true}});
let me=null, interests=[], interestMap=new Map();

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const words={
  Humor:['humor','comedia','comédia','piada','meme','risada','engraçado','engracado'],
  Música:['musica','música','sertanejo','funk','rock','rap','cantor','violao','violão','canção','cancao'],
  Futebol:['futebol','gol','campeonato','torcida','time','brasileirao','brasileirão'],
  Negócios:['negocio','negócio','empresa','vendas','venda','empreendedor','empreender','marketing'],
  Tecnologia:['tecnologia','app','aplicativo','celular','software','computador','internet'],
  Carros:['carro','carros','moto','motos','motor','oficina','automovel','automóvel'],
  Fitness:['fitness','academia','treino','corrida','musculacao','musculação','saude','saúde'],
  Games:['game','games','gamer','playstation','xbox','nintendo'],
  Culinária:['comida','culinaria','culinária','receita','cozinha','bolo','churrasco'],
  Notícias:['noticia','notícia','noticias','notícias','urgente','informacao','informação'],
  Arte:['arte','desenho','pintura','fotografia','artista','design'],
  Viagem:['viagem','viajar','turismo','praia','hotel'],
  Moda:['moda','roupa','look','beleza','estilo'],
  Educação:['educacao','educação','estudo','escola','curso','aprender'],
  Criatividade:['criatividade','criativo','criativa','criar','criacao','criação']
};

function css(){
 if(document.getElementById('pulso-sync-style'))return;
 const s=document.createElement('style');s.id='pulso-sync-style';
 s.textContent=`
 #pulsoSyncBar{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 14px}
 .ps-btn{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.055);color:#fff;border-radius:999px;padding:10px 13px;font-weight:850;cursor:pointer}
 .ps-btn:hover{border-color:rgba(255,61,126,.45);background:rgba(255,61,126,.1)}
 .ps-btn.primary{background:linear-gradient(135deg,#ff3d7e,#9d4edd);border:0}
 .ps-vivo{display:flex;gap:7px;flex-wrap:wrap;margin:9px 0 0;padding:9px 0 0;border-top:1px solid rgba(255,255,255,.07)}
 .ps-vivo button{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#dfe2ee;border-radius:10px;padding:7px 9px;font-size:12px;font-weight:800;cursor:pointer}
 .ps-vivo button.active{border-color:#ff3d7e;background:rgba(255,61,126,.13);color:#fff}
 .ps-vivo-count{font-size:11px;color:#9297aa;padding:7px 3px}
 .ps-modal{position:fixed;inset:0;background:rgba(0,0,0,.76);backdrop-filter:blur(12px);z-index:10001;display:grid;place-items:center;padding:18px}
 .ps-card{width:min(700px,100%);max-height:88vh;overflow:auto;background:#101017;border:1px solid rgba(255,255,255,.12);border-radius:24px;padding:20px;box-shadow:0 30px 90px rgba(0,0,0,.55)}
 .ps-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.ps-head h2{margin:0}.ps-close{border:0;background:none;color:#fff;font-size:28px;cursor:pointer}
 .ps-muted{color:#979bad;font-size:.86rem;line-height:1.45}.ps-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
 .ps-interest{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#fff;border-radius:13px;padding:11px 9px;font-weight:800;cursor:pointer}
 .ps-interest.active{border-color:#ff3d7e;background:rgba(255,61,126,.14)}
 .ps-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
 .ps-person{display:flex;align-items:center;gap:11px;padding:13px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.035)}
 .ps-person-avatar{width:44px;height:44px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#252531;flex:none}
 .ps-person-avatar img{width:100%;height:100%;object-fit:cover}.ps-person-main{min-width:0;flex:1}.ps-person-main strong{display:block}.ps-person-main span{display:block;color:#969bad;font-size:.78rem;margin-top:3px}
 .ps-tag{display:inline-block;margin:3px 3px 0 0;padding:4px 7px;border-radius:999px;background:rgba(255,61,126,.09);color:#ff9bb9;font-size:.7rem}
 .ps-empty{padding:20px;text-align:center;color:#969bad;border-radius:15px;background:rgba(255,255,255,.035)}
 @media(max-width:620px){.ps-grid{grid-template-columns:repeat(2,1fr)}.ps-card{padding:16px}}
 `;document.head.appendChild(s);
}

function modal(inner){
 const old=document.getElementById('psModal');if(old)old.remove();
 const d=document.createElement('div');d.id='psModal';d.className='ps-modal';d.innerHTML='<div class="ps-card">'+inner+'</div>';
 document.body.appendChild(d);
 d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-ps-close]'))d.remove()});
 return d;
}

async function loadBase(){
 const s=await db.auth.getSession();me=s.data.session?.user?.id;if(!me)return false;
 const r=await db.from('pulso_interests').select('id,slug,name').order('name');
 if(r.error)throw r.error;interests=r.data||[];interestMap=new Map(interests.map(x=>[x.name,x]));
 return true;
}

async function myInterests(){
 const r=await db.from('pulso_user_interests').select('interest_id').eq('user_id',me);
 if(r.error)throw r.error;return new Set((r.data||[]).map(x=>x.interest_id));
}

async function openDNA(){
 const selected=await myInterests();
 const d=modal(`
  <div class="ps-head"><div><h2>🧬 Meu DNA PULSO</h2><div class="ps-muted">Você escolhe os assuntos que representam o que gosta. Nada de IA, créditos ou cobrança.</div></div><button class="ps-close" data-ps-close>×</button></div>
  <div class="ps-grid">${interests.map(x=>`<button class="ps-interest ${selected.has(x.id)?'active':''}" data-i="${x.id}">${esc(x.name)}</button>`).join('')}</div>
  <div class="ps-actions"><button class="ps-btn primary" id="psSaveDNA">Salvar meu DNA</button></div>
  <div id="psDnaMsg" class="ps-muted" style="margin-top:10px"></div>`);
 d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{b.classList.toggle('active')});
 d.querySelector('#psSaveDNA').onclick=async()=>{
   const btn=d.querySelector('#psSaveDNA'),msg=d.querySelector('#psDnaMsg');btn.disabled=true;msg.textContent='Salvando...';
   try{
     const ids=[...d.querySelectorAll('.ps-interest.active')].map(x=>x.dataset.i);
     const del=await db.from('pulso_user_interests').delete().eq('user_id',me);if(del.error)throw del.error;
     if(ids.length){const ins=await db.from('pulso_user_interests').insert(ids.map(interest_id=>({user_id:me,interest_id})));if(ins.error)throw ins.error}
     msg.textContent='✓ Seu DNA foi atualizado. Agora o PULSO pode mostrar conexões por interesses reais.';
     setTimeout(()=>d.remove(),700);
   }catch(e){msg.textContent=e.message||'Não foi possível salvar';btn.disabled=false}
 };
}

async function openMatches(){
 const mine=await myInterests();
 if(!mine.size){
   const d=modal('<div class="ps-head"><div><h2>🤝 Encontrar colaboradores</h2><div class="ps-muted">Primeiro escolha seus interesses no <b>Meu DNA</b>. O PULSO usa somente essa escolha, sem IA.</div></div><button class="ps-close" data-ps-close>×</button></div><div class="ps-actions"><button class="ps-btn primary" id="psGoDNA">Escolher interesses</button></div>');
   d.querySelector('#psGoDNA').onclick=()=>{d.remove();openDNA()};return;
 }
 const ui=await db.from('pulso_user_interests').select('user_id,interest_id').in('interest_id',[...mine]);
 if(ui.error)throw ui.error;
 const ids=[...new Set((ui.data||[]).map(x=>x.user_id).filter(id=>id!==me))];
 if(!ids.length){modal('<div class="ps-head"><div><h2>🤝 Encontrar colaboradores</h2><div class="ps-muted">Ainda não encontramos outras pessoas com interesses em comum.</div></div><button class="ps-close" data-ps-close>×</button></div>');return}
 const ps=await db.from('profiles').select('id,display_name,username,avatar_url,bio').in('id',ids);
 if(ps.error)throw ps.error;
 const byUser=new Map();
 (ui.data||[]).forEach(x=>{if(x.user_id!==me){if(!byUser.has(x.user_id))byUser.set(x.user_id,new Set());byUser.get(x.user_id).add(x.interest_id)}});
 const ranked=(ps.data||[]).map(p=>({p,score:byUser.get(p.id)?.size||0})).sort((a,b)=>b.score-a.score);
 const d=modal('<div class="ps-head"><div><h2>🤝 Encontrar colaboradores</h2><div class="ps-muted">Conexões por interesses escolhidos pelos próprios usuários. Sem perfilamento secreto e sem IA.</div></div><button class="ps-close" data-ps-close>×</button></div><div id="psMatches" style="display:grid;gap:9px;margin-top:14px"></div>');
 const box=d.querySelector('#psMatches');
 for(const x of ranked){
   const shared=[...byUser.get(x.p.id)||[]].map(id=>interestMap.get(id)?.name).filter(Boolean).slice(0,5);
   const row=document.createElement('div');row.className='ps-person';
   row.innerHTML=`<div class="ps-person-avatar">${x.p.avatar_url?`<img src="${esc(x.p.avatar_url)}" alt="">`:esc((x.p.display_name||'?')[0].toUpperCase())}</div><div class="ps-person-main"><strong>${esc(x.p.display_name||'Usuário')}</strong><span>${x.p.username?'@'+esc(x.p.username):'membro PULSO'} · ${x.score} interesse${x.score===1?'':'s'} em comum</span><div>${shared.map(n=>`<span class="ps-tag">${esc(n)}</span>`).join('')}</div></div><button class="ps-btn primary" data-collab="${x.p.id}">Convidar</button>`;
   row.querySelector('[data-collab]').onclick=()=>openCollabRequest(x.p.id,x.p.display_name||'Usuário');
   box.appendChild(row);
 }
}

async function openCollabRequest(to,name){
 const d=modal(`<div class="ps-head"><div><h2>🤝 Convidar para colaborar</h2><div class="ps-muted">Enviar um convite direto para ${esc(name)}.</div></div><button class="ps-close" data-ps-close>×</button></div><textarea id="psCollabMsg" maxlength="500" style="width:100%;box-sizing:border-box;margin-top:14px;min-height:100px;background:rgba(255,255,255,.05);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:13px;padding:12px" placeholder="Ex.: Tenho uma ideia e acho que podemos criar algo juntos."></textarea><div class="ps-actions"><button class="ps-btn primary" id="psSendCollab">Enviar convite</button></div><div id="psCollabResult" class="ps-muted" style="margin-top:8px"></div>`);
 d.querySelector('#psSendCollab').onclick=async()=>{
   const b=d.querySelector('#psSendCollab'),msg=d.querySelector('#psCollabMsg').value.trim(),out=d.querySelector('#psCollabResult');b.disabled=true;
   const r=await db.from('pulso_collaboration_requests').insert({from_user_id:me,to_user_id:to,message:msg});
   if(r.error){out.textContent=r.error.message;b.disabled=false;return}
   out.textContent='✓ Convite enviado.';setTimeout(()=>d.remove(),700);
 };
}

async function logAction(postId,type){
 if(!me||!postId)return;
 const r=await db.from('pulso_content_actions').upsert({post_id:postId,user_id:me,action_type:type},{onConflict:'post_id,user_id,action_type'});
 if(r.error)console.warn('PULSO action',r.error);
}

async function vivo(postId,card){
 const d=modal('<div class="ps-head"><div><h2>🫀 Pulso Vivo</h2><div class="ps-muted">Esta publicação pode continuar. Você escolhe o próximo movimento.</div></div><button class="ps-close" data-ps-close>×</button></div><div id="psVivoBody" class="ps-empty" style="margin-top:14px">Carregando...</div>');
 const q=await db.from('pulso_content_actions').select('action_type,user_id').eq('post_id',postId);
 const counts={opinar:0,continuar:0,colaborar:0};(q.data||[]).forEach(x=>counts[x.action_type]=(counts[x.action_type]||0)+1);
 const b=d.querySelector('#psVivoBody');b.className='';
 b.innerHTML=`<div class="ps-grid" style="grid-template-columns:repeat(3,1fr)"><button class="ps-btn" id="psOpinion">💬 Opinar <small>${counts.opinar}</small></button><button class="ps-btn" id="psContinue">🌱 Continuar <small>${counts.continuar}</small></button><button class="ps-btn" id="psCollaborate">🤝 Colaborar <small>${counts.colaborar}</small></button></div><div class="ps-muted" style="margin-top:12px">Nenhum crédito. Nenhuma função paga. É parte do PULSO.</div>`;
 d.querySelector('#psOpinion').onclick=async()=>{await logAction(postId,'opinar');d.remove();card?.querySelector('[data-comment]')?.focus()};
 d.querySelector('#psContinue').onclick=async()=>{await logAction(postId,'continuar');d.remove();card?.querySelector('[data-continue]')?.click()};
 d.querySelector('#psCollaborate').onclick=async()=>{await logAction(postId,'colaborar');d.remove();openMatches()};
}

function inferInterestNames(text){
 const t=(text||'').toLowerCase(),out=[];
 for(const [name,ws] of Object.entries(words))if(ws.some(w=>t.includes(w)))out.push(name);
 return out;
}

async function tagPost(postId,caption){
 const names=inferInterestNames(caption);if(!names.length)return;
 const rows=names.map(n=>interestMap.get(n)).filter(Boolean).map(i=>({post_id:postId,interest_id:i.id}));
 if(rows.length)await db.from('pulso_post_interests').upsert(rows,{onConflict:'post_id,interest_id'});
}

function decoratePost(card){
 if(!card||card.dataset.psSync==='1')return;card.dataset.psSync='1';
 const id=card.dataset.post;if(!id)return;
 const actions=card.querySelector('.actions');if(!actions)return;
 const row=document.createElement('div');row.className='ps-vivo';
 row.innerHTML='<button type="button" data-ps-vivo>🫀 Pulso Vivo</button><span class="ps-vivo-count">Ideia → pessoas → colaboração</span>';
 actions.appendChild(row);
 row.querySelector('[data-ps-vivo]').onclick=e=>{e.stopPropagation();vivo(id,card)};
 const caption=card.querySelector('.caption')?.textContent||'';
 tagPost(id,caption).catch(()=>{});
}

function install(){
 css();
 if(document.getElementById('pulsoSyncBar'))return;
 const feed=document.getElementById('feed');if(!feed)return;
 const bar=document.createElement('div');bar.id='pulsoSyncBar';
 bar.innerHTML='<button class="ps-btn primary" data-ps="dna">🧬 Meu DNA</button><button class="ps-btn" data-ps="match">🤝 Encontrar colaboradores</button><span class="ps-muted" style="align-self:center">Sem IA • sem créditos • sem cobrança por uso</span>';
 feed.parentElement.insertBefore(bar,feed);
 bar.querySelector('[data-ps="dna"]').onclick=openDNA;
 bar.querySelector('[data-ps="match"]').onclick=openMatches;
 const decorate=()=>document.querySelectorAll('#feed [data-post]').forEach(decoratePost);
 decorate();
 new MutationObserver(decorate).observe(feed,{childList:true,subtree:true});
 document.addEventListener('pulso-published',e=>{const id=e.detail?.postId;if(id)tagPost(id,document.getElementById('caption')?.value||'').catch(()=>{})});
}
async function init(){try{if(await loadBase())install()}catch(e){console.error('PULSO SYNC',e)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
