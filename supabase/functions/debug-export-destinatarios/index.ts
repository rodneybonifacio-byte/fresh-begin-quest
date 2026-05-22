// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

async function fetchPage(token: string, clienteId: string, offset: number, limit = 100) {
  const r = await fetch(`${BASE_API_URL}/emissoes/admin?clienteId=${clienteId}&limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error(`${r.status}: ${(await r.text()).slice(0,200)}`);
  const d = await r.json();
  return (d.data || d || []) as any[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { searchNome, maxOffset = 50000, concurrency = 8 } = body;
    let { clienteId } = body;
    const token = await getAdminTokenCached();
    if (!clienteId && searchNome) {
      const r = await fetch(`${BASE_API_URL}/clientes?search=${encodeURIComponent(searchNome)}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json();
      const list = d.data || d || [];
      if (!list.length) return new Response(JSON.stringify({ error: 'cliente não encontrado', searchNome }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (list.length > 1) return new Response(JSON.stringify({ matches: list.map((c: any) => ({ id: c.id, nome: c.nome, cpfCnpj: c.cpfCnpj })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      clienteId = list[0].id;
    }
    if (!clienteId) return new Response(JSON.stringify({ error: 'clienteId ou searchNome requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const destMap = new Map<string, any>();
    const otherClientes = new Set<string>();
    let scanned = 0;
    let offset = 0;
    let stop = false;
    const limit = 100;
    while (!stop && offset < maxOffset) {
      const batch = Array.from({ length: concurrency }, (_, i) => offset + i * limit);
      const pages = await Promise.all(batch.map((off) => fetchPage(token, clienteId, off, limit).catch(() => [] as any[])));
      for (const items of pages) {
        if (!items.length) { stop = true; continue; }
        scanned += items.length;
        for (const e of items) {
          const ecid = e.cliente?.id || e.clienteId || e.cliente_id;
          if (ecid && ecid !== clienteId) { otherClientes.add(ecid); continue; }
          const dest = e.destinatario;
          if (dest && dest.id && !destMap.has(dest.id)) destMap.set(dest.id, dest);
        }
        if (items.length < limit) stop = true;
      }
      offset += limit * concurrency;
    }
    const data = Array.from(destMap.values());
    return new Response(JSON.stringify({ clienteId, scanned, last_offset: offset, total_destinatarios: data.length, other_clientes_seen: Array.from(otherClientes).slice(0, 5), data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
