import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mapear descrição do evento dos Correios → status do pipeline
function mapTrackingEventToStatus(eventos: any[]): string | null {
  if (!eventos || eventos.length === 0) return null;
  
  const ultimo = eventos[0]; // Evento mais recente
  const desc = (ultimo.descricao || "").toLowerCase();

  if (desc.includes("entregue") || desc.includes("objeto entregue")) return "entregue";
  if (desc.includes("saiu para entrega")) return "saiu_para_entrega";
  if (desc.includes("aguardando retirada") || desc.includes("disponível para retirada")) return "aguardando_retirada";
  if (desc.includes("atraso") || desc.includes("prazo de entrega pode sofrer alterações")) return "atrasado";
  if (desc.includes("postado") || desc.includes("objeto postado")) return "em_transito";
  
  // Qualquer movimentação entre unidades = em trânsito
  if (
    desc.includes("em trânsito") ||
    desc.includes("encaminhado") ||
    desc.includes("recebido na unidade") ||
    desc.includes("objeto em transferência") ||
    desc.includes("encaminhamento") ||
    desc.includes("fiscalização") ||
    desc.includes("objeto recebido")
  ) return "em_transito";

  return null;
}

// Flow do pipeline de rastreio (ordem de progressão)
const RASTREIO_FLOW = ["pre_postado", "postado", "em_transito", "saiu_para_entrega", "aguardando_retirada", "atrasado", "entregue"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Buscar todos os cards de rastreio que NÃO estão em estado final
    const { data: cards, error: cardsErr } = await supabase
      .from("ai_support_pipeline")
      .select("id, status, subject, contact_name")
      .eq("category", "rastreio")
      .not("status", "in", '("entregue","cancelado")')
      .order("updated_at", { ascending: false })
      .limit(100);

    if (cardsErr) throw cardsErr;
    if (!cards || cards.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "Nenhum card pendente", updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`📋 ${cards.length} cards de rastreio para reconciliar`);

    // Login na API externa uma vez
    const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");

    if (!adminEmail || !adminPassword) {
      throw new Error("Credenciais da API não configuradas");
    }

    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!loginResponse.ok) throw new Error("Falha no login da API");
    const loginData = await loginResponse.json();
    const token = loginData.token;

    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const results: any[] = [];

    for (const card of cards) {
      try {
        // Extrair código de rastreio do subject (ex: "Rastreio AN679070228BR")
        const codeMatch = card.subject?.match(/([A-Z]{2}\d{9,13}[A-Z]{2})/);
        if (!codeMatch) {
          console.log(`⏭️ Sem código no subject: ${card.subject}`);
          skipped++;
          continue;
        }

        const codigo = codeMatch[1];

        // Consultar rastreio real
        const rastreioResponse = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });

        if (!rastreioResponse.ok) {
          console.log(`⚠️ Rastreio falhou para ${codigo}: ${rastreioResponse.status}`);
          // Se 404/sem dados e status é pre_postado, manter
          skipped++;
          continue;
        }

        const rastreioData = await rastreioResponse.json();
        const dados = rastreioData?.data || rastreioData;
        const eventos = dados?.eventos || [];

        if (eventos.length === 0) {
          // Sem eventos = pré-postado (manter)
          skipped++;
          continue;
        }

        const newStatus = mapTrackingEventToStatus(eventos);
        if (!newStatus) {
          skipped++;
          continue;
        }

        // Verificar se é uma progressão válida (não retroceder)
        const currentIdx = RASTREIO_FLOW.indexOf(card.status);
        const newIdx = RASTREIO_FLOW.indexOf(newStatus);

        // Permitir "atrasado" independentemente (pode vir de qualquer estágio)
        const isValidProgression = newStatus === "atrasado" || newIdx > currentIdx;

        if (!isValidProgression) {
          skipped++;
          continue;
        }

        // Atualizar card
        await supabase
          .from("ai_support_pipeline")
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", card.id);

        console.log(`✅ ${codigo}: ${card.status} → ${newStatus} (${card.contact_name})`);
        results.push({ codigo, from: card.status, to: newStatus, contact: card.contact_name });
        updated++;

        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 200));
      } catch (cardErr) {
        console.error(`❌ Erro no card ${card.id}:`, cardErr);
        errors++;
      }
    }

    console.log(`📊 Reconciliação: ${updated} atualizados, ${skipped} ignorados, ${errors} erros, ${cards.length} total`);

    return new Response(
      JSON.stringify({ ok: true, updated, skipped, errors, total: cards.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ Erro:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
