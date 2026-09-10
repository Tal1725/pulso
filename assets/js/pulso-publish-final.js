/* PULSO — PUBLICADOR DE RECUPERAÇÃO V5 */
(() => {
  'use strict';
  const SUPABASE_URL='https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET='pulso-videos';
  const MAX_FILE=100*1024*1024;
  let dbPromise=null, publishing=false;
  const $=s=>document.querySelector(s);
  const msg=(t,err=false)=>{const e=$('#publishMsg');if(e){e.textContent=t;e.style.color=err?'#ff6b6b':''}};
  function ensureComposer(){
    let c=document.querySelector('.composer');
    const section=document.querySelector('main .grid section');
    if(!c&&section){
      c=document.createElement('div');c.className='composer';
      c.innerHTML='<textarea id="caption" maxlength="500" placeholder="O que está acontecendo agora?"></textarea><div class="row"><label class="upload-icon" title="Adicionar vídeo">🎥<span>Vídeo</span><input id="video" type="file" accept="video/*,image/*"></label><label class="upload-icon" title="Adicionar foto">📸<span>Foto</span><input id="photoInput" type="file" accept="image/*"></label><label class="upload-icon" title="Adicionar áudio">🎧<span>Áudio</span><input id="audioInput" type="file" accept="audio/*"></label><input id="mediaType" type="hidden" value="video"><div class="composer-actions"><button class="pill primary" id="publishBtn" type="button">Publicar</button></div></div><div id="publishMsg" class="file"></div>';
      section.prepend(c);
    }
    if(c){c.style.display='block';c.style.visibility='visible';c.style.opacity='1'}
    const b=$('#publishBtn');if(b){b.style.display='inline-flex';b.style.visibility='visible';b.style.opacity='1'}
    return b;
  }
  async function client(){if(!dbPromise)dbPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));return dbPromise}
  async function session(){const db=await client();const r=await db.auth.getSession();if(r.error)throw r.error;if(r.data.session?.user?.id)return r.data.session;throw new Error('Sua sessão não foi encontrada. Entre novamente no PULSO.')}
  function getFile(){return window.pulsoApprovedMedia?.file||$('#video')?.files?.[0]||$('#photoInput')?.files?.[0]||$('#audioInput')?.files?.[0]||null}
  function getType(f){const a=window.pulsoApprovedMedia?.type;if(a&&['video','image','audio'].includes(a))return a;if(f?.type?.startsWith('image/'))return'image';if(f?.type?.startsWith('audio/'))return'audio';if(f?.type?.startsWith('video/'))return'video';return f?'video':'text'}
  function extension(f,t){if(t==='image')return'jpg';if(t==='audio')return'webm';if(t==='video')return'mp4';return'txt'}
  async function publish(){
    if(publishing)return;const b=ensureComposer();if(!b)return;
    const caption=($('#caption')?.value||'').trim(),file=getFile(),type=getType(file);
    if(!file&&!caption){msg('Escreva algo ou escolha uma mídia para publicar.',true);return}
    if(file&&file.size>MAX_FILE){msg('A mídia precisa ter no máximo 100 MB.',true);return}
    publishing=true;b.disabled=true;b.textContent='Publicando...';let path=null;
    try{
      const db=await client(),s=await session(),uid=s.user.id;let url=null;
      if(file){msg(type==='video'?'⏳ Enviando vídeo...':type==='image'?'⏳ Enviando foto...':'⏳ Enviando áudio...');path=`${uid}/${type}/${crypto.randomUUID()}.${extension(file,type)}`;const up=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',cacheControl:'3600',upsert:false});if(up.error)throw new Error(up.error.message);url=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl}
      msg('⏳ Salvando publicação...');
      const row={user_id:uid,caption,media_type:type,media_url:url,video_url:type==='video'?url:null};
      const ins=await db.from('posts').insert(row).select('id').single();
      if(ins.error){if(path)await db.storage.from(BUCKET).remove([path]);throw new Error(ins.error.message)}
      window.pulsoApprovedMedia=null;if($('#caption'))$('#caption').value='';if($('#video'))$('#video').value='';if($('#photoInput'))$('#photoInput').value='';if($('#audioInput'))$('#audioInput').value='';msg('✅ Publicado no PULSO!');document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:ins.data.id}}));setTimeout(()=>location.reload(),700);
    }catch(e){console.error('[PULSO V5]',e);msg('❌ '+(e?.message||'Não foi possível publicar agora.'),true)}finally{publishing=false;b.disabled=false;b.textContent='Publicar'}
  }
  window.pulsoPublish=publish;window.pulsoPublishVersion='v5';
  function bind(){const b=ensureComposer();if(!b||b.dataset.pulsoPublishBound==='1')return;b.dataset.pulsoPublishBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();publish()},{capture:true})}
  function start(){ensureComposer();bind()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  new MutationObserver(()=>bind()).observe(document.documentElement,{childList:true,subtree:true});
})();