import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';
const supabase = createClient('https://vqpavcyehgdifbtvzhcn.supabase.co','sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});

let channel = null;
let timer = null;

async function refreshNotifications(){
  if (typeof window.loadNotifications === 'function') {
    try { await window.loadNotifications(); } catch (_) {}
  } else {
    const btn = document.querySelector('#notificationBtn');
    if (btn) btn.dispatchEvent(new Event('pulso:notifications-refresh'));
  }
}

async function start(){
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user?.id;
  if (!uid) return;

  if (channel) await supabase.removeChannel(channel);
  channel = supabase.channel(`pulso-notifications-${uid}`)
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${uid}`},async()=>{
      await refreshNotifications();
      const btn=document.querySelector('#notificationBtn');
      if(btn) btn.classList.add('pulso-notification-pulse');
      setTimeout(()=>btn?.classList.remove('pulso-notification-pulse'),1200);
    })
    .subscribe();
}

window.addEventListener('load',()=>{
  start();
  timer=setInterval(start,60000);
});
window.addEventListener('beforeunload',()=>{ if(timer) clearInterval(timer); if(channel) supabase.removeChannel(channel); });
