import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// MAPEAMENTO de motivos para códigos do Correios
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

    const baseApiUrl = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");

    // 1. Autenticar no backend externo para obter token
    console.log("🔑 Autenticando no backend externo...");
    let apiToken = "";
    
    try {
      const loginResponse = await fetch(`${baseApiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: adminEmail, senha: adminPassword }),
        signal: AbortSignal.timeout(10000),
      });

      const loginText = await loginResponse.text();
      console.log(`📦 Login response (${loginResponse.status}):`, loginText.substring(0, 200));

      if (loginResponse.ok) {
        const loginData = JSON.parse(loginText);
        apiToken = loginData.token || loginData.data?.token || "";
      }
    } catch (loginErr: any) {
      console.warn("⚠️ Falha no login do backend:", loginErr.message);
    }

    // 2. Resolver motivo
    const motivoConfig = MOTIVOS_PI[motivo_key || "outros"] || MOTIVOS_PI["outros"];

    // 3. Chamar endpoint de PI no backend externo
    console.log("📋 Registrando PI via backend externo...");
    
    const piPayload = {
      codigoObjeto: codigo_objeto.toUpperCase(),
      tipoPI: motivoConfig.tipoPI,
      codigoMotivo: motivoConfig.codigoMotivo,
      textoPI: `${motivoConfig.descricao}. ${descricao || ""}`.trim().substring(0, 1000),
      solicitante: {
        nome: nome_remetente || "BRHub Envios",
        email: email_remetente || "",
        telefone: (telefone_remetente || "").replace(/\D/g, ""),
      },
      destinatario: {
        nome: nome_destinatario || "Destinatário",
        telefone: (telefone_destinatario || "").replace(/\D/g, ""),
        cep: (cep_destinatario || "").replace(/\D/g, ""),
      },
    };

    let protocolo: string | null = null;
    let piSuccess = false;
    let piResult: any = null;

    try {
      const piResponse = await fetch(`${baseApiUrl}/frete/manifestacao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiToken ? { "Authorization": `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(piPayload),
        signal: AbortSignal.timeout(30000),
      });

      const piText = await piResponse.text();
      console.log(`📦 Resposta PI backend (${piResponse.status}):`, piText.substring(0, 500));

      try {
        piResult = JSON.parse(piText);
      } catch {
        piResult = { mensagem: piText };
      }

      if (piResponse.ok && piResult) {
        protocolo = piResult.protocolo || piResult.data?.protocolo || piResult.numero || piResult.data?.numero || piResult.idPI || null;
        piSuccess = !!protocolo;
        console.log(`✅ PI registrado: protocolo ${protocolo}`);
      } else {
        console.warn("⚠️ PI via backend falhou:", piResult?.error || piResult?.message || piText);
      }
    } catch (piErr: any) {
      console.error("❌ Erro chamando PI no backend:", piErr.message);
    }

    // 4. Registrar no pipeline (sempre, com ou sem protocolo)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const statusText = piSuccess ? `Protocolo Correios PI: ${protocolo}` : "PI pendente - registrado internamente";
    const descricaoCard = [
      piSuccess ? `📋 Protocolo PI: ${protocolo}` : "⚠️ PI não registrado na API (pendente)",
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
          resolution: statusText,
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
