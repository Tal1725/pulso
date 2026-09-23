import{createClient}from'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const sb=createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm');
function style(){if(document.getElementById('pulso-enhancements-style'))return;const s=document.createElement('style');s.id='pulso-enhancements-style';s.textContent='.social-stats button strong,.social-stats button span{visibility:visible!important;opacity:1!important;display:block!important}.social-stats button{min-height:68px}';document.head.appendChild(s)}
async function syncSidebarStats(){const{data:s}=await sb.auth.getSession(),id=s.session?.user?.id;if(!id)return;const fc=document.querySelector('#followersCount'),fg=document.querySelector('#followingCount');if(!fc||!fg)return;const[a,b]=await Promise.all([sb.from('follows').select('*',{count:'exact',head:true}).eq('following_id',id),sb.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',id)]);fc.textContent=String(a.count||0);fg.textContent=String(b.count||0)}
function install(){style();const b=document.querySelector('#profileBtn');if(b)b.removeAttribute('data-enhanced');syncSidebarStats()}
window.addEventListener('load',install);window.addEventListener('pulso-follow-changed',syncSidebarStats);install();
import('./pulso-collective.js?v=20260908b');
import('./pulso-age-gate.js?v=20260909a');
