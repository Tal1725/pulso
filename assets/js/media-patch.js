import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const supabase=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
function injectCss(){if($('#mediaPatchCss'))return;const s=document.createElement('style');s.id='mediaPatchCss';s.textContent='.media-card{max-width:620px}.camera-preview{width:100%;max-height:58vh;object-fit:cover;border-radius:18px;background:#000}.media-timer{text-align:center;font-weight:700;margin:12px 0}.media-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}.upload-icon{cursor:pointer;user-select:none}.upload-icon input{display:none}.pulso-feed-image{display:block;width:100%;max-height:70vh;object-fit:contain;border-radius:18px}.pulso-feed-audio{display:block;width:100%;margin:10px 0}';document.head.appendChild(s)}
function makeMedia(x){
  let el;
  if(x.media_type==='image'){el=document.createElement('img');el.className='video pulso-feed-image';el.alt='Imagem publicada no PULSO'}
  else if(x.media_type==='audio'){el=document.createElement('audio');el.className='video pulso-feed-audio';el.controls=true}
  else{el=document.createElement('video');el.className='video';el.controls=true;el.playsInline=true;el.preload='metadata';el.setAttribute('playsinline','')}
  el.src=x.media_url||x.video_url||'';
  return el;
}
async function renderMedia(){
  const{data:p,error}=await supabase.from('posts').select('id,media_type,media_url,video_url,created_at').not('media_type','is',null).order('created_at',{ascending:false}).limit(200);
  if(error||!p?.length)return;
  const map=new Map(p.map(x=>[String(x.id),x]));
  document.querySelectorAll('[data-post]').forEach(card=>{
    const x=map.get(String(card.dataset.post));
    if(!x||!x.media_url)return;
    const old=card.querySelector('.video');
    if(old){
      const wanted=x.media_type==='image'?'IMG':x.media_type==='audio'?'AUDIO':'VIDEO';
      if(old.tagName!==wanted){old.replaceWith(makeMedia(x));return}
      if(old.src!==x.media_url)old.src=x.media_url;
      if(wanted==='VIDEO'){old.controls=true;old.playsInline=true;old.preload='metadata'}
      if(wanted==='AUDIO')old.controls=true;
      return;
    }
    const el=makeMedia(x);
    const caption=card.querySelector('.caption');
    if(caption)caption.before(el);else card.appendChild(el);
  });
}
async function init(){
  injectCss();
  const{data:s}=await supabase.auth.getSession();
  if(!s.session)return;
  const feed=$('#feed');
  if(!feed)return;
  new MutationObserver(()=>{clearTimeout(window.__pulsoMediaTimer);window.__pulsoMediaTimer=setTimeout(renderMedia,80)}).observe(feed,{childList:true,subtree:true});
  setTimeout(renderMedia,250);
}
window.addEventListener('load',init);