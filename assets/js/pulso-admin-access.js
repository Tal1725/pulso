import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const supabase=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const ADMIN='ayslan.tal@gmail.com';
const apply=(session)=>{const b=document.getElementById('adminBtn');if(!b)return;const email=(session?.user?.email||'').trim().toLowerCase();const allowed=email===ADMIN;b.hidden=!allowed;if(allowed){b.style.display='inline-flex';if(!b.dataset.bound){b.dataset.bound='1';b.addEventListener('click',()=>location.href='admin.html')}}};
const check=async()=>{try{const{data}=await supabase.auth.getSession();apply(data.session)}catch(e){console.warn('PULSO admin access:',e)}};
await check();
supabase.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>apply(session),0)});
setTimeout(check,1000);
setTimeout(check,3000);