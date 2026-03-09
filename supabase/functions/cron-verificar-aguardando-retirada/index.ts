// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";

async function resolverNomeRemetente(supabase: any, envio: any): Promise<string> {
  const genericos = ["remetente", "loja", ""];
  const isGenerico = (n: string) => {
    const l = (n || "").trim().toLowerCase();
    return genericos.includes(l) || l.length < 2;
  };
  const formatFullName = (n: string) => {
    const name = n.trim();
    if (!name) return "";
    return name.split(/\s+/).map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && ["da", "de", "do", "das", "dos", "e"].includes(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let codigoObjetoFiltro: string | null = null;
    try {
      const body = await req.json();
      codigoObjetoFiltro = body?.codigoObjeto || null;
    } catch {}

    console.log("🔄 Iniciando verificação de envios AGUARDANDO_RETIRADA...");
    if (codigoObjetoFiltro) {
      console.log(`🎯 Modo REENVIO para objeto específico: ${codigoObjetoFiltro}`);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
    const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");
    if (!adminEmail || !adminPassword) throw new Error("Credenciais de admin não configuradas");

    const loginResponse = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    if (!loginResponse.ok) throw new Error(`Falha no login admin: ${loginResponse.status}`);
    const { token } = await loginResponse.json();

    // Buscar envios AGUARDANDO_RETIRADA
    const enviosResponse = await fetch(
      `${BASE_API_URL}/emissoes/admin?status=AGUARDANDO_RETIRADA&limit=100&offset=0`,
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    if (!enviosResponse.ok) throw new Error(`Falha ao buscar envios: ${enviosResponse.status}`);
    const enviosData = await enviosResponse.json();
    let envios = enviosData?.data || [];

    if (codigoObjetoFiltro) {
      envios = envios.filter((e: any) => e.codigoObjeto === codigoObjetoFiltro);
    }

    console.log(`📊 ${envios.length} envios AGUARDANDO_RETIRADA`);

    if (envios.length === 0) {
      return new Response(
        JSON.stringify({ success: true, notificados: 0, message: "Nenhum envio encontrado" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduplicar (exceto reenvio individual)
    let codigosJaNotificados = new Set<string>();
    if (!codigoObjetoFiltro) {
      const codigosObjetos = envios.map((e: any) => e.codigoObjeto).filter(Boolean);
      const { data: jaNotificados } = await supabase
        .from("notificacoes_aguardando_retirada")
        .select("codigo_objeto")
        .in("codigo_objeto", codigosObjetos);
      codigosJaNotificados = new Set((jaNotificados || []).map((n: any) => n.codigo_objeto));
    }

    const enviosPendentes = codigoObjetoFiltro
      ? envios
      : envios.filter((e: any) => e.codigoObjeto && !codigosJaNotificados.has(e.codigoObjeto));

    console.log(`📬 ${enviosPendentes.length} pendentes de notificação`);

    let notificados = 0;
    const erros: string[] = [];

    for (const envio of enviosPendentes) {
      try {
        // Buscar dados de rastreio para obter informações da unidade de retirada
        let rastreioData: any = null;
        if (envio.codigoObjeto) {
          try {
            const rastreioUrl = `${BASE_API_URL}/rastrear?codigo=${envio.codigoObjeto}`;
            const rastreioResponse = await fetch(rastreioUrl, {
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (rastreioResponse.ok) {
              const rastreioJson = await rastreioResponse.json();
              rastreioData = rastreioJson.data || rastreioJson;
            }
          } catch (rastreioErr) {
            console.log(`⚠️ Erro ao obter rastreio de ${envio.codigoObjeto}:`, rastreioErr);
          }
        }

        // Extrair dados do evento LDI
        const eventos = Array.isArray(rastreioData) ? rastreioData : (rastreioData?.eventos || []);
        const eventoLDI = eventos.find((e: any) => e.codigo === "LDI") || eventos[0] || {};
        const unidade = eventoLDI.unidade || {};
        const enderecoUnidade = unidade.endereco || {};

        const cidadeUf = unidade.cidadeUf || "";
        const [cidadeFallback, ufFallback] = cidadeUf.includes("-") ? cidadeUf.split("-") : [cidadeUf, ""];

        const destinatario = envio.destinatario || {};

        // Check override de celular
        let celularOverride: string | null = null;
        const { data: overrideData } = await supabase
          .from("celulares_override")
          .select("celular")
          .eq("codigo_objeto", envio.codigoObjeto)
          .maybeSingle();
        if (overrideData?.celular) {
          celularOverride = overrideData.celular;
          console.log(`📱 Celular OVERRIDE: "${celularOverride}"`);
        }

        let celular = celularOverride || destinatario.celular || destinatario.telefone ||
          envio.destinatarioCelular || envio.destinatario_celular || "";
        celular = String(celular).replace(/\D/g, "");
        if (!celular) {
          erros.push(`${envio.codigoObjeto}: celular vazio`);
          continue;
        }
        if (!celular.startsWith("55")) celular = "55" + celular;

        const nomeRemetente = await resolverNomeRemetente(supabase, envio);
        const nomeDestinatario = destinatario.nome || envio.destinatarioNome || "";

        // Montar nome e endereço da agência
        const nomeAgencia = unidade.tipo || "Agência dos Correios";
        const bairroAgencia = enderecoUnidade.bairro || "";
        const enderecoAgencia = [
          enderecoUnidade.logradouro,
          enderecoUnidade.numero ? `nº ${enderecoUnidade.numero}` : "",
          enderecoUnidade.bairro,
          enderecoUnidade.cidade || cidadeFallback || "",
          enderecoUnidade.uf || ufFallback || "",
        ].filter(Boolean).join(", ");

        console.log(`📲 Notificando retirada_agencia: ${envio.codigoObjeto} → ${celular}`);

        // Enviar via send-whatsapp-template (centralizado) em vez do DataCrazy
        const templateRes = await fetch(
          `${supabaseUrl}/functions/v1/send-whatsapp-template`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              trigger_key: "retirada_agencia",
              phone: celular,
              variables: {
                nome_destinatario: nomeDestinatario,
                codigo_rastreio: envio.codigoObjeto,
                nome_remetente: nomeRemetente,
                nome_agencia: nomeAgencia,
                bairro_agencia: bairroAgencia,
                endereco_agencia: enderecoAgencia,
              },
            }),
          }
        );

        const templateOk = templateRes.ok;
        const responseText = await templateRes.text();

        // Registrar na tabela de notificações
        await supabase.from("notificacoes_aguardando_retirada").insert({
          codigo_objeto: envio.codigoObjeto,
          destinatario_nome: nomeDestinatario,
          remetente_nome: nomeRemetente,
          destinatario_celular: celular,
          webhook_response: templateOk
            ? `OK via send-whatsapp-template: ${responseText.substring(0, 450)}`
            : `ERRO ${templateRes.status}: ${responseText.substring(0, 450)}`,
        });

        if (templateOk) {
          notificados++;
          console.log(`✅ ${envio.codigoObjeto}: notificado via send-whatsapp-template`);
        } else {
          console.error(`❌ ${envio.codigoObjeto}: falha - ${templateRes.status}`);
          erros.push(`${envio.codigoObjeto}: ${templateRes.status}`);
        }

        await new Promise(r => setTimeout(r, 200));
      } catch (err: any) {
        console.error(`❌ ${envio.codigoObjeto}: ${err.message}`);
        erros.push(`${envio.codigoObjeto}: ${err.message}`);
      }
    }

    console.log(`🏁 Finalizado: ${notificados} notificados, ${erros.length} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        total_encontrados: envios.length,
        ja_notificados: codigosJaNotificados.size,
        notificados_agora: notificados,
        erros: erros.length > 0 ? erros : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro no CRON verificar-aguardando-retirada:", error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
