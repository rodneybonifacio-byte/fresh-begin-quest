// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

/**
 * API Externa - Gerar PIX para Recarga de Crédito
 * 
 * Autenticação via API Key no header: X-API-Key
 * 
 * Endpoint:
 * POST /api-gerar-pix-recarga
 * {
 *   clienteId: "UUID",
 *   valor: 100.00,
 *   expiracao?: 3600, // segundos (padrão: 1 hora)
 *   referencia?: "ORDER-12345" // ID externo opcional
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   data: {
 *     transacaoId: "UUID",
 *     txid: "string",
 *     pixCopiaECola: "00020126...",
 *     qrCodeBase64: "data:image/png;base64,...",
 *     valor: 100.00,
 *     expiraEm: "2024-01-20T15:00:00Z",
 *     referencia: "ORDER-12345"
 *   }
 * }
 * 
 * Fluxo:
 * 1. Sistema externo chama este endpoint
 * 2. Retorna QR Code PIX para pagamento
 * 3. Quando pago, webhook banco-inter-webhook adiciona crédito automaticamente
 */

// Validar API Key
async function validateApiKey(req: Request): Promise<{ valid: boolean; error?: string }> {
  const apiKey = req.headers.get('x-api-key') || req.headers.get('X-API-Key');
  
  if (!apiKey) {
    return { valid: false, error: 'API Key não fornecida. Use o header X-API-Key.' };
  }

  const validApiKey = Deno.env.get('BRHUB_EXTERNAL_API_KEY');
  
  if (!validApiKey) {
    console.error('❌ BRHUB_EXTERNAL_API_KEY não configurada');
    return { valid: false, error: 'Erro de configuração do servidor' };
  }

  if (apiKey !== validApiKey) {
    console.warn('⚠️ API Key inválida - tentativa de acesso bloqueada');
    return { valid: false, error: 'API Key inválida' };
  }

  return { valid: true };
}

// Formatar certificado PEM
function formatPemCert(cert: string, type: 'CERTIFICATE' | 'PRIVATE KEY'): string {
  let cleanCert = cert.replace(/-----BEGIN .*?-----/g, '')
                      .replace(/-----END .*?-----/g, '')
                      .replace(/\s/g, '');
  
  const lines = cleanCert.match(/.{1,64}/g) || [];
  return `-----BEGIN ${type}-----\n${lines.join('\n')}\n-----END ${type}-----`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Método não permitido. Use POST.',
        code: 'METHOD_NOT_ALLOWED'
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('🔐 API Gerar PIX Recarga - Validando autenticação...');

    // Validar API Key
    const { valid, error: authError } = await validateApiKey(req);
    
    if (!valid) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError, code: 'UNAUTHORIZED' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { clienteId, valor, expiracao = 3600, referencia } = body;

    // Validações
    if (!clienteId) {
      return new Response(
        JSON.stringify({ success: false, error: 'clienteId é obrigatório', code: 'MISSING_PARAMETER' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clienteId)) {
      return new Response(
        JSON.stringify({ success: false, error: 'clienteId deve ser um UUID válido', code: 'INVALID_PARAMETER' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!valor || typeof valor !== 'number' || valor <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'valor deve ser um número maior que zero', code: 'INVALID_PARAMETER' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (valor > 50000) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valor máximo por transação: R$ 50.000,00', code: 'LIMIT_EXCEEDED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('💰 Gerando PIX para recarga:', { clienteId, valor, referencia });

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se cliente existe
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('id', clienteId)
      .maybeSingle();

    if (clienteError || !cliente) {
      return new Response(
        JSON.stringify({ success: false, error: 'Cliente não encontrado', code: 'CLIENT_NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar duplicidade por referência
    if (referencia) {
      const { data: existente } = await supabase
        .from('recargas_pix')
        .select('id, txid, pix_copia_cola, qr_code_base64, data_expiracao, status')
        .eq('cliente_id', clienteId)
        .eq('referencia_externa', referencia)
        .maybeSingle();

      if (existente) {
        console.log('⚠️ PIX duplicado detectado:', referencia);
        
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              transacaoId: existente.id,
              txid: existente.txid,
              pixCopiaECola: existente.pix_copia_cola,
              qrCodeBase64: existente.qr_code_base64,
              valor,
              expiraEm: existente.data_expiracao,
              status: existente.status,
              referencia,
              duplicado: true,
              mensagem: 'PIX já gerado anteriormente'
            }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Obter credenciais do Banco Inter
    const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
    const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');
    const pixKey = Deno.env.get('BANCO_INTER_PIX_KEY');
    const certPem = Deno.env.get('BANCO_INTER_CERT');
    const keyPem = Deno.env.get('BANCO_INTER_KEY');

    // Modo simulação se credenciais não configuradas
    const isSimulationMode = !clientId || !clientSecret || !certPem || !keyPem;

    if (isSimulationMode) {
      console.log('⚠️ Modo simulação - credenciais Banco Inter não configuradas');
      
      const txid = `SIM${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const dataExpiracao = new Date(Date.now() + expiracao * 1000).toISOString();
      const pixSimulado = `00020126580014br.gov.bcb.pix0136${txid}5204000053039865802BR5925BRHUB SIMULACAO6009SAO PAULO62070503***6304`;

      // Salvar no banco
      const { data: recarga, error: insertError } = await supabase
        .from('recargas_pix')
        .insert({
          cliente_id: clienteId,
          valor,
          txid,
          pix_copia_cola: pixSimulado,
          qr_code_base64: null,
          data_expiracao: dataExpiracao,
          status: 'ATIVA',
          referencia_externa: referencia || null
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao salvar recarga:', insertError);
        throw new Error('Erro ao processar recarga');
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            transacaoId: recarga.id,
            txid,
            pixCopiaECola: pixSimulado,
            qrCodeBase64: null,
            valor,
            expiraEm: dataExpiracao,
            referencia: referencia || null,
            simulacao: true,
            mensagem: 'PIX em modo simulação - configure credenciais Banco Inter para produção'
          }
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Produção - Integração real com Banco Inter
    console.log('🏦 Gerando PIX via Banco Inter...');

    const formattedCert = formatPemCert(certPem, 'CERTIFICATE');
    const formattedKey = formatPemCert(keyPem, 'PRIVATE KEY');

    const httpClient = Deno.createHttpClient({
      caCerts: [],
      cert: formattedCert,
      key: formattedKey,
    });

    // Obter token de acesso
    const tokenResponse = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'cob.write cob.read pix.read pix.write webhook.read webhook.write',
        grant_type: 'client_credentials',
      }),
      client: httpClient,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Erro ao obter token:', errorText);
      throw new Error('Falha na autenticação com Banco Inter');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Gerar txid único
    const txid = `BRHUB${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const dataExpiracao = new Date(Date.now() + expiracao * 1000).toISOString();

    // Configurar webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/banco-inter-webhook`;
    try {
      await fetch(`https://cdpj.partners.bancointer.com.br/pix/v2/webhook/${pixKey}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ webhookUrl }),
        client: httpClient,
      });
    } catch (webhookError) {
      console.warn('⚠️ Erro ao configurar webhook (não crítico):', webhookError);
    }

    // Criar cobrança PIX
    const cobResponse = await fetch(`https://cdpj.partners.bancointer.com.br/pix/v2/cob/${txid}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        calendario: { expiracao },
        valor: { original: valor.toFixed(2) },
        chave: pixKey,
        solicitacaoPagador: referencia 
          ? `Recarga BRHUB - Ref: ${referencia}` 
          : 'Recarga de créditos BRHUB',
      }),
      client: httpClient,
    });

    if (!cobResponse.ok) {
      const errorText = await cobResponse.text();
      console.error('❌ Erro ao criar cobrança:', errorText);
      throw new Error('Falha ao criar cobrança PIX');
    }

    const cobData = await cobResponse.json();
    const pixCopiaECola = cobData.pixCopiaECola;
    const location = cobData.location;

    // Obter QR Code
    let qrCodeBase64 = null;
    if (location) {
      try {
        const qrResponse = await fetch(`${location}/qrcode`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${accessToken}` },
          client: httpClient,
        });
        
        if (qrResponse.ok) {
          const qrData = await qrResponse.json();
          qrCodeBase64 = qrData.imagemQrcode;
        }
      } catch (qrError) {
        console.warn('⚠️ Erro ao obter QR Code:', qrError);
      }
    }

    // Salvar no banco
    const { data: recarga, error: insertError } = await supabase
      .from('recargas_pix')
      .insert({
        cliente_id: clienteId,
        valor,
        txid,
        pix_copia_cola: pixCopiaECola,
        qr_code_base64: qrCodeBase64,
        data_expiracao: dataExpiracao,
        status: 'ATIVA',
        referencia_externa: referencia || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erro ao salvar recarga:', insertError);
      throw new Error('Erro ao processar recarga');
    }

    console.log('✅ PIX gerado com sucesso:', { txid, transacaoId: recarga.id });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transacaoId: recarga.id,
          txid,
          pixCopiaECola,
          qrCodeBase64,
          valor,
          expiraEm: dataExpiracao,
          referencia: referencia || null
        }
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Erro na API:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
