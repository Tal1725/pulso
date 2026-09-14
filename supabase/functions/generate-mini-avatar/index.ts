import { InferenceClient } from 'npm:@huggingface/inference';
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const styles: Record<string, string> = {
  classic: 'Transforme a pessoa da foto em um mini avatar 3D chibi premium para a rede social PULSO. Preserve fielmente os traços reconhecíveis da pessoa, formato do rosto, cabelo, barba, óculos, tom de pele e estilo da roupa. Cabeça levemente maior, corpo pequeno, aparência de personagem colecionável, corpo inteiro, expressão simpática, iluminação de estúdio, acabamento 3D moderno, fundo limpo em branco com detalhes magenta e azul. Sem texto, sem marca d’água, sem deformações.',
  glasses: 'Transforme a pessoa da foto em um mini avatar 3D chibi premium para a rede social PULSO. Preserve fielmente a identidade visual da pessoa e mantenha os óculos exatamente como característica principal, além de cabelo, barba, tom de pele e roupa. Cabeça levemente maior, corpo pequeno, corpo inteiro, expressão simpática, acabamento de personagem 3D colecionável, iluminação de estúdio, fundo limpo em branco com detalhes magenta e azul. Sem texto, sem marca d’água, sem deformações.',
  creator: 'Transforme a pessoa da foto em um mini avatar 3D chibi premium de creator do PULSO. Preserve fielmente os traços reconhecíveis, cabelo, barba, óculos, tom de pele e roupa. Corpo inteiro, cabeça levemente maior, pose confiante e simpática, segurando um pequeno smartphone, acabamento 3D de personagem colecionável, iluminação de estúdio, fundo limpo em branco com detalhes magenta e azul. Sem texto, sem marca d’água, sem deformações.',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

function getSupabaseKeys() {
  const url = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || (() => {
    try { return JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default; } catch { return ''; }
  })();
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (() => {
    try { return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default; } catch { return ''; }
  })();
  return { url, anon, service };
}

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw new Error('Imagem inválida. Envie JPG, PNG ou WebP.');
  const mime = match[1];
  const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) return json({ error: 'Faça login no PULSO para usar a IA.' }, 401);

    const { url, anon, service } = getSupabaseKeys();
    if (!url || !anon || !service) return json({ error: 'A função do Mini Avatar ainda não está configurada no Supabase.' }, 500);

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Sessão inválida. Entre novamente no PULSO.' }, 401);
    const userId = userData.user.id;

    const hfToken = Deno.env.get('HF_TOKEN');
    if (!hfToken) return json({ error: 'A IA do Mini Avatar ainda precisa ser ativada pelo administrador do PULSO.' }, 503);

    const body = await req.json();
    const style = typeof body?.style === 'string' && styles[body.style] ? body.style : 'classic';
    const image = typeof body?.image === 'string' ? body.image : '';
    if (!image) return json({ error: 'Escolha uma foto primeiro.' }, 400);
    if (image.length > 11_000_000) return json({ error: 'A foto é grande demais. Tente uma imagem menor.' }, 413);

    const input = dataUrlToBlob(image);
    if (input.size > 8 * 1024 * 1024) return json({ error: 'A foto deve ter no máximo 8 MB.' }, 413);

    const hf = new InferenceClient(hfToken);
    const generated = await hf.imageToImage({
      data: input,
      model: 'black-forest-labs/FLUX.1-Kontext-dev',
      parameters: {
        prompt: styles[style],
        guidance_scale: 6,
        num_inference_steps: 28,
      },
    });

    if (!generated || generated.size === 0) throw new Error('A IA não retornou uma imagem.');

    const admin = createClient(url, service);
    const path = `${userId}/mini-avatar-ai-${Date.now()}.png`;
    const upload = await admin.storage.from('pulso-avatars').upload(path, generated, {
      contentType: 'image/png',
      cacheControl: '31536000',
      upsert: false,
    });
    if (upload.error) throw new Error(`Não foi possível salvar o avatar: ${upload.error.message}`);

    const avatarUrl = admin.storage.from('pulso-avatars').getPublicUrl(path).data.publicUrl;
    const update = await admin.from('profiles').update({ avatar_url: avatarUrl }).eq('id', userId);
    if (update.error) throw new Error(`Avatar salvo, mas o perfil não foi atualizado: ${update.error.message}`);

    return json({ ok: true, avatar_url: avatarUrl, style });
  } catch (error) {
    console.error('generate-mini-avatar', error);
    const message = error instanceof Error ? error.message : 'Erro inesperado ao gerar o avatar.';
    return json({ error: message }, 500);
  }
});
