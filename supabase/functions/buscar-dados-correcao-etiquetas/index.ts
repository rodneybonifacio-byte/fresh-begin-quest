// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Lista de códigos das etiquetas que foram corrigidas
const ETIQUETAS_CORRIGIDAS = [
  { codigoObjeto: "AB965896365BR", valorAnterior: 10.94, valorCobrado: 20.65, novoValorVenda: 22.72, diferenca: 11.78, status: 'sucesso' },
  { codigoObjeto: "AB971210320BR", valorAnterior: 20.16, valorCobrado: 28.52, novoValorVenda: 31.37, diferenca: 11.21, status: 'sucesso' },
  { codigoObjeto: "AB965890362BR", valorAnterior: 0.00, valorCobrado: 8.34, novoValorVenda: 9.17, diferenca: 9.17, status: 'sucesso' },
  { codigoObjeto: "AB969682691BR", valorAnterior: 10.09, valorCobrado: 80.72, novoValorVenda: 88.79, diferenca: 78.70, status: 'sucesso' },
  { codigoObjeto: "AN528395430BR", valorAnterior: 9.18, valorCobrado: 70.34, novoValorVenda: 77.37, diferenca: 68.19, status: 'sucesso' },
  { codigoObjeto: "AN524568378BR", valorAnterior: 112.31, valorCobrado: 172.62, novoValorVenda: 189.88, diferenca: 77.57, status: 'sucesso' },
  { codigoObjeto: "AB974963054BR", valorAnterior: 7.87, valorCobrado: 65.95, novoValorVenda: 72.55, diferenca: 64.68, status: 'sucesso' },
  { codigoObjeto: "AB953665687BR", valorAnterior: 4.80, valorCobrado: 48.68, novoValorVenda: 53.55, diferenca: 48.75, status: 'sucesso' },
  { codigoObjeto: "AB961311743BR", valorAnterior: 4.04, valorCobrado: 44.25, novoValorVenda: 48.68, diferenca: 44.64, status: 'sucesso' },
  { codigoObjeto: "AN530142496BR", valorAnterior: 3.15, valorCobrado: 35.11, novoValorVenda: 38.62, diferenca: 35.47, status: 'sucesso' },
  { codigoObjeto: "AN535239789BR", valorAnterior: 3.21, valorCobrado: 28.66, novoValorVenda: 31.53, diferenca: 28.32, status: 'sucesso' },
  { codigoObjeto: "AB972179277BR", valorAnterior: 16.55, valorCobrado: 41.09, novoValorVenda: 45.20, diferenca: 28.65, status: 'sucesso' },
  { codigoObjeto: "AN523640252BR", valorAnterior: 2.83, valorCobrado: 25.82, novoValorVenda: 28.40, diferenca: 25.57, status: 'sucesso' },
  { codigoObjeto: "AB968310787BR", valorAnterior: 3.31, valorCobrado: 25.35, novoValorVenda: 27.89, diferenca: 24.58, status: 'sucesso' },
  { codigoObjeto: "AN524180380BR", valorAnterior: 86.91, valorCobrado: 108.25, novoValorVenda: 119.08, diferenca: 32.17, status: 'sucesso' },
  { codigoObjeto: "AN527428318BR", valorAnterior: 3.46, valorCobrado: 23.74, novoValorVenda: 26.11, diferenca: 22.65, status: 'sucesso' },
  { codigoObjeto: "AB963754951BR", valorAnterior: 53.54, valorCobrado: 56.53, novoValorVenda: 62.18, diferenca: 8.64, status: 'sucesso' },
  { codigoObjeto: "AN531728185BR", valorAnterior: 3.41, valorCobrado: 22.62, novoValorVenda: 24.88, diferenca: 21.47, status: 'sucesso' },
  { codigoObjeto: "AN530140570BR", valorAnterior: 4.27, valorCobrado: 22.62, novoValorVenda: 24.88, diferenca: 20.61, status: 'sucesso' },
  { codigoObjeto: "AB961624503BR", valorAnterior: 1.97, valorCobrado: 16.38, novoValorVenda: 18.02, diferenca: 16.05, status: 'sucesso' },
  { codigoObjeto: "AB965899503BR", valorAnterior: 2.73, valorCobrado: 15.16, novoValorVenda: 16.68, diferenca: 13.95, status: 'sucesso' },
  { codigoObjeto: "AB975834762BR", valorAnterior: 1.97, valorCobrado: 14.03, novoValorVenda: 15.43, diferenca: 13.46, status: 'sucesso' },
  { codigoObjeto: "AN528617879BR", valorAnterior: 206.08, valorCobrado: 216.98, novoValorVenda: 238.68, diferenca: 32.60, status: 'sucesso' },
  { codigoObjeto: "AB960997910BR", valorAnterior: 39.73, valorCobrado: 40.15, novoValorVenda: 44.17, diferenca: 4.44, status: 'sucesso' },
  { codigoObjeto: "AB959960387BR", valorAnterior: 9.17, valorCobrado: 9.35, novoValorVenda: 10.29, diferenca: 1.12, status: 'sucesso' },
  // Erros - já foram faturadas
  { codigoObjeto: "AN512643584BR", valorAnterior: 10.37, valorCobrado: 60.57, novoValorVenda: 66.63, diferenca: 56.26, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB952262942BR", valorAnterior: 77.58, valorCobrado: 79.62, novoValorVenda: 87.58, diferenca: 10.00, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB951440195BR", valorAnterior: 31.47, valorCobrado: 46.73, novoValorVenda: 51.40, diferenca: 19.93, status: 'erro', mensagemErro: 'Já foi faturado' },
  { codigoObjeto: "AB951971018BR", valorAnterior: 31.47, valorCobrado: 42.34, novoValorVenda: 46.57, diferenca: 15.10, status: 'erro', mensagemErro: 'Já foi faturado' },
];

async function getAdminToken(): Promise<string> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  const API_ADMIN_EMAIL = Deno.env.get('API_ADMIN_EMAIL');
  const API_ADMIN_PASSWORD = Deno.env.get('API_ADMIN_PASSWORD');

  const loginResponse = await fetch(`${BASE_API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: API_ADMIN_EMAIL, password: API_ADMIN_PASSWORD }),
  });

  if (!loginResponse.ok) {
    throw new Error(`Falha no login admin: ${loginResponse.status}`);
  }

  const loginData = await loginResponse.json();
  return loginData.token || loginData.accessToken;
}

async function buscarEmissaoPorCodigo(codigoObjeto: string, token: string): Promise<any | null> {
  const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
  
  const searchParams = new URLSearchParams({
    codigoObjeto: codigoObjeto,
    limit: '1',
    offset: '0',
  });

  const response = await fetch(`${BASE_API_URL}/emissoes/admin?${searchParams.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`Erro ao buscar ${codigoObjeto}: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const emissoes = data.data || data;
  
  if (Array.isArray(emissoes) && emissoes.length > 0) {
    return emissoes[0];
  }
  
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`📋 Buscando dados de ${ETIQUETAS_CORRIGIDAS.length} etiquetas corrigidas`);

    // Login admin
    const adminToken = await getAdminToken();
    console.log('✅ Login admin realizado');

    const resultados: any[] = [];

    // Buscar dados de cada etiqueta
    for (const etiqueta of ETIQUETAS_CORRIGIDAS) {
      const emissao = await buscarEmissaoPorCodigo(etiqueta.codigoObjeto, adminToken);
      
      resultados.push({
        codigoObjeto: etiqueta.codigoObjeto,
        emissaoId: emissao?.id || '',
        valorAnterior: etiqueta.valorAnterior,
        valorCobrado: etiqueta.valorCobrado,
        novoValorVenda: etiqueta.novoValorVenda,
        diferenca: etiqueta.diferenca,
        status: etiqueta.status,
        mensagemErro: etiqueta.mensagemErro || null,
        // Dados do remetente
        remetenteNome: emissao?.remetente?.nome || emissao?.remetenteNome || 'N/A',
        remetenteCpfCnpj: emissao?.remetente?.cpfCnpj || emissao?.remetenteCpfCnpj || '',
        // Dados do cliente
        clienteNome: emissao?.cliente?.nome || 'N/A',
        clienteId: emissao?.cliente?.id || emissao?.clienteId || '',
      });

      // Delay para não sobrecarregar API
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    console.log(`✅ Dados de ${resultados.length} etiquetas carregados`);

    return new Response(
      JSON.stringify({
        success: true,
        total: resultados.length,
        data: resultados,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
