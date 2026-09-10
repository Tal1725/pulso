/* PULSO — PUBLICAÇÃO FINAL V4 */
(() => {
  'use strict';
  const SUPABASE_URL='https://vqpavcyehgdifbtvzhcn.supabase.co';
  const SUPABASE_KEY='sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
  const BUCKET='pulso-videos';
  const MAX_FILE=100*1024*1024;
  let clientPromise=null;
  let publishing=false;
  const $=s=>document.querySelector(s);
  const msg=(t,err=false)=>{const e=$('#publishMsg');if(e){e.textContent=t;e.style.color=err?'#ff6b6b':'';}};
  async function client(){
    if(!clientPromise) clientPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm').then(({createClient})=>createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}));
    return clientPromise;
  }
  async function getSession(){
    const db=await client();
    const r=await db.auth.getSession();
    if(r.error) throw r.error;
    if(r.data.session?.user?.id&&r.data.session.access_token) return r.data.session;
    throw new Error('Sua sessão não foi encontrada. Entre novamente no PULSO.');
  }
  function getFile(){
    return window.pulsoApprovedMedia?.file || $('#video')?.files?.[0] || $('#audioInput')?.files?.[0] || null;
  }
  function getType(file){
    const approved=window.pulsoApprovedMedia?.type;
    if(approved&&['video','image','audio'].includes(approved)) return approved;
    if(file?.type?.startsWith('image/')) return 'image';
    if(file?.type?.startsWith('audio/')) return 'audio';
    if(file?.type?.startsWith('video/')) return 'video';
    const forced=$('#mediaType')?.value||'';
    if(['video','image','audio'].includes(forced)) return forced;
    return file?'video':'text';
  }
  function ext(file,type){
    const x=(file?.name||'').match(/\.([a-z0-9]{2,5})$/i)?.[1];
    return x?.toLowerCase()||(type==='image'?'jpg':type==='audio'?'webm':'webm');
  }
  async function publish(){
    if(publishing)return;
    const button=$('#publishBtn');
    if(!button)return;
    const caption=($('#caption')?.value||'').trim();
    const file=getFile();
    const type=getType(file);
    const hiveId=$('#hivePublishSelect')?.value||null;
    if(!file&&!caption){msg('Escreva uma legenda ou escolha uma mídia para publicar.',true);return;}
    if(file&&file.size>MAX_FILE){msg('A mídia precisa ter no máximo 100 MB.',true);return;}
    if(file&&type==='video'&&!file.type.startsWith('video/')){msg('O arquivo selecionado não é um vídeo válido.',true);return;}
    if(file&&type==='image'&&!file.type.startsWith('image/')){msg('O arquivo selecionado não é uma imagem válida.',true);return;}
    if(file&&type==='audio'&&!file.type.startsWith('audio/')){msg('O arquivo selecionado não é um áudio válido.',true);return;}
    publishing=true;button.disabled=true;button.textContent='Publicando...';
    let path=null;
    try{
      msg('⏳ Verificando sua conta...');
      const db=await client();
      const session=await getSession();
      const uid=session.user.id;
      let mediaUrl=null;
      if(file){
        msg(type==='video'?'⏳ Enviando vídeo...':type==='image'?'⏳ Enviando foto...':'⏳ Enviando áudio...');
        path=`${uid}/${type}/${crypto.randomUUID()}_${ext(file,type)}`;
        const up=await db.storage.from(BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',cacheControl:'3600',upsert:false});
        if(up.error)throw new Error(up.error.message);
        mediaUrl=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        if(!mediaUrl)throw new Error('Não foi possível obter o endereço da mídia.');
      }
      msg('⏳ Salvando publicação...');
      const row={user_id:uid,caption,media_type:type,media_url:mediaUrl,video_url:type==='video'?mediaUrl:null};
      if(hiveId)row.hive_id=hiveId;
      const ins=await db.from('posts').insert(row).select('id').single();
      if(ins.error){if(path)await db.storage.from(BUCKET).remove([path]).catch(()=>{});throw new Error(ins.error.message);}
      if(!ins.data?.id)throw new Error('O PULSO não confirmou a publicação.');
      window.pulsoApprovedMedia=null;
      if($('#caption'))$('#caption').value='';
      if($('#video'))$('#video').value='';
      if($('#audioInput'))$('#audioInput').value='';
      msg('✅ Publicado no PULSO!');
      document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:ins.data.id}}));
      setTimeout(()=>location.reload(),700);
    }catch(e){console.error('[PULSO V4]',e);msg('❌ '+(e?.message||'Não foi possível publicar agora.'),true);}
    finally{publishing=false;button.disabled=false;button.textContent='Publicar';}
  }
  window.pulsoPublish=publish;
  window.pulsoPublishVersion='v4';
  function bind(){
    const b=$('#publishBtn');
    if(!b||b.dataset.pulsoPublishBound==='1')return;
    b.dataset.pulsoPublishBound='1';
    b.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();publish();},{capture:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  new MutationObserver(bind).observe(document.documentElement,{childList:true,subtree:true});
})();