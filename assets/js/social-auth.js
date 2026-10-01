import { auth, GoogleAuthProvider, signInWithPopup, signOut, authErrorMessage } from "./firebase-auth.js";
const friendly={google:"Google",facebook:"Facebook",twitter:"X"};
async function login(provider){
  const msg=document.getElementById("socialMessage");
  document.querySelectorAll("[data-social-provider]").forEach(b=>b.disabled=true);
  if(msg){msg.textContent=`Conectando com ${friendly[provider]||provider}...`;msg.className="social-message";}
  try{
    if(provider!=="google")throw Object.assign(new Error("Este provedor ainda não foi configurado no Firebase."),{code:"auth/operation-not-allowed"});
    await signInWithPopup(auth,new GoogleAuthProvider());
    location.href="app.html";
  }catch(e){
    try{await signOut(auth);}catch{}
    if(msg){msg.textContent=authErrorMessage(e);msg.className="message show error";}
  }finally{document.querySelectorAll("[data-social-provider]").forEach(b=>b.disabled=false);}
}
window.pulsoSocialLogin=login;
document.querySelectorAll("[data-social-provider]").forEach(b=>b.addEventListener("click",()=>login(b.dataset.socialProvider)));
