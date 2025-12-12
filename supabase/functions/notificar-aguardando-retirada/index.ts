// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/181d8bbe-a92e-43f1-9660-b2e3acf2632b';

interface EnvioData {
  destinatarioNome: string;
  codigoObjeto: string;
  remetenteNome: string;
  destinatarioCelular: string;
  // Dados completos da unidade de retirada
  unidadeTipo?: string;
  unidadeCep?: string;
  unidadeLogradouro?: string;
  unidadeNumero?: string;
  unidadeBairro?: string;
  unidadeCidade?: string;
  unidadeUf?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: EnvioData = await req.json();
    
    console.log('📦 Recebendo dados para notificação AGUARDANDO_RETIRADA:', JSON.stringify(body, null, 2));

    // Validar campos obrigatórios
    if (!body.destinatarioNome || !body.codigoObjeto || !body.destinatarioCelular) {
      console.error('❌ Campos obrigatórios faltando');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios: destinatarioNome, codigoObjeto, destinatarioCelular' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar endereço completo da unidade para exibição
    const enderecoUnidadeCompleto = [
      body.unidadeLogradouro,
      body.unidadeNumero ? `nº ${body.unidadeNumero}` : '',
      body.unidadeBairro,
      body.unidadeCidade,
      body.unidadeUf,
      body.unidadeCep ? `CEP: ${body.unidadeCep}` : ''
    ].filter(Boolean).join(', ');

    // Preparar payload para o webhook DataCrazy
    const webhookPayload = {
      destinatario_nome: body.destinatarioNome,
      codigo_objeto: body.codigoObjeto,
      remetente_nome: body.remetenteNome || '',
      destinatario_celular: body.destinatarioCelular,
      // Dados da unidade de retirada
      unidade_tipo: body.unidadeTipo || '',
      unidade_cep: body.unidadeCep || '',
      unidade_logradouro: body.unidadeLogradouro || '',
      unidade_numero: body.unidadeNumero || '',
      unidade_bairro: body.unidadeBairro || '',
      unidade_cidade: body.unidadeCidade || '',
      unidade_uf: body.unidadeUf || '',
      // Endereço formatado para exibição direta
      unidade_endereco_completo: enderecoUnidadeCompleto,
    };

    console.log('📤 Enviando para webhook DataCrazy:', JSON.stringify(webhookPayload, null, 2));

    // Enviar para o webhook
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    const responseText = await webhookResponse.text();
    console.log('📬 Resposta do webhook:', webhookResponse.status, responseText);

    if (!webhookResponse.ok) {
      console.error('❌ Erro ao enviar para webhook:', webhookResponse.status, responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Erro no webhook: ${webhookResponse.status}`,
          details: responseText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Notificação AGUARDANDO_RETIRADA enviada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Notificação enviada com sucesso',
        codigoObjeto: body.codigoObjeto 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro na função notificar-aguardando-retirada:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
