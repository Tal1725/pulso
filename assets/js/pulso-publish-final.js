/* PULSO — publicador direto, independente dos módulos do app. */
(() => {
  'use strict';
  const SUPABASE_URL='https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET='pulso-videos';
  const $=s=>document.querySelector(s);
  const msg=(t,err=false)=>{const e=$('#publishMsg');if(e){e.textContent=t;e.style.color=err?'#ff6b6b':'';}};
  const clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm').then(m=>m.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
  function fallbackSession(){for(const k of Object.keys(localStorage)){if(!/^sb-.+-auth-token(?:\.\d+)?$/.test(k))continue;try{const s=JSON.parse(localStorage.getItem(k)||'');if(s?.access_token&&s?.user?.id)return s;}catch{}}return null;}
  async function getSession(){try{const db=await clientPromise;const {data,error}=await db.auth.getSession();if(!error&&data?.session)return data.session;}catch(e){console.warn('[PULSO publish auth]',e);}return fallbackSession();}
  function ext(f,t){const m=(f?.name||'').toLowerCase().match(/\.([a-z0-9]{2,5})$/);return m?m[1]:t==='image'?'jpg':t==='audio'?'mp3':'mp4';}
  function typeOf(f,forced){if(!f)return'text';if(['video','image','audio'].includes(forced))return forced;if(f.type?.startsWith('image/'))return'image';if(f.type?.startsWith('audio/'))return'audio';return'video';}
  function pubUrl(p){return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${p.split('/').map(encodeURIComponent).join('/')}`;}
  async function req(url,opt={}){const c=new AbortController(),tm=setTimeout(()=>c.abort(),60000);try{return await fetch(url,{...opt,signal:c.signal})}finally{clearTimeout(tm)}}
  async function publish(){
    const b=$('#publishBtn');if(!b||b.dataset.pulsoPublishing==='1')return;
    const caption=($('#caption')?.value||'').trim(),approved=window.pulsoApprovedMedia||null,input=$('#video')?.files?.[0]||null,audio=$('#audioInput')?.files?.[0]||null,file=approved?.file||input||audio||null,type=typeOf(file,approved?.type||$('#mediaType')?.value||'');
    b.dataset.pulsoPublishing='1';b.disabled=true;b.textContent='Publicando...';
    try{
      if(!file&&!caption)throw Error('Escreva uma legenda ou escolha uma mídia para publicar.');
      if(file&&file.size>100*1024*1024)throw Error('A mídia precisa ter no máximo 100 MB.');
      if(file&&type==='video'&&!file.type.startsWith('video/'))throw Error('O arquivo selecionado não é um vídeo válido.');
      if(file&&type==='image'&&!file.type.startsWith('image/'))throw Error('O arquivo selecionado não é uma imagem válida.');
      if(file&&type==='audio'&&!file.type.startsWith('audio/'))throw Error('O arquivo selecionado não é um áudio válido.');
      msg('⏳ Verificando sua sessão...');
      const session=await getSession();
      if(!session?.access_token||!session?.user?.id)throw Error('Sua sessão não foi encontrada. Saia e entre novamente no PULSO.');
      const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${session.access_token}`};let path=null,url=null;
      if(file){msg('⏳ Enviando mídia...');path=`${session.user.id}/${type}/${crypto.randomUUID?crypto.randomUUID():Date.now()}_${ext(file,type)}`;const r=await req(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'POST',headers:{...headers,'Content-Type':file.type||'application/octet-stream','x-upsert':'false'},body:file});if(!r.ok)throw Error(`Falha no armazenamento: ${(await r.text())||r.status}`);url=pubUrl(path);}
      msg('⏳ Salvando publicação...');
      const r=await req(`${SUPABASE_URL}/rest/v1/posts`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({user_id:session.user.id,caption,media_type:file?type:'text',media_url:url,video_url:type==='video'&&url?url:null})});
      if(!r.ok){const text=await r.text();if(path)await req(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`,{method:'DELETE',headers}).catch(()=>{});throw Error(`A publicação não foi salva: ${text||r.status}`);}
      msg('✅ Publicado no PULSO!');window.pulsoApprovedMedia=null;if($('#caption'))$('#caption').value='';if($('#video'))$('#video').value='';if($('#audioInput'))$('#audioInput').value='';document.dispatchEvent(new CustomEvent('pulso-published'));setTimeout(()=>location.reload(),900);
    }catch(e){console.error('[PULSO publish]',e);msg(`❌ ${e?.name==='AbortError'?'Tempo esgotado. Tente novamente.':e?.message||'Não foi possível publicar agora.'}`,true);}
    finally{b.disabled=false;b.dataset.pulsoPublishing='0';b.textContent='Publicar';}
  }
  window.addEventListener('click',e=>{const t=e.target?.closest?.('#publishBtn');if(!t)return;e.preventDefault();e.stopImmediatePropagation();publish()},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{const b=$('#publishBtn');if(b)b.dataset.pulsoDirectReady='1'},{once:true});
  window.pulsoPublish=publish;
})();