// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://api.datacrazy.io/v1/crm/api/crm/flows/webhooks/ab52ed88-dd1c-4bd2-a198-d1845e59e058/181d8bbe-a92e-43f1-9660-b2e3acf2632b';
const BASE_API_URL = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 TESTE: Enviando dados de AGUARDANDO_RETIRADA para webhook...');

    // Login admin na API
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      throw new Error('Credenciais de admin não configuradas');
    }

    console.log('🔐 Fazendo login admin...');
    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });

    if (!loginResponse.ok) {
      const errText = await loginResponse.text();
      throw new Error(`Falha no login admin: ${loginResponse.status} - ${errText}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Buscar envios com status AGUARDANDO_RETIRADA - pegar apenas 1 para teste
    console.log('📦 Buscando 1 envio AGUARDANDO_RETIRADA para teste...');
    const enviosResponse = await fetch(
      `${BASE_API_URL}/emissoes/admin?status=AGUARDANDO_RETIRADA&limit=1&offset=0`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!enviosResponse.ok) {
      const errText = await enviosResponse.text();
      throw new Error(`Falha ao buscar envios: ${enviosResponse.status} - ${errText}`);
    }

    const enviosData = await enviosResponse.json();
    const envios = enviosData?.data || [];

    if (envios.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: 'Nenhum envio AGUARDANDO_RETIRADA encontrado para teste' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const envio = envios[0];
    console.log('📋 Envio encontrado:', JSON.stringify(envio, null, 2));

    // Buscar dados completos de rastreio
    let rastreioData: any = null;
    let rastreioCompleto: any = null;
    
    if (envio.codigoObjeto) {
      const rastreioUrl = `${BASE_API_URL}/rastrear?codigo=${envio.codigoObjeto}`;
      console.log(`🔍 Buscando rastreio: ${rastreioUrl}`);
      
      const rastreioResponse = await fetch(rastreioUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (rastreioResponse.ok) {
        const rastreioText = await rastreioResponse.text();
        console.log(`📍 Rastreio completo RAW:`, rastreioText);
        const rastreioJson = JSON.parse(rastreioText);
        rastreioData = rastreioJson.data || rastreioJson;
        rastreioCompleto = rastreioJson;
      } else {
        const errText = await rastreioResponse.text();
        console.log(`⚠️ Rastreio falhou: ${errText}`);
      }
    }

    // Extrair dados do evento LDI
    const eventos = Array.isArray(rastreioData) ? rastreioData : (rastreioData?.eventos || []);
    const eventoLDI = eventos.find((e: any) => e.codigo === 'LDI') || eventos[0] || {};
    const unidade = eventoLDI.unidade || {};
    const enderecoUnidade = unidade.endereco || {};
    
    const cidadeUf = unidade.cidadeUf || '';
    const [cidadeFallback, ufFallback] = cidadeUf.includes('-') ? cidadeUf.split('-') : [cidadeUf, ''];

    // Extrair dados do destinatário
    const destinatario = envio.destinatario || {};
    const enderecoDestinatario = destinatario.endereco || {};

    // Preparar payload COMPLETO para o webhook
    const webhookPayload = {
      // === Dados do Destinatário ===
      destinatario_nome: destinatario.nome || envio.destinatarioNome || '',
      destinatario_cpf_cnpj: destinatario.cpfCnpj || '',
      destinatario_celular: destinatario.celular || envio.destinatarioCelular || '',
      destinatario_telefone: destinatario.telefone || '',
      destinatario_email: destinatario.email || '',
      
      // === Endereço do Destinatário ===
      destinatario_cep: enderecoDestinatario.cep || '',
      destinatario_logradouro: enderecoDestinatario.logradouro || '',
      destinatario_numero: enderecoDestinatario.numero || '',
      destinatario_complemento: enderecoDestinatario.complemento || '',
      destinatario_bairro: enderecoDestinatario.bairro || '',
      destinatario_cidade: enderecoDestinatario.localidade || '',
      destinatario_uf: enderecoDestinatario.uf || '',
      
      // === Dados do Remetente ===
      remetente_nome: envio.remetenteNome || envio.cliente?.nome || '',
      remetente_cpf_cnpj: envio.remetenteCpfCnpj || envio.cliente?.cpfCnpj || '',
      remetente_cep: envio.remetenteCep || '',
      remetente_logradouro: envio.remetenteLogradouro || '',
      remetente_numero: envio.remetenteNumero || '',
      remetente_complemento: envio.remetenteComplemento || '',
      remetente_bairro: envio.remetenteBairro || '',
      remetente_cidade: envio.remetenteLocalidade || '',
      remetente_uf: envio.remetenteUf || '',
      
      // === Dados do Envio ===
      codigo_objeto: envio.codigoObjeto || '',
      servico: envio.servico || '',
      transportadora: envio.transportadora || '',
      status: envio.status || '',
      valor_frete: envio.valor || 0,
      peso: envio.peso || 0,
      altura: envio.altura || 0,
      largura: envio.largura || 0,
      comprimento: envio.comprimento || 0,
      valor_declarado: envio.valorDeclarado || 0,
      prazo: envio.prazo || '',
      criado_em: envio.criadoEm || '',
      
      // === Dados da Unidade de Retirada (Correios) ===
      unidade_tipo: unidade.tipo || '',
      unidade_cidade_uf: unidade.cidadeUf || '',
      unidade_cep: enderecoUnidade.cep || '',
      unidade_logradouro: enderecoUnidade.logradouro || '',
      unidade_numero: enderecoUnidade.numero || '',
      unidade_bairro: enderecoUnidade.bairro || '',
      unidade_cidade: enderecoUnidade.cidade || cidadeFallback || '',
      unidade_uf: enderecoUnidade.uf || ufFallback || '',
      
      // === Dados do Evento de Rastreio ===
      evento_codigo: eventoLDI.codigo || '',
      evento_descricao: eventoLDI.descricao || '',
      evento_data: eventoLDI.date || eventoLDI.dataCompleta || '',
      evento_horario: eventoLDI.horario || '',
      evento_detalhes: eventoLDI.detalhes || '',
      
      // === Metadados ===
      _teste: true,
      _timestamp: new Date().toISOString(),
    };

    console.log('📋 Payload COMPLETO do webhook:', JSON.stringify(webhookPayload, null, 2));

    // Enviar para webhook
    console.log('📤 Enviando para webhook DataCrazy...');
    const webhookResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });

    const responseStatus = webhookResponse.status;
    const responseText = await webhookResponse.text();

    console.log(`✅ Webhook response: ${responseStatus} - ${responseText}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Teste enviado para webhook',
        envio_original: envio,
        rastreio_completo: rastreioCompleto,
        evento_ldi: eventoLDI,
        payload_enviado: webhookPayload,
        webhook_response: {
          status: responseStatus,
          body: responseText,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no teste:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
