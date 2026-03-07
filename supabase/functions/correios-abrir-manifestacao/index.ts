import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// HELPER: Login no backend externo e obter credenciais Correios
// ═══════════════════════════════════════════════════════════
async function loginBackend(): Promise<string> {
  const baseApiUrl = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
  const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
  const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");

  if (!adminEmail || !adminPassword) {
    throw new Error("Credenciais do backend não configuradas (API_ADMIN_EMAIL, API_ADMIN_PASSWORD)");
  }

  console.log(`🔑 Login no backend: ${baseApiUrl}/login`);

  const response = await fetch(`${baseApiUrl}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    signal: AbortSignal.timeout(10000),
  });

  const responseText = await response.text();
  console.log(`📦 Login response (${response.status}):`, responseText.substring(0, 300));

  if (!response.ok) {
    throw new Error(`Falha no login do backend (${response.status}): ${responseText.substring(0, 200)}`);
  }

  const data = JSON.parse(responseText);
  const token = data.token || data.data?.token;

  if (!token) {
    throw new Error("Token não retornado pelo backend");
  }

  console.log("✅ Token do backend obtido");
  return token;
}

async function getCorreiosCredenciais(backendToken: string): Promise<{ usuario: string; codigoAcesso: string; cartaoPostagem: string; contrato: string }> {
  const baseApiUrl = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";

  console.log("📋 Buscando credenciais Correios do backend...");

  const response = await fetch(`${baseApiUrl}/frete/credenciais`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${backendToken}`,
    },
    signal: AbortSignal.timeout(10000),
  });

  const responseText = await response.text();
  console.log(`📦 Credenciais response (${response.status}):`, responseText.substring(0, 500));

  if (!response.ok) {
    throw new Error(`Falha ao buscar credenciais Correios (${response.status})`);
  }

  const data = JSON.parse(responseText);
  // Pode vir como data.data (array) ou data (array)
  const credenciais = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [data];

  // Buscar credencial ativa
  const ativa = credenciais.find((c: any) => c.status === "ATIVO" || c.status === "ativo") || credenciais[0];

  if (!ativa) {
    throw new Error("Nenhuma credencial Correios encontrada");
  }

  console.log(`✅ Credencial encontrada: cartão=${(ativa.cartaoPostagem || "").substring(0, 4)}***, usuario=${(ativa.usuario || "").substring(0, 5)}***`);

  return {
    usuario: ativa.usuario,
    codigoAcesso: ativa.codigoAcesso,
    cartaoPostagem: ativa.cartaoPostagem,
    contrato: ativa.contrato,
  };
}

// ═══════════════════════════════════════════════════════════
// HELPER: Autenticar na API dos Correios
// ═══════════════════════════════════════════════════════════
async function autenticarCorreios(creds: { usuario: string; codigoAcesso: string; cartaoPostagem: string }): Promise<string> {
  const basicAuth = btoa(`${creds.usuario}:${creds.codigoAcesso}`);

  console.log(`🔐 Autenticando nos Correios: usuario=${creds.usuario.substring(0, 5)}***, cartão=${creds.cartaoPostagem.substring(0, 4)}***`);

  const response = await fetch("https://api.correios.com.br/token/v1/autentica/cartaopostagem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: JSON.stringify({ numero: creds.cartaoPostagem }),
    signal: AbortSignal.timeout(15000),
  });

  const responseText = await response.text();
  console.log(`📦 Auth Correios (${response.status}):`, responseText.substring(0, 300));

  if (!response.ok) {
    throw new Error(`Falha autenticação Correios (${response.status}): ${responseText.substring(0, 200)}`);
  }

  const data = JSON.parse(responseText);
  const token = data.token;

  if (!token) {
    throw new Error("Token não retornado pela API dos Correios");
  }

  console.log("✅ Token Correios obtido");
  return token;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Registrar PI nos Correios
// ═══════════════════════════════════════════════════════════
const MOTIVOS_PI: Record<string, { tipoPI: string; codigoMotivo: string; descricao: string }> = {
  "objeto_nao_entregue":     { tipoPI: "2", codigoMotivo: "28", descricao: "Objeto não entregue ao destinatário" },
  "objeto_avariado":         { tipoPI: "2", codigoMotivo: "18", descricao: "Objeto avariado" },
  "objeto_extraviado":       { tipoPI: "2", codigoMotivo: "22", descricao: "Objeto extraviado" },
  "entrega_indevida":        { tipoPI: "2", codigoMotivo: "29", descricao: "Entrega indevida" },
  "atraso_entrega":          { tipoPI: "2", codigoMotivo: "14", descricao: "Atraso na entrega" },
  "conteudo_faltante":       { tipoPI: "2", codigoMotivo: "19", descricao: "Conteúdo faltante" },
  "objeto_devolvido":        { tipoPI: "2", codigoMotivo: "24", descricao: "Objeto devolvido indevidamente" },
  "tentativa_nao_realizada": { tipoPI: "2", codigoMotivo: "26", descricao: "Tentativa de entrega não realizada" },
  "outros":                  { tipoPI: "2", codigoMotivo: "32", descricao: "Outros" },
};

async function registrarPI(correiosToken: string, params: {
  codigoObjeto: string;
  motivoConfig: { tipoPI: string; codigoMotivo: string; descricao: string };
  descricao: string;
  nomeRemetente: string;
  emailRemetente: string;
  telefoneRemetente: string;
  nomeDestinatario: string;
  telefoneDestinatario: string;
  cepDestinatario: string;
}): Promise<any> {
  const body: any = {
    codigoObjeto: params.codigoObjeto,
    tipoPI: params.motivoConfig.tipoPI,
    codigoMotivo: params.motivoConfig.codigoMotivo,
    textoPI: params.descricao.substring(0, 1000),
    solicitante: {
      nome: params.nomeRemetente,
      email: params.emailRemetente || "",
      telefone: (params.telefoneRemetente || "").replace(/\D/g, ""),
    },
    destinatario: {
      nome: params.nomeDestinatario,
      telefone: (params.telefoneDestinatario || "").replace(/\D/g, ""),
      cep: (params.cepDestinatario || "").replace(/\D/g, ""),
    },
  };

  console.log("📋 Registrando PI:", JSON.stringify(body).substring(0, 500));

  const response = await fetch("https://api.correios.com.br/pedido-informacao/v1/registrar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${correiosToken}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();
  console.log(`📦 PI response (${response.status}):`, responseText.substring(0, 500));

  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { mensagem: responseText };
  }

  if (!response.ok) {
    const errorMsg = responseData?.msgs?.join(", ") || responseData?.message || responseData?.mensagem || responseText;
    throw new Error(`Erro PI Correios (${response.status}): ${errorMsg}`);
  }

  return responseData;
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      codigo_objeto,
      motivo_key,
      descricao,
      nome_remetente,
      email_remetente,
      telefone_remetente,
      nome_destinatario,
      telefone_destinatario,
      cep_destinatario,
      conversation_id,
      contact_phone,
      contact_name,
      pipeline_card_id,
    } = await req.json();

    if (!codigo_objeto) {
      return new Response(
        JSON.stringify({ error: "codigo_objeto é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const motivoConfig = MOTIVOS_PI[motivo_key || "outros"] || MOTIVOS_PI["outros"];

    let protocolo: string | null = null;
    let piSuccess = false;
    let piResult: any = null;

    try {
      // 1. Login no backend para pegar token
      const backendToken = await loginBackend();

      // 2. Buscar credenciais Correios do backend
      const creds = await getCorreiosCredenciais(backendToken);

      // 3. Autenticar diretamente nos Correios com as credenciais
      const correiosToken = await autenticarCorreios(creds);

      // 4. Registrar PI
      piResult = await registrarPI(correiosToken, {
        codigoObjeto: codigo_objeto.toUpperCase(),
        motivoConfig,
        descricao: `${motivoConfig.descricao}. ${descricao || ""}`.trim(),
        nomeRemetente: nome_remetente || "BRHub Envios",
        emailRemetente: email_remetente || "",
        telefoneRemetente: telefone_remetente || "",
        nomeDestinatario: nome_destinatario || "Destinatário",
        telefoneDestinatario: telefone_destinatario || "",
        cepDestinatario: cep_destinatario || "",
      });

      protocolo = piResult?.protocolo || piResult?.numero || piResult?.idPI || null;
      piSuccess = !!protocolo;
      console.log(`✅ PI resultado: protocolo=${protocolo}, success=${piSuccess}`);
    } catch (piError: any) {
      console.error("❌ Erro no fluxo PI:", piError.message);
      piResult = { error: piError.message };
    }

    // 5. Registrar no pipeline
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const descricaoCard = [
      piSuccess ? `📋 Protocolo PI: ${protocolo}` : `⚠️ PI não registrado: ${piResult?.error || "erro desconhecido"}`,
      `📦 Código: ${codigo_objeto}`,
      `📝 Motivo: ${motivoConfig.descricao}`,
      descricao ? `💬 Detalhes: ${descricao}` : "",
      `👤 Destinatário: ${nome_destinatario || "N/A"}`,
      `📤 Remetente: ${nome_remetente || "N/A"}`,
    ].filter(Boolean).join("\n");

    if (pipeline_card_id) {
      await supabase
        .from("ai_support_pipeline")
        .update({
          status: piSuccess ? "em_andamento" : "aberto",
          resolution: piSuccess ? `Protocolo Correios PI: ${protocolo}` : null,
          description: descricaoCard.substring(0, 1000),
        })
        .eq("id", pipeline_card_id);
    } else if (conversation_id) {
      await supabase.from("ai_support_pipeline").insert({
        conversation_id,
        contact_phone: contact_phone || "",
        contact_name: contact_name || nome_destinatario || "",
        category: "reclamacao",
        priority: "alta",
        status: piSuccess ? "em_andamento" : "aberto",
        subject: piSuccess
          ? `PI Correios: ${codigo_objeto} — Protocolo ${protocolo}`
          : `Manifestação: ${codigo_objeto} — ${motivoConfig.descricao}`,
        description: descricaoCard.substring(0, 1000),
        sentiment: "negativo",
        detected_by: piSuccess ? "correios_pi_api" : "tool_manifestacao",
      });
    }

    return new Response(
      JSON.stringify({
        success: piSuccess,
        protocolo,
        dados: piResult,
        codigo_objeto,
        motivo: motivoConfig.descricao,
        registrado_internamente: true,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro na edge function correios-abrir-manifestacao:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
