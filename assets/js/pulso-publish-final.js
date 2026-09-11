/* PULSO — PUBLICADOR V9 — mídia até 500 MB */
(() => {
  'use strict';
  const SUPABASE_URL='https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET='pulso-videos', MAX_FILE=500*1024*1024;
  let dbPromise=null,publishing=false;
  const $=s=>document.querySelector(s);
  const msg=(t,e=false)=>{const x=$('#publishMsg');if(x){x.textContent=t;x.style.color=e?'#ff6b6b':''}};
  function ensureComposer(){
    let c=document.querySelector('.composer'), section=document.querySelector('main .grid section');
    if(!c&&section){
      c=document.createElement('div');c.className='composer';
      c.innerHTML='<textarea id="caption" maxlength="500" placeholder="O que está acontecendo agora?"></textarea><div class="row"><label class="upload-icon">🎥<span>Vídeo</span><input id="video" type="file" accept="video/*"></label><label class="upload-icon">📸<span>Foto</span><input id="photoInput" type="file" accept="image/*"></label><label class="upload-icon">🎧<span>Áudio</span><input id="audioInput" type="file" accept="audio/*"></label><button class="pill primary" id="publishBtn" type="button">Publicar</button></div><div id="publishMsg" class="file"></div>';section.prepend(c)
    }
    if(c){c.hidden=false;c.style.display='block';c.style.visibility='visible';c.style.opacity='1'}
    const b=$('#publishBtn');if(b){b.hidden=false;b.style.display='inline-flex';b.style.visibility='visible';b.style.opacity='1'}
    return b;
  }
  async function db(){if(!dbPromise)dbPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));return dbPromise}
  function extension(file,type){const n=(file?.name||'').split('.').pop()?.toLowerCase();return n&&/^[a-z0-9]{2,5}$/.test(n)?n:(type==='image'?'jpg':type==='audio'?'webm':'mp4')}
  async function publish(){
    if(publishing)return;
    const b=ensureComposer();if(!b)return;
    const text=($('#caption')?.value||'').trim();
    const approved=window.pulsoApprovedMedia;
    const f=approved?.file||$('#video')?.files?.[0]||$('#photoInput')?.files?.[0]||$('#audioInput')?.files?.[0];
    if(!f&&!text)return msg('Escolha um vídeo, foto, áudio ou escreva algo.',true);
    if(f&&f.size>MAX_FILE)return msg('A mídia deve ter no máximo 500 MB.',true);
    publishing=true;b.disabled=true;b.textContent='Publicando...';let path=null;
    try{
      msg('Publicando no PULSO...');
      const sup=await db(), session=await sup.auth.getSession();
      if(session.error)throw session.error;
      const uid=session.data.session?.user?.id;if(!uid)throw new Error('Sessão expirada. Entre novamente no PULSO.');
      let type='text',url=null;
      if(f){type=f.type?.startsWith('image/')?'image':f.type?.startsWith('audio/')?'audio':'video';path=`${uid}/${type}/${crypto.randomUUID()}.${extension(f,type)}`;const up=await sup.storage.from(BUCKET).upload(path,f,{contentType:f.type||'application/octet-stream',upsert:false});if(up.error)throw new Error('Falha no envio: '+up.error.message);url=sup.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
      const ins=await sup.from('posts').insert({user_id:uid,caption:text,media_type:type,media_url:url,video_url:type==='video'?url:null}).select('id').single();
      if(ins.error){if(path)await sup.storage.from(BUCKET).remove([path]);throw new Error('Falha ao salvar: '+ins.error.message)}
      if(!ins.data?.id)throw new Error('O banco não confirmou a publicação.');
      window.pulsoApprovedMedia=null;
      ['caption','video','photoInput','audioInput'].forEach(id=>{const x=$('#'+id);if(x)x.value=''});
      msg('✅ Publicado com sucesso!');
      document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:ins.data.id}}));
      setTimeout(()=>location.reload(),400);
    }catch(e){console.error('[PULSO V9]',e);msg('❌ '+(e?.message||'Não foi possível publicar.'),true)}
    finally{publishing=false;b.disabled=false;b.textContent='Publicar'}
  }
  window.pulsoPublish=publish;
  function bind(){const b=ensureComposer();if(!b||b.dataset.pulsoV9)return;b.dataset.pulsoV9='1';b.addEventListener('click',e=>{e.preventDefault();publish()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
  window.pulsoPublisherVersion='v9';
})();
