// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
const NEXX_ID = 'c620629a-0f6f-4cfc-9bef-3a8bdbd122eb';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const token = await getAdminTokenCached();
    const all: any[] = [];
    for (let off = 0; off < 10000; off += 100) {
      const r = await fetch(`${BASE}/emissoes/admin?clienteId=${NEXX_ID}&limit=100&offset=${off}`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await r.json(); const arr = (d.data || d || []) as any[];
      if (!arr.length) break;
      all.push(...arr);
      if (arr.length < 100) break;
    }
    const rod = all.filter(e => {
      const t = JSON.stringify({ a: e.transportadora, b: e.cotacao?.transportadora, c: e.servico, d: e.cotacao?.servico }).toLowerCase();
      return t.includes('rodo') || t.includes('rte');
    });
    return new Response(JSON.stringify({
      total: all.length,
      rodonaves_count: rod.length,
      rodonaves: rod.map(e => ({
        id: e.id, codigoObjeto: e.codigoObjeto, valor: e.valor, valorPostagem: e.valorPostagem,
        status: e.status, statusFaturamento: e.statusFaturamento, criadoEm: e.criadoEm,
        transportadora: e.transportadora || e.cotacao?.transportadora,
        destinatario: e.destinatario?.nome, cpfCnpj: e.destinatario?.cpfCnpj,
        cidade: e.destinatario?.endereco?.localidade, uf: e.destinatario?.endereco?.uf,
      })),
    }, null, 2), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
