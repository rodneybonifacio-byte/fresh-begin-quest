import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// HELPER: Autenticar na API dos Correios via cartão de postagem
// ═══════════════════════════════════════════════════════════
async function autenticarCorreios(): Promise<string> {
  const idCorreios = Deno.env.get("CORREIOS_ID_CORREIOS");
  const senha = Deno.env.get("CORREIOS_SENHA");
  const cartaoPostagem = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");

  if (!idCorreios || !senha || !cartaoPostagem) {
    throw new Error("Credenciais dos Correios não configuradas (CORREIOS_ID_CORREIOS, CORREIOS_SENHA, CORREIOS_CARTAO_POSTAGEM)");
  }

  const basicAuth = btoa(`${idCorreios}:${senha}`);

  const response = await fetch("https://api.correios.com.br/token/v1/autentica/cartaopostagem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Basic ${basicAuth}`,
    },
    body: JSON.stringify({ numero: cartaoPostagem }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Erro autenticação Correios:", response.status, errorText);
    throw new Error(`Falha na autenticação dos Correios (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const token = data.token;

  if (!token) {
    throw new Error("Token não retornado pela API dos Correios");
  }

  console.log("✅ Token Correios obtido com sucesso");
  return token;
}

// ═══════════════════════════════════════════════════════════
// HELPER: Registrar Pedido de Informação (PI) nos Correios
// ═══════════════════════════════════════════════════════════
interface PIRequest {
  codigoObjeto: string;
  tipoPI: string;       // ex: "2" = Reclamação
  motivo: string;        // ex: "28" = Objeto não entregue
  descricao: string;
  // Dados do solicitante
  nomeRemetente: string;
  emailRemetente?: string;
  telefoneRemetente?: string;
  // Dados do destinatário
  nomeDestinatario: string;
  telefoneDestinatario?: string;
  cepDestinatario?: string;
}

interface PIResponse {
  protocolo: string;
  mensagem?: string;
  [key: string]: any;
}

async function registrarPI(token: string, piData: PIRequest): Promise<PIResponse> {
  // Montar o body segundo a documentação da API Pedido de Informação dos Correios
  const body: any = {
    codigoObjeto: piData.codigoObjeto,
    tipoPI: piData.tipoPI || "2",         // 2 = Reclamação
    codigoMotivo: piData.motivo || "28",   // 28 = Objeto não entregue ao dest.
    textoPI: piData.descricao.substring(0, 1000),
    solicitante: {
      nome: piData.nomeRemetente,
      email: piData.emailRemetente || "",
      telefone: (piData.telefoneRemetente || "").replace(/\D/g, ""),
    },
    destinatario: {
      nome: piData.nomeDestinatario,
      telefone: (piData.telefoneDestinatario || "").replace(/\D/g, ""),
      cep: (piData.cepDestinatario || "").replace(/\D/g, ""),
    },
  };

  console.log("📋 Registrando PI nos Correios:", JSON.stringify(body).substring(0, 500));

  const response = await fetch("https://api.correios.com.br/pedido-informacao/v1/registrar", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
  });

  const responseText = await response.text();
  console.log(`📦 Resposta PI Correios (${response.status}):`, responseText.substring(0, 500));

  let responseData: any;
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { mensagem: responseText };
  }

  if (!response.ok) {
    const errorMsg = responseData?.msgs?.join(", ") || responseData?.message || responseData?.mensagem || responseText;
    throw new Error(`Erro ao registrar PI nos Correios (${response.status}): ${errorMsg}`);
  }

  return responseData as PIResponse;
}

// ═══════════════════════════════════════════════════════════
// MAPEAMENTO de motivos para códigos do Correios
// ═══════════════════════════════════════════════════════════
const MOTIVOS_PI: Record<string, { tipoPI: string; codigoMotivo: string }> = {
  "objeto_nao_entregue":     { tipoPI: "2", codigoMotivo: "28" },
  "objeto_avariado":         { tipoPI: "2", codigoMotivo: "18" },
  "objeto_extraviado":       { tipoPI: "2", codigoMotivo: "22" },
  "entrega_indevida":        { tipoPI: "2", codigoMotivo: "29" },
  "atraso_entrega":          { tipoPI: "2", codigoMotivo: "14" },
  "conteudo_faltante":       { tipoPI: "2", codigoMotivo: "19" },
  "objeto_devolvido":        { tipoPI: "2", codigoMotivo: "24" },
  "tentativa_nao_realizada": { tipoPI: "2", codigoMotivo: "26" },
  "outros":                  { tipoPI: "2", codigoMotivo: "32" },
};

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

    // 1. Autenticar nos Correios
    console.log("🔑 Autenticando nos Correios...");
    const token = await autenticarCorreios();

    // 2. Resolver motivo
    const motivoConfig = MOTIVOS_PI[motivo_key || "outros"] || MOTIVOS_PI["outros"];

    // 3. Registrar PI
    const piResult = await registrarPI(token, {
      codigoObjeto: codigo_objeto.toUpperCase(),
      tipoPI: motivoConfig.tipoPI,
      motivo: motivoConfig.codigoMotivo,
      descricao: descricao || `Reclamação referente ao objeto ${codigo_objeto}`,
      nomeRemetente: nome_remetente || "BRHub Envios",
      emailRemetente: email_remetente,
      telefoneRemetente: telefone_remetente,
      nomeDestinatario: nome_destinatario || "Destinatário",
      telefoneDestinatario: telefone_destinatario,
      cepDestinatario: cep_destinatario,
    });

    console.log("✅ PI registrado:", JSON.stringify(piResult));

    // 4. Atualizar pipeline card se houver
    if (pipeline_card_id || conversation_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      const protocolo = piResult.protocolo || piResult.numero || piResult.idPI || "N/A";

      if (pipeline_card_id) {
        // Atualizar card existente com protocolo
        await supabase
          .from("ai_support_pipeline")
          .update({
            status: "em_andamento",
            resolution: `Protocolo Correios PI: ${protocolo}`,
            description: `Protocolo PI: ${protocolo}\n\n${descricao || ""}`.substring(0, 1000),
          })
          .eq("id", pipeline_card_id);
      } else if (conversation_id) {
        // Criar card no pipeline com protocolo
        await supabase.from("ai_support_pipeline").insert({
          conversation_id,
          contact_phone: contact_phone || "",
          contact_name: contact_name || nome_destinatario || "",
          category: "reclamacao",
          priority: "alta",
          status: "em_andamento",
          subject: `PI Correios: ${codigo_objeto} — Protocolo ${protocolo}`,
          description: `Protocolo PI: ${protocolo}\nCódigo: ${codigo_objeto}\nMotivo: ${motivo_key || "outros"}\n${descricao || ""}`.substring(0, 1000),
          sentiment: "negativo",
          detected_by: "correios_pi_api",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        protocolo: piResult.protocolo || piResult.numero || piResult.idPI || null,
        dados: piResult,
        codigo_objeto,
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
