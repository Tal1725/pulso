(() => {
  const MUX_PLAYER_SRC='https://cdn.jsdelivr.net/npm/@mux/mux-player@3.10.1';
  let loaded=false;
  function isMuxUrl(src){return typeof src==='string' && /(^|\.)mux\.com\//i.test(src)}
  function playbackIdFromUrl(src){const m=String(src||'').match(/stream\.mux\.com\/([^.?/]+)(?:\.m3u8)?/i);return m?.[1]||''}
  function load(){if(loaded||customElements.get('mux-player')){loaded=true;return Promise.resolve()}return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=MUX_PLAYER_SRC;s.defer=true;s.onload=()=>{loaded=true;resolve()};s.onerror=reject;document.head.appendChild(s)})}
  async function upgrade(root=document){const videos=[...root.querySelectorAll('video.video')];for(const v of videos){const src=v.currentSrc||v.src||v.getAttribute('src')||'';if(!isMuxUrl(src))continue;const id=playbackIdFromUrl(src);if(!id)continue;try{await load();const p=document.createElement('mux-player');p.setAttribute('playback-id',id);p.setAttribute('metadata-video-id',v.closest('[data-post]')?.dataset.post||id);p.setAttribute('metadata-video-title','PULSO');p.setAttribute('playsinline','');p.setAttribute('controls','');p.setAttribute('preload','metadata');p.style.cssText='width:100%;max-height:650px;display:block;--media-object-fit:cover;--controls:rgba(0,0,0,.55);';v.replaceWith(p)}catch(e){console.warn('PULSO Mux player:',e)}}}
  window.pulsoMux={upgrade};
  const obs=new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>n.nodeType===1&&upgrade(n))));
  if(document.body){obs.observe(document.body,{childList:true,subtree:true});upgrade()}
})();