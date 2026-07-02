// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const BASE = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
const norm = (s: any) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g,' ').toUpperCase().trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const { dataInicio, dataFim, remetenteNome = 'OPERA KIDS' } = await req.json();
    const token = await getAdminTokenCached();
    let all: any[] = [];
    let offset = 0;
    while (true) {
      const qs = new URLSearchParams({ dataInicio, dataFim, limit: '100', offset: String(offset) });
      const r = await fetch(`${BASE}/emissoes/admin?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(await r.text());
      const j = await r.json();
      const pg = j?.data || j || [];
      all = all.concat(pg);
      if (pg.length < 100) break;
      offset += 100;
    }
    const rN = norm(remetenteNome);
    const filtered = all.filter((e: any) => norm(e.remetenteNome || e.remetente?.nome) === rN);
    const slim = filtered.map((e: any) => ({
      id: e.id,
      codigoObjeto: e.codigoObjeto,
      criadoEm: e.criadoEm,
      valor: e.valor,
      valorPostagem: e.valorPostagem,
      destinatarioNome: e.destinatario?.nome || e.destinatarioNome,
      destinatarioCpfCnpj: e.destinatario?.cpfCnpj || e.destinatarioCpfCnpj,
      cep: e.destinatario?.cep || e.destinatario?.enderecoCep || '',
      logradouro: e.destinatario?.logradouro || e.destinatario?.rua || '',
      numero: e.destinatario?.numero || '',
      bairro: e.destinatario?.bairro || '',
      cidade: e.destinatario?.cidade || '',
      uf: e.destinatario?.uf || '',
    }));
    return new Response(JSON.stringify({ total: slim.length, emissoes: slim }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type':'application/json' } });
  }
});
