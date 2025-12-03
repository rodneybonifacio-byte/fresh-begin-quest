// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(clientCert: string, clientKey: string) {
  const clientId = Deno.env.get('BANCO_INTER_CLIENT_ID');
  const clientSecret = Deno.env.get('BANCO_INTER_CLIENT_SECRET');

  const tokenResponse = await fetch('https://cdpj.partners.bancointer.com.br/oauth/v2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId!,
      client_secret: clientSecret!,
      scope: 'boleto-cobranca.read boleto-cobranca.write',
      grant_type: 'client_credentials',
    }),
    // @ts-ignore
    cert: clientCert,
    key: clientKey,
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Erro ao obter token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nossoNumero, seuNumero, codigoFatura } = await req.json();
    
    // Pode buscar por nossoNumero direto ou por seuNumero/codigoFatura
    const searchKey = nossoNumero || seuNumero || codigoFatura;
    
    if (!searchKey) {
      return new Response(
        JSON.stringify({ error: 'nossoNumero, seuNumero ou codigoFatura é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Buscando boleto:', { nossoNumero, seuNumero, codigoFatura });

    // Configurações do Banco Inter
    const clientCert = Deno.env.get('BANCO_INTER_CLIENT_CERT');
    const clientKey = Deno.env.get('BANCO_INTER_CLIENT_KEY');

    if (!clientCert || !clientKey) {
      throw new Error('Credenciais do Banco Inter não configuradas');
    }

    const accessToken = await getAccessToken(clientCert, clientKey);

    // Se temos o nossoNumero, buscar PDF direto
    if (nossoNumero) {
      console.log('📄 Buscando PDF pelo nossoNumero:', nossoNumero);
      
      const pdfResponse = await fetch(`https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${nossoNumero}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        // @ts-ignore
        cert: clientCert,
        key: clientKey,
      });

      if (pdfResponse.ok) {
        const pdfBuffer = await pdfResponse.arrayBuffer();
        const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
        
        console.log('✅ PDF obtido com sucesso!');
        return new Response(
          JSON.stringify({ success: true, pdf: pdfBase64, nossoNumero }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('⚠️ Não encontrado por nossoNumero, tentando buscar na lista...');
    }

    // Buscar na lista de boletos pelo seuNumero
    const searchTerm = seuNumero || codigoFatura;
    if (searchTerm) {
      console.log('🔎 Buscando boleto pelo seuNumero:', searchTerm);
      
      // Truncar para 15 chars como é feito na criação
      const seuNumeroTruncado = String(searchTerm).substring(0, 15);
      
      // Buscar boletos com filtro
      const listResponse = await fetch(`https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas?filtrarPor=SEUNUMERO&filtro=${encodeURIComponent(seuNumeroTruncado)}&ordenarPor=DATAVENCIMENTO&tipoOrdenacao=DESC&itensPorPagina=10&paginaAtual=0`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        // @ts-ignore
        cert: clientCert,
        key: clientKey,
      });

      if (!listResponse.ok) {
        const errorText = await listResponse.text();
        console.error('❌ Erro ao listar boletos:', errorText);
        return new Response(
          JSON.stringify({ error: 'Não foi possível buscar boletos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const listData = await listResponse.json();
      console.log('📋 Boletos encontrados:', listData.totalElementos);

      if (listData.cobrancas && listData.cobrancas.length > 0) {
        const boleto = listData.cobrancas[0];
        const boletoNossoNumero = boleto.nossoNumero;
        
        console.log('✅ Boleto encontrado:', boletoNossoNumero);

        // Buscar PDF
        const pdfResponse = await fetch(`https://cdpj.partners.bancointer.com.br/cobranca/v3/cobrancas/${boletoNossoNumero}/pdf`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          // @ts-ignore
          cert: clientCert,
          key: clientKey,
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));
          
          console.log('✅ PDF obtido com sucesso!');
          return new Response(
            JSON.stringify({ 
              success: true, 
              pdf: pdfBase64, 
              nossoNumero: boletoNossoNumero,
              boletoInfo: {
                nossoNumero: boletoNossoNumero,
                seuNumero: boleto.seuNumero,
                valor: boleto.valorNominal,
                dataVencimento: boleto.dataVencimento,
                situacao: boleto.situacao
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          console.error('❌ Erro ao buscar PDF:', await pdfResponse.text());
        }
      }
    }

    return new Response(
      JSON.stringify({ error: 'Boleto não encontrado' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❌ Erro:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
