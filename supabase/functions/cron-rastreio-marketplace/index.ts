// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rastrearMarketplace } from "../_shared/marketplace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function formatFullName(fullName: string): string {
  const name = (fullName || "").trim();
  if (!name) return "";
  return name
    .split(/\s+/)
    .map((w, i) => {
      const l = w.toLowerCase();
      if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(l)) return l;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
}

function normStatus(raw: string): string {
  const s = String(raw || "").toUpperCase();
  if (s.includes("ENTREGUE")) return "ENTREGUE";
  if (s.includes("SAIU PARA ENTREGA") || s.includes("OUT_FOR_DELIVERY")) return "SAIU_PARA_ENTREGA";
  if (s.includes("AGUARDANDO RETIRADA") || s.includes("DISPONIVEL PARA RETIRADA")) return "AGUARDANDO_RETIRADA";
  if (s.includes("POSTADO") && !s.includes("PRE")) return "POSTADO";
  if (s.includes("ATRAS")) return "ATRASADO";
  return s || "PRE_POSTADO";
}

async function disparaHsm(
  supabaseUrl: string,
  serviceKey: string,
  triggerKey: string,
  phone: string,
  variables: Record<string, string>,
) {
  const r = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ trigger_key: triggerKey, phone, variables }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`HSM ${triggerKey} falhou: ${r.status} ${t.substring(0, 200)}`);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const inicio = Date.now();
  const log: any[] = [];
  let processadas = 0;
  let notificadas = 0;
  const erros: string[] = [];

  try {
    // Pega emissões não-entregues, priorizando as mais antigas sem rastreio recente
    const { data: rows, error } = await supabase
      .from("emissoes_marketplace")
      .select(
        "id, codigo_objeto, destinatario_nome, destinatario_celular, remetente_nome, " +
          "status_rastreio, prazo, created_at, data_postagem, " +
          "notificou_postado, notificou_saiu_entrega, notificou_aguardando_retirada, " +
          "notificou_atraso, notificou_entregue, ultimo_rastreio_em",
      )
      .or("status_rastreio.is.null,status_rastreio.neq.ENTREGUE")
      .not("codigo_objeto", "is", null)
      .order("ultimo_rastreio_em", { ascending: true, nullsFirst: true })
      .limit(60);

    if (error) throw error;

    for (const r of rows || []) {
      processadas++;
      try {
        const tracking = await rastrearMarketplace(r.codigo_objeto);
        const eventos = tracking?.eventos || [];
        const ultimo = eventos[0] || null;
        const rawStatus = tracking?.status || tracking?.statusDescricao || ultimo?.descricao || "";
        const status = normStatus(rawStatus);

        // datas
        let dataPostagem: string | null = r.data_postagem;
        let dataEntrega: string | null = null;
        for (const ev of eventos) {
          const desc = String(ev?.descricao || "").toUpperCase();
          const dt = ev?.dtHrCriado || ev?.data || ev?.dataHora || null;
          if (!dataPostagem && desc.includes("POSTADO")) dataPostagem = dt;
          if (!dataEntrega && desc.includes("ENTREGUE")) dataEntrega = dt;
        }

        const updates: Record<string, any> = {
          status_rastreio: status,
          ultimo_evento_em: ultimo?.dtHrCriado || ultimo?.data || ultimo?.dataHora || null,
          historico_rastreio: eventos,
          data_previsao_entrega: tracking?.dataPrevisaoEntrega || null,
          ultimo_rastreio_em: new Date().toISOString(),
        };
        if (dataPostagem) updates.data_postagem = dataPostagem;
        if (dataEntrega) updates.data_entrega = dataEntrega;
        if (status === "ENTREGUE") updates.status = "entregue";

        // Disparos WhatsApp com flags de dedup
        let celular = String(r.destinatario_celular || "").replace(/\D/g, "");
        const podeNotificar = !!celular;
        if (celular && !celular.startsWith("55")) celular = "55" + celular;

        const nomeDest = formatFullName(r.destinatario_nome || "Cliente");
        const nomeRem = formatFullName(r.remetente_nome || "Loja");
        const vars = {
          nome_destinatario: nomeDest,
          nome_remetente: nomeRem,
          codigo_rastreio: r.codigo_objeto,
        };

        if (podeNotificar) {
          if (status === "POSTADO" && !r.notificou_postado) {
            await disparaHsm(supabaseUrl, serviceKey, "objeto_postado", celular, vars);
            updates.notificou_postado = true;
            notificadas++;
          }
          if (status === "SAIU_PARA_ENTREGA" && !r.notificou_saiu_entrega) {
            await disparaHsm(supabaseUrl, serviceKey, "saiu_para_entrega", celular, vars);
            updates.notificou_saiu_entrega = true;
            notificadas++;
          }
          if (status === "AGUARDANDO_RETIRADA" && !r.notificou_aguardando_retirada) {
            await disparaHsm(supabaseUrl, serviceKey, "aguardando_retirada", celular, vars);
            updates.notificou_aguardando_retirada = true;
            notificadas++;
          }
          // Atraso: status ainda em postado/saiu e ultrapassou prazo desde a postagem
          if (
            !r.notificou_atraso &&
            r.prazo &&
            (status === "POSTADO" || status === "SAIU_PARA_ENTREGA") &&
            (r.data_postagem || dataPostagem)
          ) {
            const ref = new Date(r.data_postagem || dataPostagem!).getTime();
            const diasDecorridos = Math.floor((Date.now() - ref) / 86400000);
            if (diasDecorridos > Number(r.prazo) + 1) {
              try {
                await disparaHsm(supabaseUrl, serviceKey, "aviso_atraso", celular, vars);
                updates.notificou_atraso = true;
                notificadas++;
              } catch (e: any) {
                erros.push(`atraso ${r.codigo_objeto}: ${e.message}`);
              }
            }
          }
        }

        await supabase.from("emissoes_marketplace").update(updates).eq("id", r.id);
        log.push({ codigo: r.codigo_objeto, status });
      } catch (e: any) {
        erros.push(`${r.codigo_objeto}: ${e?.message || "erro"}`);
        // marca tentativa para não travar fila
        await supabase
          .from("emissoes_marketplace")
          .update({ ultimo_rastreio_em: new Date().toISOString() })
          .eq("id", r.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        duracao_ms: Date.now() - inicio,
        processadas,
        notificadas,
        erros,
        amostra: log.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("❌ cron-rastreio-marketplace:", e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || "erro" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
