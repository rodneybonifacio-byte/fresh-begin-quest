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
      const r = await fetch(`${BASE_API_URL}/clientes?search=${encodeURIComponent(clienteNome)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error(`clientes search ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const d = await r.json();
      const items: any[] = d.data || d || [];
      const filtered = items.filter((c: any) => (c.nome || '').toLowerCase().includes(clienteNome.toLowerCase()));
      if (filtered.length > 1) {
        return new Response(JSON.stringify({ ambiguous: true, candidates: filtered.map((c: any) => ({ id: c.id, nome: c.nome, cpfCnpj: c.cpfCnpj, email: c.email })) }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      foundCliente = filtered[0];
      foundClienteId = foundCliente?.id;
    }

    if (!foundClienteId) {
      return new Response(JSON.stringify({ error: 'cliente não encontrado', clienteNome }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // buscar destinatarios do cliente
    const all: any[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const url = `${BASE_API_URL}/clientes/${foundClienteId}/destinatarios?limit=${limit}&offset=${offset}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`destinatarios ${r.status}: ${txt.slice(0, 300)}`);
      }
      const d = await r.json();
      const items: any[] = d.data || d || [];
      if (!items.length) break;
      all.push(...items);
      if (items.length < limit) break;
      offset += limit;
      if (offset > 100000) break;
    }

    return new Response(JSON.stringify({ cliente: foundCliente, clienteId: foundClienteId, total: all.length, data: all }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
