// Relatório de emissões filtrado por cliente/remetente/transportadora/período
// Uso pontual de geração de relatórios.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getAdminTokenCached } from '../_shared/adminTokenCache.ts';

const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';

async function getAdminToken(): Promise<string> {
  return await getAdminTokenCached();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      clienteId,
      remetenteCpfCnpj,
      transportadoraFiltro,
      dataIni,
      dataFim,
    } = body as {
      clienteId?: string;
      remetenteCpfCnpj?: string;
      transportadoraFiltro?: string;
      dataIni: string;
      dataFim: string;
    };

    const token = await getAdminToken();

    const all: any[] = [];
    let offset = 0;
    const limit = 100;
    while (true) {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
        dataIni,
        dataFim,
      });
      if (clienteId) params.set('clienteId', clienteId);

      const r = await fetch(`${BASE_API_URL}/emissoes/admin?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`BRHUB ${r.status}: ${txt.slice(0, 200)}`);
      }
      const d = await r.json();
      const items: any[] = d.data || d || [];
      if (!items.length) break;
      all.push(...items);
      if (items.length < limit) break;
      offset += limit;
      if (offset > 20000) break; // safety
    }

    // Filtros locais
    const norm = (s?: string) => (s || '').toLowerCase();
    const filtered = all.filter((e) => {
      const remCpf = (e.remetente?.cpfCnpj || e.remetenteCpfCnpj || '').replace(/\D/g, '');
      const okRem = !remetenteCpfCnpj || remCpf === remetenteCpfCnpj.replace(/\D/g, '');
      const okTransp = !transportadoraFiltro || norm(e.transportadora).includes(norm(transportadoraFiltro));
      return okRem && okTransp;
    });

    return new Response(
      JSON.stringify({ total: filtered.length, totalBruto: all.length, data: filtered }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
