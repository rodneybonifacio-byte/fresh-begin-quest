// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

async function probe(token: string, path: string) {
  const r = await fetch(`${BASE_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const txt = await r.text();
  let j: any = null; try { j = JSON.parse(txt); } catch {}
  const items = Array.isArray(j) ? j : (j?.data || j?.emissoes || j?.items || []);
  return { status: r.status, count: Array.isArray(items) ? items.length : 0, total: j?.meta?.total || j?.total || null, raw: txt.slice(0, 250) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const { paths: customPaths, clienteId } = body || {};
    const token = await getAdminTokenCached();
    const paths = customPaths || [
      `/clientes?limit=100&offset=0`,
      `/clientes?limit=100&offset=100`,
      `/clientes?limit=100&offset=200`,
      `/clientes?limit=100&offset=500`,
      `/clientes?limit=100&offset=1000`,
      `/clientes?limit=100&page=2`,
    ];
    const out: any = {};
    for (const p of paths) out[p] = await probe(token, p);
    return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
