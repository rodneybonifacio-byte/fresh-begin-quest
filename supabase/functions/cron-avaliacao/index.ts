// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

function formatFullName(fullName: string): string {
  const name = (fullName || "").trim();
  if (!name) return "";
  return name.split(/\s+/).map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    console.log("🔄 [CronAvaliacao] Iniciando verificação...");

    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");
    if (!adminEmail || !adminPassword) throw new Error("Credenciais admin não configuradas");

    const loginRes = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!loginRes.ok) throw new Error(`Login falhou: ${loginRes.status}`);
    const { token } = await loginRes.json();

    // Buscar emissões com status ENTREGUE (todas disponíveis, sem filtro temporal)
    const res = await fetch(
      `${BASE_API_URL}/emissoes/admin?status=ENTREGUE&limit=100&offset=0`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new Error(`Falha ao buscar emissões: ${res.status}`);
    const data = await res.json();
    const allEmissoes = data?.data || [];

    console.log(`📦 ${allEmissoes.length} emissões com status ENTREGUE`);

    // Usar todas as emissões ENTREGUE sem filtro temporal
    // A deduplicação abaixo garante que cada objeto só receba avaliação 1 vez
    const agora = Date.now();
    const emissoesFiltradas = allEmissoes;

    console.log(`📋 ${emissoesFiltradas.length} emissões para verificar (dedup abaixo)`);

    // Deduplicar: verificar quais já receberam avaliação
    // IMPORTANTE: Filtrar por trigger_key no banco para evitar limite de 1000 rows
    const codigosJaAvaliados = new Set<string>();
    const telefonesJaNotificados = new Set<string>();
    
    let offset = 0;
    const batchSize = 500;
    let hasMore = true;
    
    while (hasMore) {
      const { data: hsmBatch, error: hsmError } = await supabase
        .from("whatsapp_messages")
        .select("metadata")
        .eq("content_type", "hsm")
        .eq("direction", "outbound")
        .contains("metadata", { trigger_key: "avaliacao" })
        .range(offset, offset + batchSize - 1);

      if (hsmError) {
        console.error("❌ Erro ao buscar HSM para dedup:", hsmError);
        break;
      }

      if (hsmBatch) {
        for (const msg of hsmBatch) {
          const meta = msg.metadata as any;
          if (meta?.variables?.codigo_rastreio) {
            codigosJaAvaliados.add(meta.variables.codigo_rastreio);
          }
          const phone = meta?.variables?.phone_used || "";
          if (phone) telefonesJaNotificados.add(phone);
        }
      }

      hasMore = (hsmBatch?.length || 0) === batchSize;
      offset += batchSize;
    }

    console.log(`🔍 ${codigosJaAvaliados.size} códigos já receberam avaliação`);

    // Buscar telefones bloqueados (blocklist)
    const { data: blockedPhones } = await supabase
      .from("whatsapp_phone_blocklist")
      .select("phone_number")
      .eq("is_active", true);
    const telefonesBloqueados = new Set<string>();
    if (blockedPhones) {
      for (const b of blockedPhones) {
        telefonesBloqueados.add(b.phone_number.replace(/\D/g, ""));
      }
    }
    console.log(`🚫 ${telefonesBloqueados.size} telefones na blocklist`);

    const emissoesPendentes = emissoesFiltradas.filter((e: any) => {
      if (!e.codigoObjeto) return false;
      if (codigosJaAvaliados.has(e.codigoObjeto)) return false;
      
      const destinatario = e.destinatario || {};
      let celular = destinatario.celular || destinatario.telefone || e.destinatarioCelular || "";
      celular = String(celular).replace(/\D/g, "");
      if (!celular.startsWith("55")) celular = "55" + celular;
      // Não enviar se já mandou avaliação para esse telefone recentemente
      if (telefonesJaNotificados.has(celular)) return false;
      // Não enviar se telefone está na blocklist
      if (telefonesBloqueados.has(celular)) return false;
      
      return true;
    });

    console.log(`📬 ${emissoesPendentes.length} pendentes de avaliação`);

    let notificados = 0;
    const erros: string[] = [];

    for (const envio of emissoesPendentes) {
      try {
        const destinatario = envio.destinatario || {};
        const codigoRastreio = envio.codigoObjeto || "";

        let celular = destinatario.celular || destinatario.telefone || envio.destinatarioCelular || "";
        celular = String(celular).replace(/\D/g, "");
        if (!celular) {
          erros.push(`${codigoRastreio}: celular vazio`);
          continue;
        }
        if (!celular.startsWith("55")) celular = "55" + celular;

        const nomeDestinatario = formatFullName(destinatario.nome || envio.destinatarioNome || "Cliente");

        console.log(`📲 Enviando avaliação: ${codigoRastreio} → ${celular} (${nomeDestinatario})`);

        const templateRes = await fetch(
          `${supabaseUrl}/functions/v1/send-whatsapp-template`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              trigger_key: "avaliacao",
              phone: celular,
              variables: {
                nome_destinatario: nomeDestinatario,
                codigo_rastreio: codigoRastreio,
                phone_used: celular,
              },
            }),
          }
        );

        if (templateRes.ok) {
          notificados++;
          console.log(`✅ ${codigoRastreio}: avaliação enviada`);
        } else {
          const errText = await templateRes.text();
          console.error(`❌ ${codigoRastreio}: ${templateRes.status} - ${errText.substring(0, 200)}`);
          erros.push(`${codigoRastreio}: ${templateRes.status}`);
        }

        // Rate limit mais conservador para avaliações (não urgente)
        await new Promise(r => setTimeout(r, 500));
      } catch (err: any) {
        erros.push(`${envio.codigoObjeto}: ${err.message}`);
      }
    }

    console.log(`🏁 Finalizado: ${notificados} avaliações enviadas, ${erros.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        total: allEmissoes.length,
        filtradas: emissoesFiltradas.length,
        ja_avaliadas: codigosJaAvaliados.size,
        notificados_agora: notificados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no CRON avaliacao:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
