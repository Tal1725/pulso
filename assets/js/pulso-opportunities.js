import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.115.0/+esm';

const sb = createClient(
  'https://vqpavcyehgdifbtvzhcn.supabase.co',
  'sb_publishable_915zO84U7fk0ZAjE4vdsFQ_yRWDA6Cm',
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (match) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[match]));

const money = (value) =>
  value == null
    ? 'Valor definido na campanha'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value));

const typeLabel = {
  challenge: 'Desafio',
  campaign: 'Campanha',
  gig: 'Oportunidade',
  idea: 'Ideia',
  community: 'Comunidade'
};

async function openOpportunities() {
  const modal = document.getElementById('opportunitiesModal');
  const body = document.getElementById('opportunitiesBody');
  const title = document.getElementById('opportunitiesTitle');

  if (!modal || !body) return;

  modal.hidden = false;
  if (title) title.textContent = '💰 Oportunidades';
  body.innerHTML = '<div class="opportunity-loading">Carregando oportunidades...</div>';

  const { data: session } = await sb.auth.getSession();
  const uid = session?.session?.user?.id || null;

  const { data: ops, error } = await sb
    .from('pulso_opportunities')
    .select('id,title,description,opportunity_type,reward_total,currency,starts_at,ends_at,max_participants,eligibility_text,sponsor_name')
    .order('created_at', { ascending: false });

  if (error) {
    body.innerHTML = '<div class="opportunity-empty"><strong>Não foi possível carregar agora.</strong><span>Tente novamente em alguns segundos.</span></div>';
    return;
  }

  let entries = [];
  if (uid && ops?.length) {
    const result = await sb
      .from('pulso_opportunity_entries')
      .select('opportunity_id,status')
      .eq('user_id', uid)
      .in('opportunity_id', ops.map((item) => item.id));
    entries = result.data || [];
  }

  const joined = new Map(entries.map((item) => [item.opportunity_id, item.status]));

  const cards = (ops || []).map((opportunity) => {
    const type = typeLabel[opportunity.opportunity_type] || 'Oportunidade';
    const sponsor = opportunity.sponsor_name
      ? '<span class="opportunity-sponsor">por ' + esc(opportunity.sponsor_name) + '</span>'
      : '';
    const eligibility = opportunity.eligibility_text
      ? '<div class="opportunity-eligibility">Quem pode participar: ' + esc(opportunity.eligibility_text) + '</div>'
      : '';
    const joinedAlready = joined.has(opportunity.id);
    const disabled = !uid || joinedAlready ? ' disabled' : '';
    const label = !uid
      ? 'Entre para participar'
      : joinedAlready
        ? '✓ Você já está participando'
        : 'Quero participar';

    return '<article class="opportunity-card">' +
      '<div class="opportunity-top"><span class="opportunity-type">' + type + '</span>' + sponsor + '</div>' +
      '<h3>' + esc(opportunity.title) + '</h3>' +
      '<p>' + esc(opportunity.description || '') + '</p>' +
      '<div class="opportunity-reward">💰 ' + esc(money(opportunity.reward_total)) + '</div>' +
      eligibility +
      '<button class="pill primary opportunity-join" data-opportunity="' + opportunity.id + '"' + disabled + '>' + label + '</button>' +
      '<div class="opportunity-entry-msg" id="opmsg-' + opportunity.id + '">' +
        (joinedAlready ? 'Participação registrada.' : ' ') +
      '</div>' +
      '</article>';
  }).join('');

  body.innerHTML =
    '<div class="opportunity-hero"><strong>Crie. Participe. Encontre oportunidades.</strong><span>O PULSO está preparando um espaço para campanhas, desafios e trabalhos criativos. Valores só aparecem quando uma oportunidade real estiver definida.</span></div>' +
    (cards || '<div class="opportunity-empty"><strong>Nenhuma oportunidade ativa ainda.</strong><span>Em breve este espaço receberá campanhas e desafios reais.</span></div>');

  body.querySelectorAll('[data-opportunity]').forEach((button) => {
    button.onclick = () => joinOpportunity(button.dataset.opportunity, button, uid);
  });
}

async function joinOpportunity(id, button, uid) {
  if (!uid) {
    document.getElementById('loginBtn')?.click();
    return;
  }

  const msg = document.getElementById('opmsg-' + id);
  button.disabled = true;
  button.textContent = 'Entrando...';
  if (msg) msg.textContent = '';

  const { error } = await sb
    .from('pulso_opportunity_entries')
    .insert({ opportunity_id: id, user_id: uid });

  if (error) {
    if (error.code === '23505') {
      button.textContent = '✓ Você já está participando';
      if (msg) msg.textContent = 'Participação já registrada.';
    } else {
      button.disabled = false;
      button.textContent = 'Quero participar';
      if (msg) msg.textContent = 'Não foi possível registrar agora.';
    }
    return;
  }

  button.textContent = '✓ Participando';
  if (msg) msg.textContent = 'Sua participação foi registrada no PULSO.';
}

function closeOpportunities() {
  const modal = document.getElementById('opportunitiesModal');
  if (modal) modal.hidden = true;
}

function boot() {
  const button = document.getElementById('opportunitiesBtn');
  if (button) button.onclick = openOpportunities;

  document.getElementById('opportunitiesClose')?.addEventListener('click', closeOpportunities);
  document.getElementById('opportunitiesModal')?.addEventListener('click', (event) => {
    if (event.target.id === 'opportunitiesModal') closeOpportunities();
  });

  window.pulsoOpenOpportunities = openOpportunities;
}

async function openWallet() {
  const modal = document.getElementById('opportunitiesModal');
  const body = document.getElementById('opportunitiesBody');
  const title = document.getElementById('opportunitiesTitle');

  if (!modal || !body) return;

  modal.hidden = false;
  if (title) title.textContent = '💰 Minha carteira';

  const { data: session } = await sb.auth.getSession();
  const uid = session?.session?.user?.id;

  if (!uid) {
    body.innerHTML = '<div class="opportunity-empty"><strong>Entre no PULSO para acessar sua carteira.</strong></div>';
    return;
  }

  const { data: rows, error } = await sb
    .from('pulso_wallet_ledger')
    .select('amount,currency,status,description,created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    body.innerHTML = '<div class="opportunity-empty"><strong>Não foi possível carregar sua carteira.</strong></div>';
    return;
  }

  const available = (rows || [])
    .filter((row) => row.status === 'available')
    .reduce((total, row) => total + Number(row.amount), 0);

  const pending = (rows || [])
    .filter((row) => row.status === 'pending')
    .reduce((total, row) => total + Number(row.amount), 0);

  const formatMoney = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const ledger = (rows || []).map((row) =>
    '<div class="wallet-row"><strong>' +
    esc(row.description || row.status) +
    '</strong><span>' +
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: row.currency || 'BRL'
    }).format(Number(row.amount)) +
    '</span></div>'
  ).join('');

  body.innerHTML =
    '<div class="wallet-hero"><span>Saldo disponível</span><strong>' +
    formatMoney(available) +
    '</strong><small>Pendente: ' +
    formatMoney(pending) +
    '</small></div>' +
    '<div class="opportunity-hero"><strong>Como funciona</strong><span>Ganhos só entram aqui quando uma oportunidade, campanha ou outra fonte de receita gerar um lançamento confirmado. Nenhum saldo fictício é criado.</span></div>' +
    (ledger || '<div class="opportunity-empty"><strong>Ainda não há lançamentos.</strong><span>Participe das oportunidades para começar sua trajetória.</span></div>');
}

window.pulsoOpenWallet = openWallet;
window.pulsoOpenOpportunities = openOpportunities;

boot();
