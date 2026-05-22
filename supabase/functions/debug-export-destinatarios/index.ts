// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { clienteIds, maxOffset = 30000, concurrency = 8 } = await req.json();
    if (!Array.isArray(clienteIds) || !clienteIds.length) {
      return new Response(JSON.stringify({ error: 'clienteIds[] requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = await getAdminTokenCached();
    const wanted = new Set<string>(clienteIds);

    const limit = 100;
    const results: Record<string, Map<string, any>> = {};
    for (const id of clienteIds) results[id] = new Map();
    let totalScanned = 0;
    let stop = false;

    let offset = 0;
    while (!stop && offset < maxOffset) {
      const batch = Array.from({ length: concurrency }, (_, i) => offset + i * limit);
      const responses = await Promise.all(batch.map(async (off) => {
        const r = await fetch(`${BASE_API_URL}/emissoes?limit=${limit}&offset=${off}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) return { off, items: [], err: r.status };
        const d = await r.json();
        return { off, items: (d.data || d || []) as any[] };
      }));
      for (const { items } of responses) {
        if (!items.length) { stop = true; continue; }
        totalScanned += items.length;
        for (const e of items) {
          const ecid = e.cliente?.id || e.clienteId || e.cliente_id;
          if (ecid && wanted.has(ecid) && e.destinatario && e.destinatario.id) {
            results[ecid].set(e.destinatario.id, e.destinatario);
          }
        }
        if (items.length < limit) stop = true;
      }
      offset += limit * concurrency;
    }

    const out: any = { total_scanned: totalScanned, last_offset: offset, clientes: {} };
    for (const id of clienteIds) {
      const arr = Array.from(results[id].values());
      out.clientes[id] = { total: arr.length, data: arr };
    }
    return new Response(JSON.stringify(out), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
