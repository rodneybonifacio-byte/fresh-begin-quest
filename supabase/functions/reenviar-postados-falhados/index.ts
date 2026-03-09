// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("🔄 [REENVIO] Buscando mensagens objeto_postado falhadas...");

    // Buscar mensagens falhadas de objeto_postado
    const { data: msgsFalhadas, error: fetchError } = await supabase
      .from("whatsapp_messages")
      .select("id, metadata, conversation_id, created_at")
      .eq("content_type", "hsm")
      .eq("status", "failed")
      .eq("direction", "outbound");

    if (fetchError) throw new Error(`Erro ao buscar mensagens: ${fetchError.message}`);

    // Filtrar apenas objeto_postado
    const postadosFalhados = (msgsFalhadas || []).filter(
      (m: any) => m.metadata?.trigger_key === "objeto_postado"
    );

    console.log(`📦 ${postadosFalhados.length} mensagens objeto_postado falhadas encontradas`);

    if (postadosFalhados.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Nenhuma mensagem falhada para reenviar", reenviados: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Login admin para buscar rastreio
    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");
    const loginRes = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!loginRes.ok) throw new Error(`Login falhou: ${loginRes.status}`);
    const { token } = await loginRes.json();

    let reenviados = 0;
    let erros: string[] = [];

    for (const msg of postadosFalhados) {
      const vars = msg.metadata?.variables || {};
      const codigo = vars.codigo_rastreio || "";
      if (!codigo) {
        erros.push(`Msg ${msg.id}: sem código de rastreio`);
        continue;
      }

      // Buscar previsão de entrega via rastreio
      let dataPrevisao = vars.data_previsao_entrega || "";
      if (!dataPrevisao) {
        try {
          const rastreioRes = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          if (rastreioRes.ok) {
            const rastreioData = await rastreioRes.json();
            dataPrevisao = formatDate(rastreioData?.data?.dataPrevisaoEntrega || "");
          }
        } catch (err) {
          console.warn(`⚠️ Erro rastreio ${codigo}:`, err);
        }
      }

      // Se ainda não tem previsão, usar "Em breve" como fallback
      if (!dataPrevisao) {
        dataPrevisao = "Em breve";
        console.log(`⚠️ ${codigo}: sem previsão, usando fallback "Em breve"`);
      }

      // Buscar telefone da conversa
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("contact_phone")
        .eq("id", msg.conversation_id)
        .maybeSingle();

      if (!conv?.contact_phone) {
        erros.push(`${codigo}: sem telefone na conversa`);
        continue;
      }

      console.log(`📲 Reenviando ${codigo} → ${conv.contact_phone} (previsão: ${dataPrevisao})`);

      // Reenviar via send-whatsapp-template
      const templateRes = await fetch(
        `${supabaseUrl}/functions/v1/send-whatsapp-template`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            trigger_key: "objeto_postado",
            phone: conv.contact_phone,
            variables: {
              nome_destinatario: vars.nome_destinatario || "Cliente",
              nome_remetente: vars.nome_remetente || "Loja",
              codigo_rastreio: codigo,
              data_previsao_entrega: dataPrevisao,
            },
          }),
        }
      );

      if (templateRes.ok) {
        reenviados++;
        console.log(`✅ ${codigo}: reenviado com sucesso`);

        // Marcar a mensagem antiga como "resent" para não reprocessar
        await supabase
          .from("whatsapp_messages")
          .update({ status: "resent" })
          .eq("id", msg.id);
      } else {
        const errText = await templateRes.text();
        console.error(`❌ ${codigo}: ${templateRes.status} - ${errText.substring(0, 200)}`);
        erros.push(`${codigo}: ${templateRes.status}`);
      }

      await new Promise(r => setTimeout(r, 300));
    }

    console.log(`🏁 Reenvio finalizado: ${reenviados}/${postadosFalhados.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_falhadas: postadosFalhados.length,
        reenviados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no reenvio:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
