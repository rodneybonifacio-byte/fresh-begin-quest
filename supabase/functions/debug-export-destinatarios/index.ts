// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { clienteNome, clienteId } = await req.json();
    const token = await getAdminTokenCached();

    let foundClienteId = clienteId;
    let foundCliente: any = null;

    if (!foundClienteId && clienteNome) {
      const r = await fetch(`${BASE_API_URL}/clientes?search=${encodeURIComponent(clienteNome)}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`clientes search ${r.status}`);
      const d = await r.json();
      const items: any[] = d.data || d || [];
      const lc = clienteNome.toLowerCase().replace(/\s+/g, '');
      const matchName = (c: any) => [c.nome, c.nomeFantasia, c.razaoSocial, c.nomeEmpresa, c.nomeResponsavel, c.email]
        .some((v: any) => (v || '').toLowerCase().replace(/\s+/g, '').includes(lc));
      const filtered = items.filter(matchName);
      if (filtered.length !== 1) {
        return new Response(JSON.stringify({
          ambiguous: true, total_raw: items.length, filtered_count: filtered.length,
          candidates: filtered.map((c: any) => ({ id: c.id, nome: c.nomeEmpresa || c.nome, cpfCnpj: c.cpfCnpj, email: c.email })),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      foundCliente = filtered[0];
      foundClienteId = foundCliente?.id;
    }

    if (!foundClienteId) {
      return new Response(JSON.stringify({ error: 'cliente não encontrado' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair destinatarios únicos a partir das emissões do cliente
    const destMap = new Map<string, any>();
    let offset = 0;
    const limit = 100;
    let totalEmissoes = 0;
    while (true) {
      const url = `${BASE_API_URL}/emissoes?clienteId=${foundClienteId}&limit=${limit}&offset=${offset}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`emissoes ${r.status}: ${(await r.text()).slice(0,300)}`);
      const d = await r.json();
      const items: any[] = d.data || d || [];
      if (!items.length) break;
      for (const e of items) {
        const ecid = e.cliente?.id || e.clienteId || e.cliente_id;
        if (ecid && ecid !== foundClienteId) continue;
        const dest = e.destinatario;
        if (dest && dest.id && !destMap.has(dest.id)) destMap.set(dest.id, dest);
      }
      totalEmissoes += items.length;
      if (items.length < limit) break;
      offset += limit;
      if (offset > 200000) break;
    }

    const data = Array.from(destMap.values());
    return new Response(JSON.stringify({ cliente: foundCliente, clienteId: foundClienteId, total: data.length, total_emissoes: totalEmissoes, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
