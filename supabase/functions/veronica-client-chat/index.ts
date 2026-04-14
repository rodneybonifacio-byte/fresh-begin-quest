// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBrhubToken } from "../_shared/brhubAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-brhub-authorization, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// HELPER: Roteamento multi-provider (OpenAI / Gemini)
// ═══════════════════════════════════════════════════════════

function getAIEndpoint(provider: string): { url: string; apiKey: string; providerName: string } {
  const p = (provider || "gemini").toLowerCase();
  if (p === "openai") {
    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) throw new Error("OPENAI_API_KEY não configurada");
    return { url: "https://api.openai.com/v1/chat/completions", apiKey: key, providerName: "openai" };
  }
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY não configurada");
  return { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", apiKey: key, providerName: "gemini" };
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

async function getAdminToken(): Promise<string | null> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
  const email = Deno.env.get("API_ADMIN_EMAIL");
  const password = Deno.env.get("API_ADMIN_PASSWORD");
  if (!email || !password) return null;
  try {
    const resp = await fetch(`${BASE_API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.token || null;
  } catch {
    return null;
  }
}

async function fetchTrackingData(codigo: string): Promise<any> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
  const token = await getAdminToken();
  if (!token) return null;
  try {
    const resp = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

function formatTrackingForAI(rastreioData: any): string {
  const dados = rastreioData?.data || rastreioData;
  const eventos = dados?.eventos || [];
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  let result = `📅 Data de hoje: ${hoje}\n`;
  if (dados?.codigoObjeto) result += `Código: ${dados.codigoObjeto}\n`;
  if (dados?.servico) result += `Serviço: ${dados.servico}\n`;
  if (dados?.dataPrevisaoEntrega) result += `Previsão de entrega: ${dados.dataPrevisaoEntrega}\n`;
  if (eventos.length > 0) {
    result += `Últimos eventos:\n`;
    for (const ev of eventos.slice(0, 8)) {
      const local = ev.unidade?.cidadeUf || "";
      result += `- ${ev.dataCompleta || ev.date || ""} ${ev.horario || ""}: ${ev.descricao || ""}`;
      if (local) result += ` (${local})`;
      if (ev.unidadeDestino?.cidadeUf) result += ` → ${ev.unidadeDestino.cidadeUf}`;
      if (ev.detalhe) result += ` — ${ev.detalhe}`;
      result += "\n";
    }
  } else {
    result += "Nenhum evento de rastreio encontrado.\n";
  }
  return result;
}

function extractEmissoesFromResponse(emData: any): any[] {
  const candidates = [
    emData?.content,
    emData?.data?.content,
    emData?.data,
    emData?.items,
    emData?.results,
    emData,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function getEmissaoDestinatarioNome(emissao: any): string {
  return emissao?.destinatario?.nome || emissao?.destinatarioNome || emissao?.nomeDestinatario || "?";
}

function getEmissaoDestinatarioCep(emissao: any): string {
  return emissao?.destinatario?.cep || emissao?.destinatarioCep || emissao?.cepDestinatario || "?";
}

function getEmissaoValor(emissao: any): string | number {
  return emissao?.valorPostagem ?? emissao?.valor ?? emissao?.valorGasto ?? "?";
}

// ═══════════════════════════════════════════════════════════
// TOOL DEFINITIONS (OpenAI Function Calling)
// ═══════════════════════════════════════════════════════════

const tools = [
  {
    type: "function",
    function: {
      name: "rastrear_objeto",
      description: "Rastreia um objeto/pacote pelos Correios ou transportadora. Retorna status em tempo real.",
      parameters: {
        type: "object",
        properties: {
          codigo_rastreio: { type: "string", description: "Código de rastreio do objeto (ex: AD268613727BR)" },
        },
        required: ["codigo_rastreio"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_emissoes",
      description: "Lista as emissões/etiquetas do cliente com detalhes (código, status, destinatário, serviço, valor).",
      parameters: {
        type: "object",
        properties: {
          quantidade: { type: "number", description: "Quantidade de emissões a retornar (padrão 20, máx 50)" },
          status: { type: "string", description: "Filtrar por status (ex: POSTADO, ENTREGUE, PRE_POSTADO)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_saldo",
      description: "Consulta o saldo disponível e créditos bloqueados do cliente.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "consultar_extrato",
      description: "Consulta o extrato de transações de crédito do cliente (recargas, consumos).",
      parameters: {
        type: "object",
        properties: {
          limite: { type: "number", description: "Número de transações (padrão 10)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_remetentes",
      description: "Lista os remetentes (lojas) cadastrados do cliente com endereço e contato.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "cotacao_frete",
      description: "Faz cotação de frete entre dois CEPs. Retorna opções com preço e prazo.",
      parameters: {
        type: "object",
        properties: {
          cep_origem: { type: "string", description: "CEP de origem" },
          cep_destino: { type: "string", description: "CEP de destino" },
          peso: { type: "number", description: "Peso em kg (padrão 0.3)" },
          altura: { type: "number", description: "Altura em cm (padrão 2)" },
          largura: { type: "number", description: "Largura em cm (padrão 11)" },
          comprimento: { type: "number", description: "Comprimento em cm (padrão 16)" },
        },
        required: ["cep_origem", "cep_destino"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "emitir_etiqueta",
      description: "Gera/emite uma etiqueta de envio para o cliente. Precisa de dados do destinatário, serviço e dimensões.",
      parameters: {
        type: "object",
        properties: {
          remetente_cpf_cnpj: { type: "string", description: "CPF ou CNPJ do remetente" },
          destinatario_nome: { type: "string", description: "Nome completo do destinatário" },
          destinatario_cpf_cnpj: { type: "string", description: "CPF ou CNPJ do destinatário" },
          destinatario_cep: { type: "string", description: "CEP do destinatário" },
          destinatario_logradouro: { type: "string", description: "Rua/Avenida" },
          destinatario_numero: { type: "string", description: "Número" },
          destinatario_complemento: { type: "string", description: "Complemento" },
          destinatario_bairro: { type: "string", description: "Bairro" },
          destinatario_cidade: { type: "string", description: "Cidade" },
          destinatario_uf: { type: "string", description: "Estado (UF)" },
          destinatario_celular: { type: "string", description: "Celular do destinatário" },
          destinatario_email: { type: "string", description: "Email do destinatário" },
          servico: { type: "string", description: "Serviço de frete (SEDEX, PAC, etc)" },
          peso: { type: "number", description: "Peso em kg" },
          altura: { type: "number", description: "Altura em cm" },
          largura: { type: "number", description: "Largura em cm" },
          comprimento: { type: "number", description: "Comprimento em cm" },
          valor_declarado: { type: "number", description: "Valor declarado em R$" },
        },
        required: ["remetente_cpf_cnpj", "destinatario_nome", "destinatario_cep", "servico", "peso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_etiquetas_pendentes",
      description: "Lista etiquetas com erro pendentes de correção.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_recargas",
      description: "Lista recargas PIX recentes do cliente.",
      parameters: { type: "object", properties: {} },
    },
  },
];

// ═══════════════════════════════════════════════════════════
// TOOL EXECUTION
// ═══════════════════════════════════════════════════════════

async function executeTool(
  toolName: string,
  args: any,
  clienteId: string,
  brhubToken: string,
  supabase: any
): Promise<string> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";

  try {
    switch (toolName) {
      case "rastrear_objeto": {
        const data = await fetchTrackingData(args.codigo_rastreio);
        if (!data) return `Código ${args.codigo_rastreio} não retornou dados. Pode estar incorreto ou ainda não postado.`;
        return formatTrackingForAI(data);
      }

      case "listar_emissoes": {
        const qty = Math.min(args.quantidade || 20, 50);
        const url = `${BASE_API_URL}/emissoes?page=0&size=${qty}&sort=criadoEm,desc`;
        console.log(`📋 listar_emissoes: GET ${url}`);
        const resp = await fetch(url, {
          headers: { Authorization: `Bearer ${brhubToken}`, "Content-Type": "application/json" },
        });
        console.log(`📋 listar_emissoes: status=${resp.status}`);
        if (!resp.ok) {
          const errBody = await resp.text().catch(() => "");
          console.log(`📋 listar_emissoes: erro body=${errBody.substring(0, 500)}`);
          return `Erro ao buscar emissões: ${resp.status}`;
        }
        const emData = await resp.json();
        const emList = extractEmissoesFromResponse(emData);
        console.log(`📋 listar_emissoes: keys=${Object.keys(emData || {})}, count=${emList.length}`);
        if (emList.length === 0) return "Nenhuma emissão encontrada.";

        let filtered = emList;
        if (args.status) {
          filtered = emList.filter((e: any) => (e.status || "").toUpperCase().includes(args.status.toUpperCase()));
        }

        if (filtered.length === 0) return `Não encontrei emissões com status ${args.status}.`;

        let result = `📦 ${filtered.length} emissões encontradas:\n\n`;
        for (const e of filtered.slice(0, qty)) {
          result += `- **${e.codigoObjeto || "sem código"}** | ${e.servico || "?"} | Status: ${e.status || "?"}\n`;
          result += `  Dest: ${getEmissaoDestinatarioNome(e)} | CEP: ${getEmissaoDestinatarioCep(e)}\n`;
          result += `  Valor: R$ ${getEmissaoValor(e)} | Data: ${e.criadoEm ? new Date(e.criadoEm).toLocaleDateString("pt-BR") : "?"}\n\n`;
        }
        return result;
      }

      case "consultar_saldo": {
        const [saldo, bloqueados] = await Promise.all([
          supabase.rpc("calcular_saldo_disponivel", { p_cliente_id: clienteId }),
          supabase.rpc("calcular_creditos_bloqueados", { p_cliente_id: clienteId }),
        ]);
        return `💰 Saldo disponível: R$ ${Number(saldo.data ?? 0).toFixed(2)}\n🔒 Créditos bloqueados: R$ ${Number(bloqueados.data ?? 0).toFixed(2)}`;
      }

      case "consultar_extrato": {
        const { data: transacoes } = await supabase.rpc("buscar_transacoes_cliente", {
          p_cliente_id: clienteId,
          p_limit: args.limite || 10,
        });
        if (!transacoes || transacoes.length === 0) return "Nenhuma transação encontrada.";
        let result = "📊 Últimas transações:\n";
        for (const t of transacoes.slice(0, 15)) {
          const dt = new Date(t.created_at).toLocaleDateString("pt-BR");
          result += `- ${dt}: ${t.tipo} R$ ${Math.abs(t.valor).toFixed(2)} ${t.descricao || ""}\n`;
        }
        return result;
      }

      case "buscar_remetentes": {
        const { data: remetentes } = await supabase
          .from("remetentes")
          .select("nome, cpf_cnpj, cep, logradouro, numero, bairro, localidade, uf, celular, email")
          .eq("cliente_id", clienteId)
          .limit(10);
        if (!remetentes || remetentes.length === 0) return "Nenhum remetente cadastrado.";
        let result = "📋 Remetentes cadastrados:\n";
        for (const r of remetentes) {
          const endereco = [r.logradouro, r.numero, r.bairro, r.localidade ? `${r.localidade}-${r.uf || ""}` : ""].filter(Boolean).join(", ");
          result += `- **${r.nome}** (${r.cpf_cnpj})\n  CEP: ${r.cep || "?"} | ${endereco || "sem endereço"}\n  Tel: ${r.celular || "?"} | Email: ${r.email || "?"}\n\n`;
        }
        return result;
      }

      case "cotacao_frete": {
        const token = await getAdminToken();
        if (!token) return "Erro interno ao fazer cotação.";
        const resp = await fetch(`${BASE_API_URL}/frete/cotacao`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            cepOrigem: (args.cep_origem || "").replace(/\D/g, ""),
            cepDestino: (args.cep_destino || "").replace(/\D/g, ""),
            embalagem: {
              peso: args.peso || 0.3,
              altura: args.altura || 2,
              largura: args.largura || 11,
              comprimento: args.comprimento || 16,
            },
            valorDeclarado: 0,
            clienteId,
          }),
        });
        if (!resp.ok) return `Erro na cotação: ${resp.status}. Verifique os CEPs.`;
        const cotacao = await resp.json();
        const opcoes = cotacao.data || [];
        if (opcoes.length === 0) return "Nenhuma opção de frete encontrada.";
        let result = `📊 Cotação ${args.cep_origem} → ${args.cep_destino}:\n`;
        for (const op of opcoes.slice(0, 5)) {
          result += `- **${op.nomeServico}**: R$ ${op.valorTotal || op.valor} (${op.prazo} dias úteis)\n`;
        }
        return result;
      }

      case "emitir_etiqueta": {
        // Buscar remetente pelo CPF/CNPJ
        const cpfCnpjClean = (args.remetente_cpf_cnpj || "").replace(/\D/g, "");
        const { data: rem } = await supabase
          .from("remetentes")
          .select("id, nome, cpf_cnpj, cep, logradouro, numero, complemento, bairro, localidade, uf, celular, email")
          .eq("cliente_id", clienteId)
          .limit(10);
        
        const remetente = (rem || []).find((r: any) => r.cpf_cnpj.replace(/\D/g, "") === cpfCnpjClean);
        if (!remetente) return `Remetente com CPF/CNPJ ${args.remetente_cpf_cnpj} não encontrado. Use buscar_remetentes para ver os disponíveis.`;

        // Verificar saldo
        const { data: saldoDisp } = await supabase.rpc("calcular_saldo_disponivel", { p_cliente_id: clienteId });
        if (Number(saldoDisp || 0) <= 0) return "❌ Saldo insuficiente para emitir etiqueta. Faça uma recarga primeiro.";

        const token = await getAdminToken();
        if (!token) return "Erro interno.";

        const payload = {
          clienteId,
          remetente: {
            id: remetente.id,
            nome: remetente.nome,
            cpfCnpj: remetente.cpf_cnpj,
            cep: remetente.cep,
            logradouro: remetente.logradouro,
            numero: remetente.numero,
            complemento: remetente.complemento || "",
            bairro: remetente.bairro,
            localidade: remetente.localidade,
            uf: remetente.uf,
            celular: remetente.celular || "",
            email: remetente.email || "",
          },
          destinatario: {
            nome: args.destinatario_nome,
            cpfCnpj: (args.destinatario_cpf_cnpj || "").replace(/\D/g, ""),
            cep: (args.destinatario_cep || "").replace(/\D/g, ""),
            logradouro: args.destinatario_logradouro || "",
            numero: args.destinatario_numero || "S/N",
            complemento: args.destinatario_complemento || "",
            bairro: args.destinatario_bairro || "",
            localidade: args.destinatario_cidade || "",
            uf: args.destinatario_uf || "",
            celular: (args.destinatario_celular || "").replace(/\D/g, ""),
            email: args.destinatario_email || "",
          },
          servico: args.servico,
          embalagem: {
            peso: args.peso || 0.3,
            altura: args.altura || 2,
            largura: args.largura || 11,
            comprimento: args.comprimento || 16,
          },
          valorDeclarado: args.valor_declarado || 0,
        };

        const resp = await fetch(`${BASE_API_URL}/frete/emitir-etiqueta`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const errText = await resp.text();
          console.error("❌ Emissão erro:", resp.status, errText);
          return `Erro ao emitir etiqueta: ${resp.status}. ${errText.substring(0, 200)}`;
        }

        const emissao = await resp.json();
        const codigo = emissao?.data?.codigoObjeto || emissao?.codigoObjeto || "gerado";
        const pdfUrl = emissao?.data?.urlEtiqueta || emissao?.urlEtiqueta || "";
        return `✅ Etiqueta emitida com sucesso!\n📦 Código: ${codigo}\n${pdfUrl ? `📄 PDF: ${pdfUrl}` : ""}`;
      }

      case "buscar_etiquetas_pendentes": {
        const { data } = await supabase
          .from("etiquetas_pendentes_correcao")
          .select("destinatario_nome, destinatario_cep, motivo_erro, servico_frete")
          .eq("cliente_id", clienteId)
          .limit(10);
        if (!data || data.length === 0) return "Nenhuma etiqueta pendente de correção.";
        let result = "⚠️ Etiquetas com erro:\n";
        for (const e of data) {
          result += `- ${e.destinatario_nome} (CEP: ${e.destinatario_cep}) | ${e.servico_frete || "?"} → Erro: ${e.motivo_erro}\n`;
        }
        return result;
      }

      case "buscar_recargas": {
        const { data } = await supabase
          .from("recargas_pix")
          .select("valor, status, data_criacao")
          .eq("cliente_id", clienteId)
          .order("data_criacao", { ascending: false })
          .limit(10);
        if (!data || data.length === 0) return "Nenhuma recarga encontrada.";
        let result = "💳 Recargas recentes:\n";
        for (const r of data) {
          const dt = new Date(r.data_criacao).toLocaleDateString("pt-BR");
          result += `- ${dt}: R$ ${Number(r.valor).toFixed(2)} (${r.status})\n`;
        }
        return result;
      }

      default:
        return `Ferramenta "${toolName}" não reconhecida.`;
    }
  } catch (err) {
    console.error(`❌ Erro na tool ${toolName}:`, err);
    return `Erro ao executar ${toolName}: ${err.message}`;
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
    // 1. Validar token BRHUB
    const authResult = await validateBrhubToken(req);
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: authResult.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { payload, clienteId, token: brhubToken } = authResult;
    if (!clienteId) {
      return new Response(JSON.stringify({ error: "Cliente não identificado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userName = payload?.name || payload?.email || "Cliente";
    const userEmail = payload?.email || "";

    const body = await req.json();
    const { message, conversationId: existingConvId, action } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ══════════════════════════════════════════
    // ACTION: load-history
    // ══════════════════════════════════════════
    if (action === "load-history") {
      const syntheticPhone = `web-panel-${clienteId}`;
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", syntheticPhone)
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!conv) {
        return new Response(
          JSON.stringify({ messages: [], conversationId: null }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: msgs } = await supabase
        .from("whatsapp_messages")
        .select("id, direction, content, created_at, ai_generated, sent_by")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true })
        .limit(50);

      const formattedMsgs = (msgs || []).map((m) => ({
        id: m.id,
        role: m.direction === "inbound" ? "user" : "assistant",
        content: m.content || "",
        timestamp: m.created_at,
      }));

      return new Response(
        JSON.stringify({ messages: formattedMsgs, conversationId: conv.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return new Response(JSON.stringify({ error: "Mensagem vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════
    // 2. Encontrar ou criar conversa no CRM
    // ══════════════════════════════════════════
    const syntheticPhone = `web-panel-${clienteId}`;
    let conversationId = existingConvId;

    if (conversationId) {
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id, cliente_id")
        .eq("id", conversationId)
        .eq("contact_phone", syntheticPhone)
        .single();
      if (!existingConv) conversationId = null;
    }

    if (!conversationId) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("id")
        .eq("contact_phone", syntheticPhone)
        .eq("status", "open")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conv) {
        conversationId = conv.id;
      } else {
        const { data: newConv, error: createErr } = await supabase
          .from("whatsapp_conversations")
          .insert({
            contact_phone: syntheticPhone,
            contact_name: userName,
            cliente_id: clienteId,
            status: "open",
            ai_enabled: true,
            active_agent: "veronica",
            tags: ["painel-web"],
            last_message_at: new Date().toISOString(),
            last_message_preview: message.substring(0, 100),
          })
          .select("id")
          .single();

        if (createErr) throw new Error("Falha ao criar conversa");
        conversationId = newConv.id;
      }
    }

    // 3. Salvar mensagem do usuário
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "inbound",
      content_type: "text",
      content: message,
      status: "delivered",
      sent_by: userName,
      ai_generated: false,
      metadata: { source: "web-panel", cliente_id: clienteId, user_name: userName, user_email: userEmail },
    });

    await supabase.from("whatsapp_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: message.substring(0, 100),
      status: "open",
      ai_enabled: true,
    }).eq("id", conversationId);

    // 4. Carregar histórico
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    const chatHistory = (history || []).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content || "",
    }));

    // 5. Buscar contexto básico do cliente (resumo rápido)
    let quickContext = "";
    try {
      // Saldo
      const { data: saldoData } = await supabase.rpc("calcular_saldo_disponivel", { p_cliente_id: clienteId });
      if (saldoData !== null) quickContext += `Saldo disponível: R$ ${Number(saldoData).toFixed(2)}\n`;

      // Remetentes (nomes)
      const { data: rems } = await supabase
        .from("remetentes")
        .select("nome, cpf_cnpj")
        .eq("cliente_id", clienteId)
        .limit(5);
      if (rems && rems.length > 0) {
        quickContext += `Remetentes: ${rems.map((r: any) => `${r.nome} (${r.cpf_cnpj})`).join(", ")}\n`;
      }

      // Últimas emissões rápidas
      const emUrl = `${Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api"}/emissoes?page=0&size=5&sort=criadoEm,desc`;
      console.log(`📋 quickContext emissoes: GET ${emUrl}`);
      const emResp = await fetch(emUrl, {
        headers: { Authorization: `Bearer ${brhubToken}`, "Content-Type": "application/json" },
      });
      console.log(`📋 quickContext emissoes: status=${emResp.status}`);
      if (emResp.ok) {
        const emData = await emResp.json();
        const emissoes = extractEmissoesFromResponse(emData);
        console.log(`📋 quickContext emissoes: keys=${Object.keys(emData || {})}, count=${emissoes.length}`);
        if (emissoes.length > 0) {
          quickContext += `Últimas etiquetas:\n`;
          for (const e of emissoes.slice(0, 5)) {
            quickContext += `- ${e.codigoObjeto || "?"} | ${e.servico || "?"} | ${e.status || "?"} | ${getEmissaoDestinatarioNome(e)}\n`;
          }
        }
      } else {
        const errBody = await emResp.text().catch(() => "");
        console.log(`📋 quickContext emissoes: erro=${errBody.substring(0, 300)}`);
      }
    } catch (e) {
      console.warn("⚠️ Quick context error:", e);
    }

    // 6. System prompt
    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const systemPrompt = `Você é a Veronica, do time de suporte da BRHUB, atendendo via chat no painel web.

DATA ATUAL: ${today}

CLIENTE LOGADO:
- Nome: ${userName}
- Email: ${userEmail}
- ID: ${clienteId}

DADOS ATUAIS DO CLIENTE:
${quickContext || "Carregando..."}

SUAS CAPACIDADES (use as ferramentas disponíveis):
- Rastrear qualquer objeto/pacote em tempo real (rastrear_objeto)
- Listar todas as emissões/etiquetas do cliente com status detalhado (listar_emissoes)
- Consultar saldo e créditos bloqueados (consultar_saldo)
- Ver extrato completo de transações (consultar_extrato)
- Listar remetentes cadastrados com endereço completo (buscar_remetentes)
- Fazer cotação de frete entre CEPs (cotacao_frete)
- GERAR ETIQUETAS DE ENVIO para o cliente (emitir_etiqueta)
- Listar etiquetas com erro pendentes de correção (buscar_etiquetas_pendentes)
- Ver recargas PIX recentes (buscar_recargas)

REGRAS:
1. Você ATENDE EXCLUSIVAMENTE este cliente. Nunca forneça dados de outro cliente.
2. Seja informal, amigável e concisa. Use emojis com moderação.
3. SEMPRE use as ferramentas para buscar dados atualizados. Não responda de cabeça.
4. Se o cliente perguntar sobre rastreio, USE a ferramenta rastrear_objeto imediatamente.
5. Se pedir para gerar etiqueta, colete os dados necessários e use emitir_etiqueta.
6. Para saldo/extrato, USE as ferramentas — não invente valores.
7. Máximo 4-5 frases por resposta. Seja direta e útil.
8. NUNCA invente dados. NUNCA mencione que é IA ou assistente virtual. Você é do time de suporte.
9. Se não conseguir resolver algo, diga que vai escalar para o time.
10. Reproduza datas e valores EXATAMENTE como retornados pelas ferramentas.`;

    // 7. Chamar IA com Function Calling (loop de até 3 iterações)
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("AI não configurada");

    let aiMessages: any[] = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
    ];

    let finalReply = "";
    const MAX_TOOL_ITERATIONS = 3;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: aiMessages,
          tools,
          tool_choice: "auto",
          max_tokens: 800,
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("❌ AI error:", aiResponse.status, errText);
        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      const assistantMsg = choice?.message;

      if (!assistantMsg) {
        finalReply = "Desculpe, tive um problema ao processar. Tente novamente.";
        break;
      }

      // Add assistant message to context
      aiMessages.push(assistantMsg);

      // Check for tool calls
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        console.log(`🔧 Iteration ${iteration + 1}: ${assistantMsg.tool_calls.length} tool calls`);

        for (const tc of assistantMsg.tool_calls) {
          const toolName = tc.function.name;
          let toolArgs = {};
          try { toolArgs = JSON.parse(tc.function.arguments); } catch {}

          console.log(`🔧 Executing: ${toolName}`, JSON.stringify(toolArgs).substring(0, 200));
          const toolResult = await executeTool(toolName, toolArgs, clienteId, brhubToken, supabase);

          aiMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }
        // Continue loop for AI to process tool results
        continue;
      }

      // No tool calls — final text response
      finalReply = assistantMsg.content || "Desculpe, não consegui processar sua mensagem.";
      break;
    }

    if (!finalReply) {
      finalReply = "Estou verificando as informações. Pode repetir sua pergunta?";
    }

    // 8. Salvar resposta
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      content_type: "text",
      content: finalReply,
      status: "delivered",
      sent_by: "veronica",
      ai_generated: true,
      metadata: { source: "web-panel", agent: "veronica" },
    });

    await supabase.from("whatsapp_conversations").update({
      last_message_at: new Date().toISOString(),
      last_message_preview: finalReply.substring(0, 100),
    }).eq("id", conversationId);

    // Log
    await supabase.from("ai_interaction_logs").insert({
      conversation_id: conversationId,
      agent_name: "veronica-web",
      content_type: "text",
      provider: "openai",
      model: "gpt-4o-mini",
      success: true,
    });

    return new Response(
      JSON.stringify({
        reply: finalReply,
        conversationId,
        user: { name: userName, email: userEmail, clienteId },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("❌ veronica-client-chat error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
