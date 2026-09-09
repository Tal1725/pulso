/* PULSO AI ENGINE — roteador de modelos */
(function(){
  if(window.__pulsoAiEngine)return; window.__pulsoAiEngine=true;
  const models=[
    ['nanobanana-2','Nano Banana 2 — realismo e cenas'],
    ['seedream5-pro','Seedream 5 Pro — editorial premium'],
    ['gpt-image-2','GPT Image 2 — realismo avançado'],
    ['flux','FLUX — criação artística']
  ];
  function apply(){
    const s=document.getElementById('pulsoAiModel'); if(!s)return;
    const current=s.value;
    s.innerHTML=models.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
    if(models.some(x=>x[0]===current))s.value=current; else s.value='nanobanana-2';
    s.dataset.engineReady='1';
    const note=document.querySelector('.pulso-ai-note');
    if(note)note.innerHTML='⚡ <strong>Motor PULSO atualizado:</strong> usa modelos de nova geração para priorizar realismo. Com foto de referência, a edição continua no modo especializado de preservação de identidade.';
  }
  function watch(){apply();const m=new MutationObserver(apply);m.observe(document.body,{childList:true,subtree:true});setTimeout(()=>m.disconnect(),30000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch,{once:true});else watch();
})();
