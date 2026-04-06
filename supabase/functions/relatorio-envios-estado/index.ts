// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const baseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!baseUrl || !adminEmail || !adminPassword) {
      throw new Error('Configuração incompleta');
    }

    // Login
    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.token || loginData?.data?.token;
    if (!token) throw new Error('Falha no login');

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch all emissions since 2025-01-01
    const allEmissoes = [];
    const statuses = ['POSTADO', 'ENTREGUE', 'PRE_POSTADO', 'EM_TRANSITO', 'DEVOLVIDO', 'CANCELADO', 'SAIU_PARA_ENTREGA', 'AGUARDANDO_RETIRADA'];

    for (const status of statuses) {
      let offset = 0;
      const batchSize = 100;
      while (true) {
        const params = new URLSearchParams({
          limit: String(batchSize),
          offset: String(offset),
          dataIni: '2025-01-01',
          status,
        });
        const resp = await fetch(`${baseUrl}/emissoes/admin?${params}`, { headers });
        if (!resp.ok) break;
        const data = await resp.json();
        const items = data?.data || [];
        if (!items.length) break;
        allEmissoes.push(...items);
        if (items.length < batchSize) break;
        offset += batchSize;
        if (offset > 15000) break;
      }
    }

    // Process by state
    const byState: Record<string, any[]> = {};
    for (const e of allEmissoes) {
      const dest = e.destinatario || {};
      const endereco = dest.endereco || {};
      const uf = endereco.uf || e.destinatarioUf || 'N/D';
      const cep = endereco.cep || e.destinatarioCep || '';
      const embalagem = e.embalagem || e.cotacao?.embalagem || {};

      if (!byState[uf]) byState[uf] = [];
      byState[uf].push({
        codigo: e.codigoObjeto || '',
        status: e.status || '',
        servico: e.servico || '',
        transportadora: e.transportadora || '',
        remetente: e.remetenteNome || '',
        destinatario: dest.nome || '',
        cep,
        cidade: endereco.localidade || '',
        bairro: endereco.bairro || '',
        uf,
        peso: embalagem.peso || 0,
        altura: embalagem.altura || 0,
        largura: embalagem.largura || 0,
        comprimento: embalagem.comprimento || 0,
        valorFrete: e.valor || e.valorPostagem || 0,
        valorDeclarado: e.valorDeclarado || 0,
        data: e.criadoEm || '',
        remetenteCpfCnpj: e.remetenteCpfCnpj || '',
        destCpfCnpj: dest.cpfCnpj || '',
        destTelefone: dest.telefone || dest.celular || '',
        destEmail: dest.email || '',
        valorNF: e.valorNotaFiscal || 0,
        chaveNFe: e.chaveNFe || '',
        numeroNF: e.numeroNotaFiscal || '',
      });
    }

    // Build summary
    const summary = Object.keys(byState).sort().map(uf => {
      const items = byState[uf];
      const ceps = items.map(i => i.cep).filter(Boolean);
      const pesos = items.map(i => i.peso).filter(Boolean);
      const fretes = items.map(i => Number(i.valorFrete)).filter(Boolean);
      return {
        uf,
        qtd: items.length,
        cepMin: ceps.length ? ceps.sort()[0] : '',
        cepMax: ceps.length ? ceps.sort()[ceps.length - 1] : '',
        pesoMedio: pesos.length ? Math.round(pesos.reduce((a, b) => a + b, 0) / pesos.length) : 0,
        pesoMin: pesos.length ? Math.min(...pesos) : 0,
        pesoMax: pesos.length ? Math.max(...pesos) : 0,
        freteMedio: fretes.length ? Math.round(fretes.reduce((a, b) => a + b, 0) / fretes.length * 100) / 100 : 0,
        freteTotal: fretes.length ? Math.round(fretes.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
      };
    });

    // Flatten details
    const details = Object.keys(byState).sort().flatMap(uf => byState[uf]);

    return new Response(JSON.stringify({
      success: true,
      total: allEmissoes.length,
      totalEstados: Object.keys(byState).length,
      summary,
      details,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
