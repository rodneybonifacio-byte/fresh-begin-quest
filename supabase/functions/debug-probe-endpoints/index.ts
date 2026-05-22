// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

async function tryEndpoint(token: string, path: string) {
  const r = await fetch(`${BASE_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const txt = await r.text();
  let json: any = null;
  try { json = JSON.parse(txt); } catch {}
  const items: any[] = Array.isArray(json) ? json : (json?.data || []);
  return { status: r.status, count: items.length, sample: items.slice(0, 2), raw: txt.slice(0, 400) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { clienteId } = await req.json();
    const token = await getAdminTokenCached();
    const variants = [
      `/destinatarios?clienteId=${clienteId}&limit=100`,
      `/destinatarios?clienteId=${clienteId}&limit=100&offset=0`,
      `/clientes/${clienteId}/destinatarios?limit=100`,
      `/clientes/destinatarios?clienteId=${clienteId}&limit=100&offset=100`,
      `/clientes/${clienteId}/remetentes?limit=100`,
    ];
    const out: any = {};
    for (const v of variants) {
      out[v] = await tryEndpoint(token, v);
    }
    return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
