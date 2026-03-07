import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// Motivos para PI dos Correios
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

// ═══════════════════════════════════════════════════════════
// Tentativa de PI via API Correios (opcional - requer senha de componentes)
// ═══════════════════════════════════════════════════════════
async function tentarPICorreios(params: {
  codigoObjeto: string;
  motivoConfig: { tipoPI: string; codigoMotivo: string; descricao: string };
  descricao: string;
  nomeRemetente: string;
  emailRemetente: string;
  telefoneRemetente: string;
  nomeDestinatario: string;
  telefoneDestinatario: string;
  cepDestinatario: string;
}): Promise<{ success: boolean; protocolo: string | null; dados: any }> {
  const idCorreios = Deno.env.get("CORREIOS_ID_CORREIOS");
  const senha = Deno.env.get("CORREIOS_SENHA");
  const cartaoPostagem = Deno.env.get("CORREIOS_CARTAO_POSTAGEM");

  if (!idCorreios || !senha) {
    return { success: false, protocolo: null, dados: { error: "Credenciais Correios não configuradas" } };
  }

  try {
    // 1. Autenticar via endpoint simples (sem cartão de postagem)
    const basicAuth = btoa(`${idCorreios}:${senha}`);
    console.log(`🔐 Auth Correios (simples): ${idCorreios.substring(0, 5)}***`);

    const authResponse = await fetch("https://api.correios.com.br/token/v1/autentica", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Basic ${basicAuth}`,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });

    const authText = await authResponse.text();
    if (!authResponse.ok) {
      console.warn(`⚠️ Auth Correios falhou (${authResponse.status}):`, authText.substring(0, 500));
      return { success: false, protocolo: null, dados: { error: `Auth falhou (${authResponse.status})`, detalhes: authText.substring(0, 300) } };
    }

    const authData = JSON.parse(authText);
    const correiosToken = authData.token;
    if (!correiosToken) {
      return { success: false, protocolo: null, dados: { error: "Token não retornado" } };
    }

    console.log("✅ Token Correios obtido");

    // 2. Registrar PI
    const piBody = {
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

    console.log("📋 Registrando PI:", JSON.stringify(piBody).substring(0, 400));

    const piResponse = await fetch("https://api.correios.com.br/pedido-informacao/v1/registrar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${correiosToken}`,
      },
      body: JSON.stringify(piBody),
      signal: AbortSignal.timeout(30000),
    });

    const piText = await piResponse.text();
    console.log(`📦 PI response (${piResponse.status}):`, piText.substring(0, 500));

    const piData = JSON.parse(piText);
    if (!piResponse.ok) {
      return { success: false, protocolo: null, dados: piData };
    }

    const protocolo = piData.protocolo || piData.numero || piData.idPI || null;
    return { success: !!protocolo, protocolo, dados: piData };
  } catch (err: any) {
    console.error("❌ Erro PI Correios:", err.message);
    return { success: false, protocolo: null, dados: { error: err.message } };
  }
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
    const descricaoCompleta = `${motivoConfig.descricao}. ${descricao || ""}`.trim();

    // Tentar PI nos Correios (fallback gracioso se falhar)
    const piResult = await tentarPICorreios({
      codigoObjeto: codigo_objeto.toUpperCase(),
      motivoConfig,
      descricao: descricaoCompleta,
      nomeRemetente: nome_remetente || "BRHub Envios",
      emailRemetente: email_remetente || "",
      telefoneRemetente: telefone_remetente || "",
      nomeDestinatario: nome_destinatario || "Destinatário",
      telefoneDestinatario: telefone_destinatario || "",
      cepDestinatario: cep_destinatario || "",
    });

    // Registrar no pipeline (sempre)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const descricaoCard = [
      piResult.success ? `📋 Protocolo PI Correios: ${piResult.protocolo}` : "📋 Manifestação registrada internamente",
      `📦 Código: ${codigo_objeto}`,
      `📝 Motivo: ${motivoConfig.descricao}`,
      descricao ? `💬 ${descricao}` : "",
      `👤 Destinatário: ${nome_destinatario || "N/A"}`,
      `📤 Remetente: ${nome_remetente || "N/A"}`,
    ].filter(Boolean).join("\n");

    if (pipeline_card_id) {
      await supabase
        .from("ai_support_pipeline")
        .update({
          status: piResult.success ? "em_andamento" : "aberto",
          resolution: piResult.success ? `Protocolo PI: ${piResult.protocolo}` : null,
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
        status: piResult.success ? "em_andamento" : "aberto",
        subject: piResult.success
          ? `PI Correios: ${codigo_objeto} — ${piResult.protocolo}`
          : `Manifestação: ${codigo_objeto} — ${motivoConfig.descricao}`,
        description: descricaoCard.substring(0, 1000),
        sentiment: "negativo",
        detected_by: piResult.success ? "correios_pi_api" : "tool_manifestacao",
      });
    }

    return new Response(
      JSON.stringify({
        success: true, // Sempre true pois registramos internamente
        protocolo_correios: piResult.protocolo,
        pi_registrado_correios: piResult.success,
        codigo_objeto,
        motivo: motivoConfig.descricao,
        dados_pi: piResult.dados,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("❌ Erro:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erro interno", success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
