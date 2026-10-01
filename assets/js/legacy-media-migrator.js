import { auth, db } from "./firebase.js";
import { getIdToken } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, doc, getDocs, limit, query, updateDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const ADMIN_EMAIL="ayslan.tal@gmail.com";
const FN_URL="https://vqpavcyehgdifbtvzhcn.supabase.co/functions/v1/migrate-legacy-media";

async function migrateLegacyMedia(){
  const u=auth.currentUser;
  if(!u || (u.email||"").toLowerCase()!==ADMIN_EMAIL){
    alert("Acesso restrito ao administrador.");
    return;
  }
  const btn=document.getElementById("legacyMediaBtn");
  const status=document.getElementById("legacyMediaStatus");
  if(btn)btn.disabled=true;
  if(status)status.textContent="Verificando vídeos antigos...";

  try{
    const snap=await getDocs(query(collection(db,"posts"),limit(100)));
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}))
      .filter(p=>p.media_provider==="legacy_supabase" && (p.media_url||p.video_url));

    if(!rows.length){
      if(status)status.textContent="Nenhum vídeo antigo pendente.";
      return;
    }

    const token=await getIdToken(u,true);
    let ok=0,fail=0;
    for(let i=0;i<rows.length;i++){
      const p=rows[i];
      if(status)status.textContent=`Recuperando vídeo ${i+1}/${rows.length}...`;
      try{
        const res=await fetch(FN_URL,{
          method:"POST",
          headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
          body:JSON.stringify({source_url:p.media_url||p.video_url,legacy_id:p.id})
        });
        const data=await res.json();
        if(!res.ok || !data.secure_url) throw new Error(data.error||("HTTP "+res.status));
        await updateDoc(doc(db,"posts",p.id),{
          media_url:data.secure_url,
          video_url:data.secure_url,
          media_provider:"cloudinary",
          media_public_id:data.public_id
        });
        ok++;
      }catch(e){
        fail++;
        console.warn("[PULSO] falha ao recuperar",p.id,e);
      }
    }
    if(status)status.textContent=`Concluído: ${ok} recuperado(s), ${fail} falha(s). Recarregue o feed.`;
    window.loadFeed?.();
  }catch(e){
    console.error("[PULSO] migrador",e);
    if(status)status.textContent="Não foi possível iniciar a recuperação: "+(e.message||e);
  }finally{
    if(btn)btn.disabled=false;
  }
}

window.pulsoMigrateLegacyMedia=migrateLegacyMedia;
document.addEventListener("DOMContentLoaded",()=>{
  const btn=document.getElementById("legacyMediaBtn");
  if(btn)btn.addEventListener("click",migrateLegacyMedia);
});