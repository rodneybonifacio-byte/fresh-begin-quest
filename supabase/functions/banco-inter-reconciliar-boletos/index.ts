// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function formatPemCert(pemString: string): string {
  let cleaned = pemString.trim();
  if (cleaned.includes('\n')) return cleaned;
  const beginMatch = cleaned.match(/(-----BEGIN [^-]+-----)/);
  const endMatch = cleaned.match(/(-----END [^-]+-----)/);
  if (!beginMatch || !endMatch) return pemString;
  const header = beginMatch[0];
  const footer = endMatch[0];
  const content = cleaned.substring(cleaned.indexOf(header) + header.length, cleaned.indexOf(footer)).replace(/\s/g, '');
  const formatted = content.match(/.{1,64}/g)?.join('\n') || content;
  return `${header}\n${formatted}\n${footer}`;
}

function createMtlsClient() {
  return Deno.createHttpClient({
    cert: formatPemCert(Deno.env.get('BANCO_INTER_CLIENT_CERT')!),
    key: formatPemCert(Deno.env.get('BANCO_INTER_CLIENT_KEY')!),
    caCerts: [formatPemCert(Deno.env.get('BANCO_INTER_CA_CERT')!)],
  });
}

async function getAccessToken(httpClient: Deno.HttpClient): Promise<string> {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID')!;
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET')!;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'boleto-cobranca.read boleto-cobranca.write',
    grant_type: 'client_credentials',
  });

  const response = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    client: httpClient,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function consultarBoleto(httpClient: Deno.HttpClient, accessToken: string, codigoSolicitacao: string): Promise<any> {
  const url = `https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${codigoSolicitacao}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    client: httpClient,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Erro ao consultar boleto ${codigoSolicitacao}: ${response.status} - ${errorText}`);
    return null;
  }

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Iniciando reconciliação de boletos...');

    // Buscar todos os fechamentos pendentes com boleto_id
    const { data: pendentes, error: fetchErr } = await supabase
      .from('fechamentos_fatura')
      .select('*')
      .eq('status_pagamento', 'PENDENTE')
      .not('boleto_id', 'is', null);

    if (fetchErr) throw fetchErr;

    if (!pendentes || pendentes.length === 0) {
      console.log('✅ Nenhum boleto pendente encontrado');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum boleto pendente', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📋 ${pendentes.length} boletos pendentes encontrados`);

    // Autenticar com Inter
    const httpClient = createMtlsClient();
    const accessToken = await getAccessToken(httpClient);
    console.log('🔑 Token obtido com sucesso');

    // Buscar credenciais da API para confirmar pagamento
    const baseApiUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    let apiToken: string | null = null;
    if (baseApiUrl && adminEmail && adminPassword) {
      const loginRes = await fetch(`${baseApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        apiToken = loginData.token;
      }
    }

    const results: any[] = [];
    let pagos = 0;
    let erros = 0;

    for (const fechamento of pendentes) {
      try {
        const boleto = await consultarBoleto(httpClient, accessToken, fechamento.boleto_id);
        
        if (!boleto) {
          erros++;
          results.push({ codigo_fatura: fechamento.codigo_fatura, status: 'ERRO_CONSULTA' });
          continue;
        }

        // Log full response for first boleto to understand structure
        if (pagos === 0 && erros === 0 && results.length === 0) {
          console.log('🔍 Resposta completa do primeiro boleto:', JSON.stringify(boleto, null, 2));
        }
        
        const situacao = boleto.situacao || boleto.situacaoCobranca || boleto.status || boleto.estadoAtual;
        console.log(`📄 ${fechamento.codigo_fatura} (${fechamento.nome_cliente}): ${situacao}`);

        // Situações que indicam pagamento: PAGO, RECEBIDO, BAIXADO
        if (situacao === 'PAGO' || situacao === 'RECEBIDO' || situacao === 'BAIXADO') {
          const valorPago = boleto.valorTotalRecebimento || boleto.valorPago || boleto.valorNominal;
          const dataPagamento = boleto.dataPagamento || boleto.dataRecebimento || new Date().toISOString().split('T')[0];

          console.log(`💰 PAGO! ${fechamento.codigo_fatura}: R$ ${valorPago}`);

          // Atualizar fechamento no Supabase
          await supabase
            .from('fechamentos_fatura')
            .update({
              status_pagamento: 'PAGO',
              data_pagamento: dataPagamento,
              valor_pago: valorPago,
            })
            .eq('id', fechamento.id);

          // Confirmar pagamento na API externa
          if (apiToken && baseApiUrl) {
            try {
              const faturaRes = await fetch(
                `${baseApiUrl}/faturas/admin?codigo=${fechamento.codigo_fatura}`,
                { headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' } }
              );
              
              if (faturaRes.ok) {
                const faturaData = await faturaRes.json();
                if (faturaData.data && faturaData.data.length > 0) {
                  const fatura = faturaData.data[0];
                  
                  const formData = new FormData();
                  formData.append('valorPago', String(valorPago));
                  formData.append('dataPagamento', dataPagamento);
                  formData.append('observacao', `Pagamento via boleto - Reconciliação automática - Nosso Número: ${fechamento.boleto_id}`);
                  
                  const confirmRes = await fetch(
                    `${baseApiUrl}/faturas/${fatura.id}/confirma-pagamento`,
                    { method: 'POST', headers: { 'Authorization': `Bearer ${apiToken}` }, body: formData }
                  );
                  
                  if (confirmRes.ok) {
                    console.log(`✅ Pagamento confirmado na API para ${fechamento.codigo_fatura}`);
                  } else {
                    const errText = await confirmRes.text();
                    console.error(`⚠️ Erro ao confirmar na API: ${errText}`);
                  }
                }
              }
            } catch (apiErr) {
              console.error(`⚠️ Erro API para ${fechamento.codigo_fatura}:`, apiErr.message);
            }
          }

          pagos++;
          results.push({ codigo_fatura: fechamento.codigo_fatura, nome: fechamento.nome_cliente, status: 'PAGO', valor: valorPago });
        } else {
          results.push({ codigo_fatura: fechamento.codigo_fatura, nome: fechamento.nome_cliente, status: situacao });
        }

        // Rate limiting - 200ms entre requests
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`❌ Erro processando ${fechamento.codigo_fatura}:`, err.message);
        erros++;
        results.push({ codigo_fatura: fechamento.codigo_fatura, status: 'ERRO', erro: err.message });
      }
    }

    console.log(`🏁 Reconciliação finalizada: ${pagos} pagos, ${erros} erros, ${pendentes.length} total`);

    return new Response(
      JSON.stringify({
        success: true,
        total: pendentes.length,
        pagos,
        erros,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Erro na reconciliação:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
