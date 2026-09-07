const POLLINATIONS_AUTH='https://enter.pollinations.ai';
const POLLINATIONS_API='https://gen.pollinations.ai';
const REDIRECT_URI=`${location.origin}${location.pathname}`;
let pollinationsToken=sessionStorage.getItem('pulso_pollinations_token')||'';
let pollinationsAppKey=sessionStorage.getItem('pulso_pollinations_app_key')||'';

const b64url=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const randomString=n=>{const a=new Uint8Array(n);crypto.getRandomValues(a);return b64url(a)};
async function sha256(v){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(v))}

function ensurePollinationsOAuthPanel(){
  if(document.querySelector('#pulsoPollinationsPanel'))return;
  const tabs=document.querySelector('.ai-tabs');
  if(!tabs)return;
  const p=document.createElement('div');
  p.id='pulsoPollinationsPanel';
  p.className='ai-provider';
  p.innerHTML='<strong>🎨 Gerador visual</strong><span>Conecte sua conta Pollinations. O PULSO usa o Pollen autorizado por você e não guarda sua chave secreta.</span><div class="ai-provider-row"><input id="aiPollinationsAppKey" type="password" autocomplete="off" placeholder="App Key (pk_...)"/><button id="aiPollinationsConnect" class="pill">Conectar</button></div><div id="aiPollinationsState" class="file"></div><a href="https://enter.pollinations.ai/keys" target="_blank" rel="noopener">Criar/gerenciar App Key ↗</a>';
  tabs.after(p);
  const input=p.querySelector('#aiPollinationsAppKey');
  const state=p.querySelector('#aiPollinationsState');
  if(input)input.value=pollinationsAppKey;
  if(pollinationsToken){state.textContent='✅ Pollinations conectado nesta sessão.';}
  p.querySelector('#aiPollinationsConnect').onclick=()=>startPollinationsOAuth(input?.value?.trim()||'');
}

async function startPollinationsOAuth(appKey){
  if(!appKey.startsWith('pk_')){alert('Use uma App Key pk_ do Pollinations. A chave sk_ não deve ser colocada no navegador.');return;}
  pollinationsAppKey=appKey;
  sessionStorage.setItem('pulso_pollinations_app_key',appKey);
  const verifier=randomString(48);
  const state=randomString(24);
  const challenge=b64url(await sha256(verifier));
  sessionStorage.setItem('pulso_pkce_verifier',verifier);
  sessionStorage.setItem('pulso_oauth_state',state);
  const params=new URLSearchParams({response_type:'code',client_id:appKey,redirect_uri:REDIRECT_URI,scope:'usage',state,code_challenge:challenge,code_challenge_method:'S256',expiry:'7',budget:'5'});
  location.href=`${POLLINATIONS_AUTH}/authorize?${params}`;
}

async function handlePollinationsCallback(){
  const q=new URLSearchParams(location.search);
  const code=q.get('code');
  if(!code)return;
  const returnedState=q.get('state');
  const expectedState=sessionStorage.getItem('pulso_oauth_state');
  const verifier=sessionStorage.getItem('pulso_pkce_verifier');
  if(!returnedState||returnedState!==expectedState||!verifier){history.replaceState({},'',REDIRECT_URI);return;}
  const appKey=sessionStorage.getItem('pulso_pollinations_app_key')||'';
  try{
    const res=await fetch(`${POLLINATIONS_AUTH}/api/oauth/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',code,client_id:appKey,redirect_uri:REDIRECT_URI,code_verifier:verifier})});
    const data=await res.json();
    if(!res.ok||!data.access_token)throw new Error(data.error_description||data.error||'Não foi possível concluir a conexão.');
    pollinationsToken=data.access_token;
    sessionStorage.setItem('pulso_pollinations_token',pollinationsToken);
  }catch(e){sessionStorage.setItem('pulso_pollinations_error',e.message||'Erro ao conectar');}
  sessionStorage.removeItem('pulso_pkce_verifier');
  sessionStorage.removeItem('pulso_oauth_state');
  history.replaceState({},'',REDIRECT_URI);
}

function visualMode(){return document.querySelector('[data-ai-mode].active')?.dataset.aiMode||'viral'}
function setStatus(t){const e=document.querySelector('#aiStatus');if(e)e.textContent=t}
function esc(v){return String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]))}

async function generatePollinationsMedia(mode){
  const prompt=document.querySelector('#aiPrompt')?.value.trim();
  const style=document.querySelector('#aiStyle')?.value||'Criativo';
  const duration=Number(document.querySelector('#aiDuration')?.value||6);
  if(!prompt){setStatus('Digite a ideia que você quer criar.');return;}
  if(!pollinationsToken){ensurePollinationsOAuthPanel();setStatus('🔗 Conecte sua conta Pollinations para gerar imagem ou vídeo.');return;}
  const full=`${prompt}. Estilo: ${style}. Conteúdo vertical 9:16 para o PULSO, cinematográfico, alta qualidade, sem texto ilegível.`;
  const url=mode==='image'
    ?`${POLLINATIONS_API}/image/${encodeURIComponent(full)}?model=flux&width=768&height=1365&nologo=true`
    :`${POLLINATIONS_API}/video/${encodeURIComponent(full)}?model=wan-fast&duration=${Math.min(8,Math.max(4,duration))}`;
  setStatus(mode==='image'?'🎨 Gerando sua imagem...':'🎬 Gerando seu vídeo...');
  const res=await fetch(url,{headers:{Authorization:`Bearer ${pollinationsToken}`}});
  if(!res.ok){let detail='';try{detail=await res.text()}catch{}throw new Error(`Pollinations respondeu ${res.status}${detail?`: ${detail.slice(0,160)}`:''}`)}
  const blob=await res.blob();
  const mediaUrl=URL.createObjectURL(blob);
  const result=document.querySelector('#aiResult');
  if(!result)return;
  const type=mode==='image'?'Imagem':'Vídeo';
  result.innerHTML=`<div class="ai-result-head"><strong>${mode==='image'?'🖼️ Imagem criada':'🎬 Vídeo criado'}</strong><span>Pollinations</span></div>${mode==='image'?`<img class="ai-generated-media" src="${mediaUrl}" alt="Imagem gerada pela PULSO IA">`:`<video class="ai-generated-media" src="${mediaUrl}" controls playsinline></video>`}<div class="ai-copy"><strong>Prompt usado</strong><p>${esc(full)}</p></div><div class="ai-result-actions"><a class="pill" href="${mediaUrl}" target="_blank" rel="noopener">Abrir mídia</a><button class="pill primary" id="aiUsePollinationsPrompt">Usar prompt</button></div>`;
  result.hidden=false;
  setStatus(`✅ ${type} criada com sucesso.`);
  document.querySelector('#aiUsePollinationsPrompt')?.addEventListener('click',()=>{const c=document.querySelector('#caption');if(c)c.value=full;window.closePulsoAI?.()});
}

async function bootPollinations(){
  await handlePollinationsCallback();
  const inject=()=>ensurePollinationsOAuthPanel();
  inject();
  new MutationObserver(inject).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('click',e=>{
    const btn=e.target.closest('#aiGenerate');
    if(!btn||visualMode()==='viral')return;
    e.preventDefault();
    e.stopImmediatePropagation();
    btn.disabled=true;
    btn.textContent='Criando...';
    generatePollinationsMedia(visualMode()).catch(err=>setStatus=`Erro: ${err.message}`).finally(()=>{btn.disabled=false;btn.textContent='✨ Criar com IA'});
  },true);
  const oauthError=sessionStorage.getItem('pulso_pollinations_error');
  if(oauthError){setStatus(`⚠️ ${oauthError}`);sessionStorage.removeItem('pulso_pollinations_error')}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootPollinations);else bootPollinations();