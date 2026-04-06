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

    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.token || loginData?.data?.token;
    if (!token) throw new Error('Falha no login');

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

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

    // Process by state - fields are at root level of each emission
    const byState: Record<string, any[]> = {};
    for (const e of allEmissoes) {
      const dest = e.destinatario || {};
      const endereco = dest.endereco || {};
      const uf = endereco.uf || e.destinatarioUf || 'N/D';

      const cepDest = endereco.cep || e.destinatarioCep || '';
      const cepRem = e.remetenteCep || e.remetente?.cep || '';

      // Weight and dimensions are at root level
      const peso = e.peso || 0;
      const altura = e.altura || 0;
      const largura = e.largura || 0;
      const comprimento = e.comprimento || 0;

      if (!byState[uf]) byState[uf] = [];
      byState[uf].push({
        codigo: e.codigoObjeto || '',
        status: e.status || '',
        servico: e.servico || '',
        transportadora: e.transportadora || '',
        remetente: e.remetenteNome || e.remetente?.nome || '',
        remetenteCpfCnpj: e.remetenteCpfCnpj || e.remetente?.cpfCnpj || '',
        remetenteCep: cepRem,
        remetenteUf: e.remetenteUf || e.remetente?.uf || '',
        remetenteCidade: e.remetenteLocalidade || e.remetente?.localidade || '',
        destinatario: dest.nome || '',
        destCpfCnpj: dest.cpfCnpj || '',
        destTelefone: dest.telefone || dest.celular || '',
        destEmail: dest.email || '',
        cepDestino: cepDest,
        cidade: endereco.localidade || '',
        bairro: endereco.bairro || '',
        uf,
        peso,
        pesoKg: peso > 0 ? Math.round(peso / 100) / 10 : 0,
        altura,
        largura,
        comprimento,
        cubagem: altura > 0 && largura > 0 && comprimento > 0
          ? Math.round(altura * largura * comprimento) : 0,
        valorFrete: e.valor || 0,
        valorPostagem: e.valorPostagem || 0,
        valorDeclarado: e.valorDeclarado || 0,
        valorNF: e.valorNotaFiscal || 0,
        chaveNFe: e.chaveNFe || '',
        numeroNF: e.numeroNotaFiscal || '',
        volumes: e.volumes || 1,
        data: e.criadoEm || '',
        clienteNome: e.cliente?.nome || '',
        clienteId: e.cliente?.id || e.clienteId || '',
      });
    }

    // Build summary
    const summary = Object.keys(byState).sort().map(uf => {
      const items = byState[uf];
      const ceps = items.map(i => i.cepDestino).filter(Boolean);
      const pesos = items.map(i => i.peso).filter(Boolean);
      const fretes = items.map(i => Number(i.valorFrete)).filter(Boolean);
      return {
        uf,
        qtd: items.length,
        cepMin: ceps.length ? ceps.sort()[0] : '',
        cepMax: ceps.length ? ceps.sort()[ceps.length - 1] : '',
        pesoMedioG: pesos.length ? Math.round(pesos.reduce((a, b) => a + b, 0) / pesos.length) : 0,
        pesoMinG: pesos.length ? Math.min(...pesos) : 0,
        pesoMaxG: pesos.length ? Math.max(...pesos) : 0,
        freteMedio: fretes.length ? Math.round(fretes.reduce((a, b) => a + b, 0) / fretes.length * 100) / 100 : 0,
        freteTotal: fretes.length ? Math.round(fretes.reduce((a, b) => a + b, 0) * 100) / 100 : 0,
      };
    });

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
