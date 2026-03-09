// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

async function fetchDataPrevisao(token: string, codigoObjeto: string): Promise<string> {
  try {
    const response = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigoObjeto}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) return "";
    const result = await response.json();
    const previsao = result?.data?.dataPrevisaoEntrega || "";
    if (!previsao) return "";
    // Formatar a data
    try {
      const d = new Date(previsao);
      if (isNaN(d.getTime())) return previsao;
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    } catch {
      return previsao;
    }
  } catch (err) {
    console.warn(`⚠️ Erro ao buscar rastreio de ${codigoObjeto}:`, err);
    return "";
  }
}

function formatFullName(fullName: string): string {
  const name = (fullName || "").trim();
  if (!name) return "";
  return name.split(/\s+/).map((word, i) => {
    const lower = word.toLowerCase();
    if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(" ");
}

async function resolverNomeRemetente(supabase: any, envio: any): Promise<string> {
  const genericos = ["remetente", "loja", ""];
  const isGenerico = (n: string) => {
    const l = (n || "").trim().toLowerCase();
    return genericos.includes(l) || l.length < 2;
  };

  const nomeDireto = (envio.remetenteNome || "").trim();
  if (!isGenerico(nomeDireto)) return formatFullName(nomeDireto);

  const nomeObjeto = (envio.remetente?.nome || "").trim();
  if (!isGenerico(nomeObjeto)) return formatFullName(nomeObjeto);

  const remetenteId = envio.remetenteId || envio.remetente_id;
  if (remetenteId) {
    try {
      const { data: rem } = await supabase.from("remetentes").select("nome").eq("id", remetenteId).maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) return formatFullName(rem.nome);
    } catch {}
  }

  const cpfCnpj = envio.remetenteCpfCnpj || envio.remetente?.cpfCnpj || "";
  if (cpfCnpj) {
    try {
      const { data: rem } = await supabase.from("remetentes").select("nome").eq("cpf_cnpj", cpfCnpj.replace(/\D/g, "")).limit(1).maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) return formatFullName(rem.nome);
    } catch {}
  }

  const nomeCliente = (envio.cliente?.nome || "").trim();
  if (!isGenerico(nomeCliente)) return formatFullName(nomeCliente);

  return "Loja";
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
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

    console.log("🔄 [CronObjetoPostado] Iniciando verificação...");

    // Login admin
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

    // Buscar emissões com status POSTADO
    const res = await fetch(
      `${BASE_API_URL}/emissoes/admin?status=POSTADO&limit=50&offset=0`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!res.ok) throw new Error(`Falha ao buscar emissões: ${res.status}`);
    const data = await res.json();
    const allEmissoes = data?.data || [];

    console.log(`📦 ${allEmissoes.length} emissões com status POSTADO`);

    if (allEmissoes.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificados: 0, message: "Nenhuma emissão POSTADO encontrada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicar: verificar quais já foram notificados com trigger objeto_postado (sem limite de tempo)
    const codigosObjetos = allEmissoes.map((e: any) => e.codigoObjeto).filter(Boolean);

    const { data: hsmMessages } = await supabase
      .from("whatsapp_messages")
      .select("metadata")
      .eq("content_type", "hsm")
      .eq("direction", "outbound");

    const codigosJaNotificados = new Set<string>();
    if (hsmMessages) {
      for (const msg of hsmMessages) {
        const meta = msg.metadata as any;
        if (meta?.trigger_key === "objeto_postado" && meta?.variables?.codigo_rastreio) {
          codigosJaNotificados.add(meta.variables.codigo_rastreio);
        }
      }
    }

    console.log(`🔍 ${codigosJaNotificados.size} já notificados como objeto_postado`);

    const emissoesPendentes = allEmissoes.filter(
      (e: any) => e.codigoObjeto && !codigosJaNotificados.has(e.codigoObjeto)
    );

    console.log(`📬 ${emissoesPendentes.length} pendentes de notificação`);

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
        const nomeRemetente = await resolverNomeRemetente(supabase, envio);
        const dataPrevisao = formatDate(envio.dataPrevisaoEntrega || "");

        console.log(`📲 Notificando objeto_postado: ${codigoRastreio} → ${celular}`);

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
              phone: celular,
              variables: {
                nome_destinatario: nomeDestinatario,
                nome_remetente: nomeRemetente,
                codigo_rastreio: codigoRastreio,
                data_previsao_entrega: dataPrevisao,
              },
            }),
          }
        );

        if (templateRes.ok) {
          notificados++;
          console.log(`✅ ${codigoRastreio}: notificado`);
        } else {
          const errText = await templateRes.text();
          console.error(`❌ ${codigoRastreio}: ${templateRes.status} - ${errText.substring(0, 200)}`);
          erros.push(`${codigoRastreio}: ${templateRes.status}`);
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        erros.push(`${envio.codigoObjeto}: ${err.message}`);
      }
    }

    console.log(`🏁 Finalizado: ${notificados} notificados, ${erros.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        total: allEmissoes.length,
        pendentes: emissoesPendentes.length,
        ja_notificadas: codigosJaNotificados.size,
        notificados_agora: notificados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no CRON objeto-postado:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
