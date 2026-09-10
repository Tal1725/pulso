import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const PULSO_SUPABASE_URL = 'https://vqpavcyehgdifbtvzhcn.supabase.co';
const PULSO_SUPABASE_KEY = 'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm';
const db = createClient(PULSO_SUPABASE_URL, PULSO_SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
const $ = (s) => document.querySelector(s);
const msg = (text, error = false) => { const el = $('#publishMsg'); if (el) { el.textContent = text; el.style.color = error ? '#ff7b7b' : ''; } };
async function withTimeout(promise, ms = 45000) { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('A operação demorou demais. Verifique sua conexão e tente novamente.')), ms); })]); } finally { clearTimeout(timer); } }
function ext(file, type) { const x=(file?.name?.split('.').pop()||'').toLowerCase().replace(/[^a-z0-9]/g,''); if(x)return x; return type==='image'?'jpg':type==='audio'?'webm':'mp4'; }
function typeOf(file, forced) { if(forced&&['video','image','audio'].includes(forced)) return forced; const t=(file?.type||'').toLowerCase(); if(t.startsWith('image/'))return'image'; if(t.startsWith('audio/'))return'audio'; if(t.startsWith('video/'))return'video'; return 'video'; }
async function publish() {
  const btn=$('#publishBtn'), caption=($('#caption')?.value||'').trim(), approved=window.pulsoApprovedMedia||null;
  const inputFile=$('#video')?.files?.[0]||null, audioFile=$('#audioInput')?.files?.[0]||null;
  const file=approved?.file||inputFile||audioFile||null;
  const mediaType=typeOf(file, approved?.type||$('#mediaType')?.value);
  if(!file&&!caption){msg('Escreva uma legenda ou escolha uma mídia para publicar.',true);return;}
  if(file&&file.size>100*1024*1024){msg('O arquivo deve ter no máximo 100 MB.',true);return;}
  if(file&&mediaType==='video'&&!file.type.startsWith('video/')){msg('O arquivo escolhido não é um vídeo válido.',true);return;}
  if(file&&mediaType==='image'&&!file.type.startsWith('image/')){msg('O arquivo escolhido não é uma foto válida.',true);return;}
  if(file&&mediaType==='audio'&&!file.type.startsWith('audio/')){msg('O arquivo escolhido não é um áudio válido.',true);return;}
  if(btn) { btn.disabled=true; btn.dataset.pulsoPublishing='1'; btn.textContent='Publicando...'; }
  try {
    const {data:sessionData,error:sessionError}=await withTimeout(db.auth.getSession()); if(sessionError)throw sessionError;
    const user=sessionData?.session?.user; if(!user)throw new Error('Sua sessão expirou. Entre novamente no PULSO.');
    let publicUrl=null, path=null;
    if(file){
      msg('⏳ Enviando mídia...');
      path=`${user.id}/${mediaType}/${crypto.randomUUID()}.${ext(file,mediaType)}`;
      const upload=await withTimeout(db.storage.from('pulso-videos').upload(path,file,{contentType:file.type||'application/octet-stream',cacheControl:'3600',upsert:false}));
      if(upload.error)throw new Error(`Falha no armazenamento: ${upload.error.message}`);
      publicUrl=db.storage.from('pulso-videos').getPublicUrl(path).data?.publicUrl||null;
      if(!publicUrl)throw new Error('O arquivo foi enviado, mas não foi possível obter o endereço da mídia.');
    }
    msg('⏳ Salvando publicação...');
    const row={user_id:user.id,caption,media_type:file?mediaType:'text',media_url:publicUrl,video_url:mediaType==='video'&&publicUrl?publicUrl:null};
    const insert=await withTimeout(db.from('posts').insert(row).select('id').single());
    if(insert.error){if(path)await db.storage.from('pulso-videos').remove([path]).catch(()=>{});throw new Error(`A publicação não foi salva: ${insert.error.message}`);}
    msg('✅ Publicado no PULSO!'); window.pulsoApprovedMedia=null;
    if($('#caption'))$('#caption').value=''; if($('#video'))$('#video').value=''; if($('#audioInput'))$('#audioInput').value=''; if($('#mediaType'))$('#mediaType').value='video';
    document.dispatchEvent(new CustomEvent('pulso-published',{detail:{postId:insert.data?.id}}));
  } catch(err) { console.error('[PULSO publish final]',err); msg(`❌ ${err?.message||'Não foi possível publicar agora.'}`,true); }
  finally { if(btn){btn.disabled=false;btn.dataset.pulsoPublishing='0';btn.textContent='Publicar';} }
}
function install(){const btn=$('#publishBtn');if(!btn||btn.dataset.finalPublishInstalled==='1')return;btn.dataset.finalPublishInstalled='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();if(!btn.dataset.pulsoPublishing)publish();},true);document.addEventListener('pulso-published',()=>setTimeout(()=>window.location.reload(),900));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
new MutationObserver(install).observe(document.body,{childList:true,subtree:true});