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
    const { searchNome, findByCnpj, maxOffset = 50000, concurrency = 8 } = body;
    let { clienteId } = body;
    const token = await getAdminTokenCached();
    if (!clienteId && (searchNome || findByCnpj)) {
      const cnpjLimpo = (findByCnpj || '').replace(/\D/g, '');
      const all: any[] = [];
      for (let off = 0; off < 10000; off += 100) {
        const r = await fetch(`${BASE_API_URL}/clientes?limit=100&offset=${off}&search=${encodeURIComponent(searchNome || findByCnpj || '')}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        const list = (d.data || d || []) as any[];
        if (!list.length) break;
        all.push(...list);
        if (list.length < 100) break;
        if (cnpjLimpo && list.some((c) => (c.cpfCnpj || '').replace(/\D/g, '') === cnpjLimpo)) break;
        if (searchNome && list.some((c) => ((c.nome || c.razaoSocial || c.nomeFantasia || '').toLowerCase().includes(searchNome.toLowerCase())))) break;
      }
      let hit: any = null;
      if (cnpjLimpo) hit = all.find((c) => (c.cpfCnpj || '').replace(/\D/g, '') === cnpjLimpo);
      else if (searchNome) {
        const matches = all.filter((c) => ((c.nome || c.razaoSocial || c.nomeFantasia || '').toLowerCase().includes(searchNome.toLowerCase())));
        if (matches.length === 1) hit = matches[0];
        else if (matches.length > 1) return new Response(JSON.stringify({ matches: matches.map((c: any) => ({ id: c.id, nome: c.nome || c.razaoSocial, cpfCnpj: c.cpfCnpj, email: c.email })) }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (!hit) return new Response(JSON.stringify({ error: 'cliente não encontrado', scanned: all.length }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      clienteId = hit.id;
    }
    if (!clienteId) return new Response(JSON.stringify({ error: 'clienteId, searchNome ou findByCnpj requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
