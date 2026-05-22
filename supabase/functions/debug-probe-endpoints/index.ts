// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

async function tryEndpoint(token: string, path: string, extraHeaders: Record<string,string> = {}) {
  const r = await fetch(`${BASE_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}`, ...extraHeaders } });
  const txt = await r.text();
  let json: any = null;
  try { json = JSON.parse(txt); } catch {}
  const items: any[] = Array.isArray(json) ? json : (json?.data || []);
  return { status: r.status, count: items.length, firstName: items[0]?.nome, firstId: items[0]?.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { clienteId } = await req.json();
    const token = await getAdminTokenCached();
    const headerVariants: Record<string,Record<string,string>> = {
      none: {},
      'x-cliente-id': { 'x-cliente-id': clienteId },
      'X-Cliente-Id': { 'X-Cliente-Id': clienteId },
      'cliente-id': { 'cliente-id': clienteId },
      'clienteId': { 'clienteId': clienteId },
      'x-impersonate': { 'x-impersonate-cliente': clienteId },
    };
    const out: any = {};
    for (const [k, h] of Object.entries(headerVariants)) {
      out[k] = await tryEndpoint(token, `/clientes/destinatarios?clienteId=${clienteId}&limit=5`, h);
    }
    // Tentar gerar token impersonado
    const imp = await fetch(`${BASE_API_URL}/auth/impersonate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ clienteId }) });
    out._impersonate = { status: imp.status, body: (await imp.text()).slice(0, 200) };
    const imp2 = await fetch(`${BASE_API_URL}/clientes/${clienteId}/impersonate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    out._impersonate2 = { status: imp2.status, body: (await imp2.text()).slice(0, 200) };
    const imp3 = await fetch(`${BASE_API_URL}/auth/login-as/${clienteId}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    out._loginas = { status: imp3.status, body: (await imp3.text()).slice(0, 200) };
    return new Response(JSON.stringify(out, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
