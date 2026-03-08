// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

/**
 * Formata nome COMPLETO com Title Case (preserva todas as palavras)
 */
function formatFullName(fullName: string): string {
  const name = (fullName || "").trim();
  if (!name) return "";
  // Converte UPPERCASE para Title Case, preserva nomes curtos como "da", "de", "do"
  return name
    .split(/\s+/)
    .map((word, i) => {
      const lower = word.toLowerCase();
      // Preposições permanecem minúsculas (exceto se for a primeira palavra)
      if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) {
        return lower;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Resolve nome real do remetente evitando genéricos.
 * Hierarquia: nome direto → remetente.nome → remetenteId → cpf_cnpj → cliente.nome → "Loja"
 */
async function resolverNomeRemetente(
  supabase: any,
  envio: any
): Promise<string> {
  const genericos = ["remetente", "loja", ""];

  const isGenerico = (n: string) => {
    const l = (n || "").trim().toLowerCase();
    return genericos.includes(l) || l.length < 2;
  };

  // 1. Nome direto do remetente (campo remetenteNome)
  const nomeDireto = (envio.remetenteNome || "").trim();
  if (!isGenerico(nomeDireto)) {
    return formatFullName(nomeDireto);
  }

  // 2. Objeto aninhado remetente.nome (API retorna)
  const nomeObjeto = (envio.remetente?.nome || "").trim();
  if (!isGenerico(nomeObjeto)) {
    return formatFullName(nomeObjeto);
  }

  // 3. Nome do cliente (API retorna cliente.nome)
  const nomeCliente = (envio.cliente?.nome || "").trim();

  // 4. Buscar via remetenteId no banco
  const remetenteId = envio.remetenteId || envio.remetente_id;
  if (remetenteId) {
    try {
      const { data: rem } = await supabase
        .from("remetentes")
        .select("nome")
        .eq("id", remetenteId)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via ID: "${rem.nome}"`);
        return formatFullName(rem.nome);
      }
    } catch (err) {
      console.warn("⚠️ Erro ao resolver remetente por ID:", err);
    }
  }

  // 5. Buscar via CPF/CNPJ do remetente
  const cpfCnpj = envio.remetenteCpfCnpj || envio.remetente?.cpfCnpj || "";
  if (cpfCnpj) {
    try {
      const { data: rem } = await supabase
        .from("remetentes")
        .select("nome")
        .eq("cpf_cnpj", cpfCnpj.replace(/\D/g, ""))
        .limit(1)
        .maybeSingle();
      if (rem?.nome && !isGenerico(rem.nome)) {
        console.log(`🔍 Remetente resolvido via CPF/CNPJ: "${rem.nome}"`);
        return formatFirstName(rem.nome);
      }
    } catch (err) {
      console.warn("⚠️ Erro ao resolver remetente por CPF/CNPJ:", err);
    }
  }

  // 6. Fallback: nome do cliente
  if (!isGenerico(nomeCliente)) {
    console.log(`🔍 Usando nome do cliente como remetente: "${nomeCliente}"`);
    return formatFirstName(nomeCliente);
  }

  console.warn("⚠️ Nenhum nome de remetente encontrado, usando fallback");
  return "Loja";
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Login admin na API externa
    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");
    if (!adminEmail || !adminPassword) {
      throw new Error("Credenciais admin não configuradas");
    }

    console.log("🔄 [CronEtiquetaCriada] Iniciando verificação...");

    const loginRes = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!loginRes.ok) throw new Error(`Login falhou: ${loginRes.status}`);
    const { token } = await loginRes.json();

    // Buscar emissões recentes com status PRE_POSTADO (últimas criadas)
    // A API retorna as mais recentes primeiro
    const statuses = ["PRE_POSTADO", "POSTADO"];
    let allEmissoes: any[] = [];

    for (const status of statuses) {
      try {
        const res = await fetch(
          `${BASE_API_URL}/emissoes/admin?status=${status}&limit=50&offset=0`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          const items = data?.data || [];
          console.log(`📦 ${items.length} emissões com status ${status}`);
          allEmissoes = allEmissoes.concat(items);
        }
      } catch (err) {
        console.warn(`⚠️ Erro ao buscar status ${status}:`, err);
      }
    }

    if (allEmissoes.length === 0) {
      console.log("📭 Nenhuma emissão recente encontrada");
      return new Response(
        JSON.stringify({ success: true, notificados: 0, message: "Nenhuma emissão recente" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filtrar apenas emissões das últimas 6 horas (para não reprocessar antigas)
    const duasHorasAtras = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const emissoesFiltradas = allEmissoes.filter((e: any) => {
      const dataCriacao = e.criadoEm || e.createdAt || e.created_at || "";
      return dataCriacao >= duasHorasAtras;
    });

    console.log(`⏰ ${emissoesFiltradas.length} emissões nas últimas 2 horas (de ${allEmissoes.length} total)`);

    if (emissoesFiltradas.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificados: 0, message: "Nenhuma emissão recente (últimas 2h)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar quais códigos já foram notificados (verificar em whatsapp_messages)
    const codigosObjetos = emissoesFiltradas
      .map((e: any) => e.codigoObjeto)
      .filter(Boolean);

    // Verificar nas mensagens outbound se já existe HSM com esse código
    const { data: mensagensExistentes } = await supabase
      .from("whatsapp_messages")
      .select("content")
      .eq("content_type", "hsm")
      .eq("direction", "outbound")
      .gte("created_at", duasHorasAtras);

    const codigosJaNotificados = new Set<string>();
    if (mensagensExistentes) {
      for (const msg of mensagensExistentes) {
        // Extrair código de rastreio da mensagem HSM
        const content = msg.content || "";
        for (const cod of codigosObjetos) {
          if (content.includes(cod)) {
            codigosJaNotificados.add(cod);
          }
        }
      }
    }

    // Verificar também via metadata (mais preciso)
    const { data: hsmMessages } = await supabase
      .from("whatsapp_messages")
      .select("metadata")
      .eq("content_type", "hsm")
      .eq("direction", "outbound")
      .gte("created_at", duasHorasAtras);

    if (hsmMessages) {
      for (const msg of hsmMessages) {
        const meta = msg.metadata as any;
        if (meta?.template_name === "pedido_criado_brhub" && meta?.variables?.codigo_rastreio) {
          codigosJaNotificados.add(meta.variables.codigo_rastreio);
        }
      }
    }

    console.log(`🔍 ${codigosJaNotificados.size} códigos já notificados`);

    const emissoesPendentes = emissoesFiltradas.filter(
      (e: any) => e.codigoObjeto && !codigosJaNotificados.has(e.codigoObjeto)
    );

    console.log(`📬 ${emissoesPendentes.length} emissões pendentes de notificação`);

    let notificados = 0;
    const erros: string[] = [];

    for (const envio of emissoesPendentes) {
      try {
        const destinatario = envio.destinatario || {};
        const codigoRastreio = envio.codigoObjeto || "";

        // Extrair celular do destinatário
        let celular =
          destinatario.celular ||
          destinatario.telefone ||
          envio.destinatarioCelular ||
          envio.destinatario_celular ||
          "";
        celular = String(celular).replace(/\D/g, "");
        if (!celular) {
          console.log(`⏭️ ${codigoRastreio}: sem celular do destinatário`);
          erros.push(`${codigoRastreio}: celular vazio`);
          continue;
        }
        if (!celular.startsWith("55")) celular = "55" + celular;

        // Nome destinatário
        const nomeDestinatario = formatFirstName(
          destinatario.nome || envio.destinatarioNome || "Cliente"
        );

        // Nome remetente — passa o envio inteiro para resolução completa
        const nomeRemetente = await resolverNomeRemetente(supabase, envio);

        console.log(`📲 Notificando ${codigoRastreio}: ${celular} (${nomeDestinatario} / ${nomeRemetente})`);

        // Chamar send-whatsapp-template internamente
        const templateRes = await fetch(
          `${supabaseUrl}/functions/v1/send-whatsapp-template`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              trigger_key: "etiqueta_criada",
              phone: celular,
              variables: {
                nome_destinatario: nomeDestinatario,
                nome_remetente: nomeRemetente,
                codigo_rastreio: codigoRastreio,
              },
            }),
          }
        );

        if (templateRes.ok) {
          notificados++;
          console.log(`✅ ${codigoRastreio}: notificação enviada`);
        } else {
          const errText = await templateRes.text();
          console.error(`❌ ${codigoRastreio}: falha no template - ${templateRes.status}: ${errText.substring(0, 200)}`);
          erros.push(`${codigoRastreio}: template error ${templateRes.status}`);
        }
      } catch (err: any) {
        const msg = err?.message || "erro desconhecido";
        console.error(`❌ ${envio.codigoObjeto}: ${msg}`);
        erros.push(`${envio.codigoObjeto}: ${msg}`);
      }
    }

    console.log(`🏁 Finalizado: ${notificados} notificados, ${erros.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        total_emissoes: allEmissoes.length,
        filtradas_2h: emissoesFiltradas.length,
        ja_notificadas: codigosJaNotificados.size,
        notificados_agora: notificados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no CRON notificar-etiqueta-criada:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
