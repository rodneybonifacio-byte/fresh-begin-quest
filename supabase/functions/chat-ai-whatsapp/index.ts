// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { resolveChannelForConversation } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// TOOLS: Carregadas dinamicamente do banco (ai_tools.ai_callable = true)
// ═══════════════════════════════════════════════════════════

async function loadCallableTools(supabase: any, agentName: string): Promise<any[]> {
  const { data: tools } = await supabase
    .from("ai_tools")
    .select("name, ai_function_schema, allowed_agents")
    .eq("ai_callable", true)
    .eq("is_enabled", true);

  if (!tools || tools.length === 0) return [];

  return tools
    .filter((t: any) => {
      // Se allowed_agents vazio/null = todos podem usar
      if (!t.allowed_agents || t.allowed_agents.length === 0) return true;
      return t.allowed_agents.includes(agentName);
    })
    .filter((t: any) => t.ai_function_schema)
    .map((t: any) => ({
      type: "function",
      function: t.ai_function_schema,
    }));
}

// ═══════════════════════════════════════════════════════════
// EXECUTOR DE TOOLS
// ═══════════════════════════════════════════════════════════

async function executeTool(toolName: string, args: any, contactPhone: string, conversationId: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    switch (toolName) {
      // ── Rastreio ──
      case "rastrear_objeto": {
        const data = await fetchTrackingData(args.codigo_rastreio);
        if (!data) return `Código ${args.codigo_rastreio} não retornou dados. Pode estar incorreto ou ainda não foi postado.`;
        return formatTrackingForAI(data);
      }

      // ── Cotação ──
      case "cotacao_frete": {
        const clienteId = args.cliente_id || await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente para fazer a cotação. Peça o CPF/CNPJ ou e-mail.";
        const token = await getAdminToken();
        if (!token) return "Erro interno ao gerar cotação.";
        const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
        const resp = await fetch(`${BASE_API_URL}/frete/cotacao`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            cepOrigem: (args.cep_origem || "").replace(/\D/g, ""),
            cepDestino: (args.cep_destino || "").replace(/\D/g, ""),
            embalagem: { peso: args.peso || 0.3, altura: args.altura || 2, largura: args.largura || 11, comprimento: args.comprimento || 16 },
            valorDeclarado: 0, clienteId,
          }),
        });
        if (!resp.ok) return `Erro na cotação: ${resp.status}. Verifique os CEPs.`;
        const cotacao = await resp.json();
        const opcoes = cotacao.data || [];
        if (opcoes.length === 0) return "Nenhuma opção de frete encontrada para esses CEPs.";
        let result = `Opções de frete de ${args.cep_origem} → ${args.cep_destino}:\n`;
        for (const op of opcoes.slice(0, 5)) {
          result += `- ${op.nomeServico}: R$ ${op.valorTotal || op.valor} (${op.prazo} dias)\n`;
        }
        return result;
      }

      // ── Saldo ──
      case "consultar_saldo": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar sua conta. Me diz seu e-mail ou CPF/CNPJ.";
        const saldo = await supabase.rpc("calcular_saldo_disponivel", { p_cliente_id: clienteId });
        const bloqueados = await supabase.rpc("calcular_creditos_bloqueados", { p_cliente_id: clienteId });
        return `Saldo disponível: R$ ${Number(saldo.data ?? 0).toFixed(2)}\nCréditos bloqueados: R$ ${Number(bloqueados.data ?? 0).toFixed(2)}`;
      }

      // ── Extrato ──
      case "consultar_extrato": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar sua conta.";
        const { data: transacoes } = await supabase.rpc("buscar_transacoes_cliente", { p_cliente_id: clienteId, p_limit: args.limite || 10 });
        if (!transacoes || transacoes.length === 0) return "Nenhuma transação encontrada.";
        let result = "Últimas transações:\n";
        for (const t of transacoes.slice(0, 10)) {
          const data = new Date(t.created_at).toLocaleDateString("pt-BR");
          result += `- ${data}: ${t.tipo} R$ ${Math.abs(t.valor).toFixed(2)} ${t.descricao || ""}\n`;
        }
        return result;
      }

      // ── Buscar cliente ──
      case "consultar_cliente_api": {
        const cpfCnpj = typeof args.cpf_cnpj === "string" ? args.cpf_cnpj : "";
        const email = typeof args.email === "string" ? args.email : "";
        const telefoneInformado = typeof args.telefone === "string" ? args.telefone : "";

        let clienteId: string | null = null;

        // 1) Prioridade para identificadores fortes (CPF/CNPJ ou e-mail)
        if (cpfCnpj || email) {
          clienteId = await resolveClienteIdByIdentity(supabase, cpfCnpj, email);
        }

        // 2) Sempre preferir o telefone real da conversa antes de qualquer telefone vindo do LLM
        if (!clienteId) {
          clienteId = await resolveClienteId(supabase, contactPhone);
        }

        // 3) Só então tentar telefone informado na tool-call (pode vir errado/hallucinado)
        if (!clienteId && telefoneInformado) {
          clienteId = await resolveClienteId(supabase, telefoneInformado);
        }

        if (!clienteId) return "Não encontrei nenhum cliente. Peça e-mail ou CPF/CNPJ.";

        await persistConversationClienteId(supabase, conversationId, clienteId);

        // Buscar dados completos do cliente na API
        const clienteDetails = await fetchClienteDetails(clienteId);
        if (clienteDetails) {
          return `Cliente identificado! Nome: ${clienteDetails.nome}, Email: ${clienteDetails.email || "N/A"}, Telefone: ${clienteDetails.telefone || "N/A"}, CPF/CNPJ: ${clienteDetails.cpfCnpj || "N/A"}, ID: ${clienteId}`;
        }

        // Fallback: buscar nome em tabelas locais
        const { data: remLocal } = await supabase
          .from("remetentes")
          .select("nome, email, telefone, celular")
          .eq("cliente_id", clienteId)
          .limit(1)
          .single();
        if (remLocal?.nome) {
          return `Cliente identificado! Nome: ${remLocal.nome}, Email: ${remLocal.email || "N/A"}, Telefone: ${remLocal.celular || remLocal.telefone || "N/A"}, ID: ${clienteId}`;
        }

        return `Cliente encontrado (ID: ${clienteId}), mas não consegui obter os dados detalhados.`;
      }

      // ── Emissões em atraso ──
      case "buscar_emissoes_atraso": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        const query = supabase.from("emissoes_em_atraso").select("codigo_objeto, destinatario_nome, servico, data_previsao_entrega").order("detectado_em", { ascending: false }).limit(5);
        if (clienteId) query.eq("cliente_id", clienteId);
        if (args.codigo_objeto) query.eq("codigo_objeto", args.codigo_objeto);
        const { data } = await query;
        if (!data || data.length === 0) return "Nenhuma emissão em atraso encontrada.";
        let result = "Pacotes em atraso:\n";
        for (const e of data) {
          result += `- ${e.codigo_objeto} → ${e.destinatario_nome || "?"} (${e.servico || "?"}, previsão: ${e.data_previsao_entrega || "?"})\n`;
        }
        return result;
      }

      // ── Serviços do cliente ──
      case "consultar_servicos_cliente": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente.";
        const token = await getAdminToken();
        if (!token) return "Erro interno.";
        const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
        const resp = await fetch(`${BASE_API_URL}/clientes/${clienteId}/servicos`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return "Não foi possível consultar os serviços.";
        const servicos = await resp.json();
        const lista = servicos.data || servicos || [];
        if (Array.isArray(lista) && lista.length === 0) return "Nenhum serviço encontrado para esse cliente.";
        return `Serviços disponíveis: ${JSON.stringify(lista).substring(0, 500)}`;
      }

      // ── Remetentes ──
      case "buscar_remetentes_api": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente.";
        const { data: remetentes } = await supabase.from("remetentes").select("nome, cep, localidade, uf").eq("cliente_id", clienteId).limit(5);
        if (!remetentes || remetentes.length === 0) return "Nenhum remetente cadastrado.";
        let result = "Remetentes cadastrados:\n";
        for (const r of remetentes) {
          result += `- ${r.nome} (CEP: ${r.cep || "?"}, ${r.localidade || "?"}-${r.uf || "?"})\n`;
        }
        return result;
      }

      // ── Recargas ──
      case "buscar_recargas": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente.";
        const query = supabase.from("recargas_pix").select("valor, status, data_criacao").eq("cliente_id", clienteId).order("data_criacao", { ascending: false }).limit(5);
        if (args.status) query.eq("status", args.status);
        const { data } = await query;
        if (!data || data.length === 0) return "Nenhuma recarga encontrada.";
        let result = "Recargas recentes:\n";
        for (const r of data) {
          const dt = new Date(r.data_criacao).toLocaleDateString("pt-BR");
          result += `- ${dt}: R$ ${Number(r.valor).toFixed(2)} (${r.status})\n`;
        }
        return result;
      }

      // ── Gerar PIX ──
      case "gerar_pix_recarga": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente para gerar o PIX.";
        if (!args.valor || args.valor <= 0) return "Informe o valor da recarga.";
        const token = await getAdminToken();
        if (!token) return "Erro interno.";
        const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
        const resp = await fetch(`${BASE_API_URL}/recargas/pix`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ clienteId, valor: args.valor }),
        });
        if (!resp.ok) return `Erro ao gerar PIX: ${resp.status}`;
        const pix = await resp.json();
        return `PIX gerado! Valor: R$ ${Number(args.valor).toFixed(2)}\nCopia e cola: ${pix.data?.pixCopiaECola || pix.pixCopiaECola || "indisponível"}`;
      }

      // ── Etiquetas pendentes ──
      case "listar_etiquetas_pendentes": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente.";
        const { data } = await supabase.from("etiquetas_pendentes_correcao").select("destinatario_nome, destinatario_cep, motivo_erro").eq("cliente_id", clienteId).limit(5);
        if (!data || data.length === 0) return "Nenhuma etiqueta pendente de correção.";
        let result = "Etiquetas com erro:\n";
        for (const e of data) {
          result += `- ${e.destinatario_nome} (CEP: ${e.destinatario_cep}) → Erro: ${e.motivo_erro}\n`;
        }
        return result;
      }

      // ── Autocadastro ──
      case "criar_cliente_autocadastro": {
        if (!args.nome || !args.email || !args.cpf_cnpj || !args.telefone) return "Preciso de: nome, email, CPF/CNPJ e telefone para criar o cadastro.";
        const token = await getAdminToken();
        if (!token) return "Erro interno.";
        const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
        const resp = await fetch(`${BASE_API_URL}/clientes/autocadastro`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ nome: args.nome, email: args.email, cpfCnpj: args.cpf_cnpj.replace(/\D/g, ""), telefone: args.telefone.replace(/\D/g, "") }),
        });
        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          return `Erro no cadastro: ${errData.message || resp.status}`;
        }
        return "Cadastro realizado com sucesso! O cliente já pode acessar a plataforma.";
      }

      // ── Listar objetos do cliente (etiquetas/envios pendentes) ──
      case "listar_objetos_cliente": {
        let clienteId = args.cliente_id;
        if (!clienteId) clienteId = await resolveClienteId(supabase, contactPhone);
        if (!clienteId) return "Não consegui identificar o cliente.";
        const result = await fetchClienteShipments(clienteId, args.apenas_pendentes !== false);
        return result;
      }

      // ── Abrir manifestação/reclamação interna com dados da etiqueta ──
      case "abrir_manifestacao": {
        const codigoObjeto = (args.codigo_rastreio || "").trim().toUpperCase();
        if (!codigoObjeto) return "Preciso do código de rastreio para abrir a manifestação.";
        const motivo = args.motivo || "Reclamação do destinatário";
        const descricaoExtra = args.descricao || "";

        // 1. Buscar em pedidos_importados
        let shipmentData: any = null;
        const { data: pedido } = await supabase
          .from("pedidos_importados")
          .select("destinatario_nome, destinatario_telefone, destinatario_cep, destinatario_cidade, destinatario_estado, destinatario_logradouro, destinatario_numero, destinatario_bairro, remetente_id, cliente_id, servico_frete, numero_pedido")
          .eq("codigo_rastreio", codigoObjeto)
          .limit(1)
          .single();

        if (pedido) {
          shipmentData = { source: "pedidos_importados", ...pedido };
        }

        // 2. Fallback: buscar em emissoes_externas
        if (!shipmentData) {
          const { data: emissao } = await supabase
            .from("emissoes_externas")
            .select("destinatario_nome, destinatario_cep, destinatario_cidade, destinatario_uf, destinatario_logradouro, destinatario_numero, destinatario_bairro, remetente_id, cliente_id, servico, codigo_objeto")
            .eq("codigo_objeto", codigoObjeto)
            .limit(1)
            .single();

          if (emissao) {
            shipmentData = { source: "emissoes_externas", ...emissao };
          }
        }

        if (!shipmentData) return `Não encontrei nenhuma etiqueta com o código ${codigoObjeto}. Verifique se o código está correto.`;

        // 3. Buscar dados do remetente
        let remetenteNome = "N/A";
        let remetenteTelefone = "N/A";
        let remetenteEmail = "N/A";
        if (shipmentData.remetente_id) {
          const { data: rem } = await supabase
            .from("remetentes")
            .select("nome, celular, telefone, email, localidade, uf")
            .eq("id", shipmentData.remetente_id)
            .single();
          if (rem) {
            remetenteNome = rem.nome || "N/A";
            remetenteTelefone = rem.celular || rem.telefone || "N/A";
            remetenteEmail = rem.email || "N/A";
          }
        }

        // 4. Montar descrição completa
        const destNome = shipmentData.destinatario_nome || "N/A";
        const destTel = shipmentData.destinatario_telefone || contactPhone || "N/A";
        const destCidade = shipmentData.destinatario_cidade || "N/A";
        const destUF = shipmentData.destinatario_estado || shipmentData.destinatario_uf || "N/A";
        const servico = shipmentData.servico_frete || shipmentData.servico || "N/A";

        const descricaoCompleta = `📦 MANIFESTAÇÃO — ${codigoObjeto}\n` +
          `Motivo: ${motivo}\n` +
          `${descricaoExtra ? `Detalhes: ${descricaoExtra}\n` : ""}` +
          `\n👤 DESTINATÁRIO:\n` +
          `Nome: ${destNome}\nTelefone: ${destTel}\nCidade: ${destCidade}-${destUF}\n` +
          `\n📤 REMETENTE:\n` +
          `Nome: ${remetenteNome}\nTelefone: ${remetenteTelefone}\nEmail: ${remetenteEmail}\n` +
          `\n🚚 Serviço: ${servico}`;

        // 5. Criar card no pipeline
        const { data: conv } = await supabase
          .from("whatsapp_conversations")
          .select("contact_name")
          .eq("id", conversationId)
          .single();

        await supabase.from("ai_support_pipeline").insert({
          conversation_id: conversationId,
          contact_phone: contactPhone,
          contact_name: conv?.contact_name || destNome,
          category: "reclamacao",
          priority: "alta",
          status: "novo",
          subject: `Manifestação: ${codigoObjeto} — ${motivo.substring(0, 80)}`,
          description: descricaoCompleta.substring(0, 1000),
          sentiment: "negativo",
          detected_by: "tool_manifestacao",
        });

        // 6. Também criar/atualizar ticket
        const { data: existingTicket } = await supabase
          .from("whatsapp_tickets")
          .select("id")
          .eq("conversation_id", conversationId)
          .eq("status", "open")
          .limit(1)
          .single();

        if (!existingTicket) {
          await supabase.from("whatsapp_tickets").insert({
            conversation_id: conversationId,
            contact_phone: contactPhone,
            contact_name: conv?.contact_name || destNome,
            status: "open",
            category: "reclamacao",
            priority: "alta",
            subject: `Manifestação: ${codigoObjeto}`,
            description: descricaoCompleta.substring(0, 500),
          });
        }

        return `Manifestação registrada com sucesso!\n\n` +
          `Código: ${codigoObjeto}\nDestinatário: ${destNome}\nRemetente: ${remetenteNome}\nServiço: ${servico}\nMotivo: ${motivo}\n\n` +
          `A equipe vai analisar e dar retorno.`;
      }

      default:
        return `Ferramenta "${toolName}" não tem executor implementado.`;
    }
  } catch (e: any) {
    console.error(`❌ Erro executando tool ${toolName}:`, e);
    return `Erro ao executar ${toolName}: ${e.message}`;
  }
}

// ═══════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { conversationId, message, contactPhone, agent, contentType, mediaUrl } = await req.json();

    const isMediaMessage = (contentType === "audio" || contentType === "voice" || contentType === "ptt" || contentType === "image") && mediaUrl;
    if (!conversationId || (!message && !isMediaMessage)) {
      return new Response(
        JSON.stringify({ error: "Dados insuficientes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let agentName = agent || "veronica";

    // === PRÉ-HANDOFF: Se Veronica e mensagem contém keywords de atraso/problema grave → Felipe assume COM aviso profissional ===
    if (agentName === "veronica" && message) {
      const lowerMsg = (message || "").toLowerCase();
      const preHandoffKeywords = [
        "atrasado", "atrasada", "atrasados", "atrasadas", "atraso", "atrasou",
        "demora", "demorando", "demorou", "demorada",
        "não chegou", "nao chegou", "não chegando", "nao chegando",
        "cadê meu", "cade meu", "cadê minha", "cade minha",
        "tá demorando", "ta demorando", "prazo estourou", "prazo vencido",
        "passou do prazo", "fora do prazo", "entrega atrasada",
        "não recebi", "nao recebi", "quando chega", "quando vai chegar",
        "apreendido", "apreensão", "apreensao", "retido", "retida", "retenção", "retencao",
        "extraviou", "extraviado", "extraviada", "sumiu", "perdido", "perdida",
        "danificado", "danificada", "quebrado", "quebrada", "avariado", "avariada",
      ];
      if (preHandoffKeywords.some(k => lowerMsg.includes(k))) {
        console.log(`🔄 PRÉ-HANDOFF: Keyword detectada em "${message.substring(0, 50)}..." → Veronica avisa e Felipe assume`);

        // Resolver canal para enviar mensagem de transição da Veronica
        const preHandoffChannel = await resolveChannelForConversation(conversationId);
        if (preHandoffChannel) {
          // Buscar nome do contato para personalizar
          const { data: convPre } = await supabase.from("whatsapp_conversations")
            .select("contact_name").eq("id", conversationId).single();
          const firstName = convPre?.contact_name ? convPre.contact_name.split(" ")[0] : "";
          const nameGreeting = firstName ? `${firstName}, ` : "";

          // Mensagem profissional da Veronica explicando a transferência
          const veronicaHandoffMsg = `*Veronica:*\n\n${nameGreeting}entendi sua situação! Para esse tipo de caso, nosso time de Suporte Nível 2 é quem cuida diretamente. Vou te passar pro Felipe, que é nosso especialista em resoluções — ele vai analisar tudo e te dar um retorno completo, tá? Um instante 😊`;

          await fetch("https://conversations.messagebird.com/v1/send", {
            method: "POST",
            headers: { Authorization: `AccessKey ${preHandoffChannel.access_key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: contactPhone, from: preHandoffChannel.channel_id, type: "text", content: { text: veronicaHandoffMsg } }),
          }).then(r => r.json()).then(async (mbResult) => {
            await supabase.from("whatsapp_messages").insert({
              conversation_id: conversationId, messagebird_id: mbResult.id || null,
              direction: "outbound", content_type: "text", content: veronicaHandoffMsg,
              status: "sent", sent_by: "veronica", ai_generated: true,
            });
          });

          // Delay profissional para transição natural (5 segundos)
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

        agentName = "felipe";
        await supabase.from("whatsapp_conversations")
          .update({ active_agent: "felipe" })
          .eq("id", conversationId);
      }
    }

    // === PRÉ-HANDOFF: Se Felipe e cliente pede para voltar pra Veronica ===
    if (agentName === "felipe" && message) {
      const lowerMsg = (message || "").toLowerCase();
      const backToVeronicaKeywords = [
        "quero falar com a veronica", "quero a veronica", "volta pra veronica",
        "transfere pra veronica", "transferir pra veronica", "transfere para veronica",
        "transferir para veronica", "passa pra veronica", "passar pra veronica",
        "chama a veronica", "falar com veronica", "cadê a veronica", "cade a veronica",
        "prefiro a veronica", "quero voltar pra veronica", "me passa pra veronica",
        "pode me transferir pra veronica", "veronica por favor",
      ];
      if (backToVeronicaKeywords.some(k => lowerMsg.includes(k))) {
        console.log(`🔄 PRÉ-HANDOFF: Cliente pediu Veronica → transferindo de volta`);
        agentName = "veronica";
        await supabase.from("whatsapp_conversations")
          .update({ active_agent: "veronica" })
          .eq("id", conversationId);
        // Resolver canal antes do handoff
        const earlyChannel = await resolveChannelForConversation(conversationId);
        await performHandoffToVeronica(supabase, conversationId, contactPhone, message, earlyChannel);
        return new Response(
          JSON.stringify({ ok: true, reply: "Handoff Felipe → Veronica realizado", tools_used: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`🤖 Chat AI conversa ${conversationId}, agente: ${agentName}, tipo: ${contentType}`);

    // === BUSCAR CONFIG DO AGENTE ===
    let { data: agentConfig } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("name", agentName)
      .eq("is_active", true)
      .single();

    // Fallback: se o agente não existe no banco, usa veronica
    if (!agentConfig && agentName !== "veronica") {
      console.warn(`⚠️ Agente "${agentName}" não encontrado, usando veronica como fallback`);
      const fallback = await supabase
        .from("ai_agents")
        .select("*")
        .eq("name", "veronica")
        .eq("is_active", true)
        .single();
      agentConfig = fallback.data;
      agentName = "veronica";
    }

    const systemPrompt = agentConfig?.system_prompt || getDefaultPrompt(agentName);
    const modelName = agentConfig?.model || "gpt-4o";
    const temperature = agentConfig?.temperature || 0.7;
    const maxTokens = agentConfig?.max_tokens || 300;

    // === BUSCAR HISTÓRICO ===
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, content_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // ═══════════════════════════════════════════════════════════
    // AUTO-IDENTIFICAÇÃO: resolver contato pelo telefone (ampla)
    // ═══════════════════════════════════════════════════════════
    let contactContext = "";
    try {
      const normalized = (contactPhone || "").replace(/\D/g, "");
      const phoneSuffix = normalized.length > 8 ? normalized.slice(-8) : normalized;
      const phoneVariants = [normalized];
      if (normalized.startsWith("55") && normalized.length > 11) phoneVariants.push(normalized.substring(2));
      if (!normalized.startsWith("55")) phoneVariants.push(`55${normalized}`);
      console.log("🔍 Auto-identificação: telefone normalizado:", normalized, "variantes:", phoneVariants);

      // 1. Verificar cliente_id já persistido na conversa
      const { data: convData } = await supabase
        .from("whatsapp_conversations")
        .select("cliente_id, contact_name")
        .eq("id", conversationId)
        .single();

      let clienteId = convData?.cliente_id || null;
      let contactName: string | null = null;
      let contactEmail: string | null = null;
      let contactRole: string | null = null;
      console.log("🔍 Conversa existente - cliente_id:", clienteId, "contact_name:", convData?.contact_name);

      // 2. Se já tem cliente_id, buscar dados completos
      if (clienteId) {
        const details = await fetchClienteDetails(clienteId);
        console.log("🔍 fetchClienteDetails resultado:", details ? details.nome : "NULL/falhou");
        if (details) {
          contactName = details.nome;
          contactEmail = details.email || null;
          contactRole = "cliente";
        } else {
          // Fallback: buscar nome local nos remetentes do cliente
          const { data: remLocal } = await supabase
            .from("remetentes")
            .select("nome, email")
            .eq("cliente_id", clienteId)
            .limit(5);
          if (remLocal && remLocal.length > 0) {
            // Filtrar nomes genéricos
            const validRem = remLocal.find((r: any) => {
              const n = (r.nome || "").toUpperCase().trim();
              return n.length >= 3 && !n.includes('CADASTRO') && !n.includes('NOLASTNAME') && !/^[0-9a-f-]{36}$/i.test(n);
            });
            if (validRem) {
              contactName = validRem.nome;
              contactEmail = validRem.email || null;
              contactRole = "remetente";
              console.log("🔍 Nome via remetente local (fallback API):", contactName);
            }
          }
        }
      }

      // 2b. Se contact_name já está na conversa e é válido, usar como fallback
      if (!contactName && convData?.contact_name) {
        const cn = convData.contact_name.toUpperCase().trim();
        const isValid = cn.length >= 3 && !cn.includes('CADASTRO') && !cn.includes('NOLASTNAME') && !/^[0-9]+$/.test(cn);
        if (isValid) {
          contactName = convData.contact_name;
          contactRole = "cliente";
          console.log("🔍 Nome via contact_name da conversa:", contactName);
        }
      }

      // 3. Se não identificou ainda, buscar pelo telefone em TODAS as tabelas
      if (!contactName) {
        // 3a. Remetentes (celular/telefone)
        for (const pv of phoneVariants) {
          const { data: rem } = await supabase
            .from("remetentes")
            .select("nome, email, celular, telefone, cliente_id")
            .or(`celular.ilike.%${pv}%,telefone.ilike.%${pv}%`)
            .limit(1)
            .single();
          if (rem?.nome) {
            contactName = rem.nome;
            contactEmail = rem.email || null;
            contactRole = "remetente";
            if (!clienteId && rem.cliente_id) {
              clienteId = rem.cliente_id;
              await persistConversationClienteId(supabase, conversationId, clienteId);
            }
            break;
          }
        }
      }

      if (!contactName) {
        // 3b. Cadastros de origem (telefone_cliente)
        const { data: cadastro } = await supabase
          .from("cadastros_origem")
          .select("nome_cliente, email_cliente, cliente_id")
          .or(`telefone_cliente.ilike.%${normalized}%`)
          .limit(1)
          .single();
        if (cadastro?.nome_cliente) {
          contactName = cadastro.nome_cliente;
          contactEmail = cadastro.email_cliente || null;
          contactRole = "cliente";
          if (!clienteId && cadastro.cliente_id) {
            clienteId = cadastro.cliente_id;
            await persistConversationClienteId(supabase, conversationId, clienteId);
          }
        }
      }

      if (!contactName) {
        // 3c. Pedidos importados - destinatário (telefone do destinatário)
        for (const pv of phoneVariants) {
          const { data: pedido } = await supabase
            .from("pedidos_importados")
            .select("destinatario_nome, destinatario_email, destinatario_telefone")
            .or(`destinatario_telefone.ilike.%${pv}%`)
            .not("destinatario_nome", "is", null)
            .limit(1)
            .single();
          if (pedido?.destinatario_nome) {
            contactName = pedido.destinatario_nome;
            contactEmail = pedido.destinatario_email || null;
            contactRole = "destinatário";
            break;
          }
        }
      }

      if (!contactName) {
        // 3d. Etiquetas pendentes de correção (celular do destinatário)
        for (const pv of phoneVariants) {
          const { data: etq } = await supabase
            .from("etiquetas_pendentes_correcao")
            .select("destinatario_nome, destinatario_celular")
            .or(`destinatario_celular.ilike.%${pv}%`)
            .not("destinatario_nome", "is", null)
            .limit(1)
            .single();
          if (etq?.destinatario_nome) {
            contactName = etq.destinatario_nome;
            contactRole = "destinatário";
            break;
          }
        }
      }

      if (!contactName) {
        // 3e. Notificações de aguardando retirada
        for (const pv of phoneVariants) {
          const { data: notif } = await supabase
            .from("notificacoes_aguardando_retirada")
            .select("destinatario_nome, destinatario_celular")
            .or(`destinatario_celular.ilike.%${pv}%`)
            .not("destinatario_nome", "is", null)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();
          if (notif?.destinatario_nome) {
            contactName = notif.destinatario_nome;
            contactRole = "destinatário";
            break;
          }
        }
      }

      // 4. Se não encontrou por telefone mas tem cliente_id, tentar via API
      if (!contactName && clienteId) {
        const details = await fetchClienteDetails(clienteId);
        if (details) {
          contactName = details.nome;
          contactEmail = details.email || null;
          contactRole = "cliente";
        } else {
          const { data: remLocal } = await supabase
            .from("remetentes")
            .select("nome, email")
            .eq("cliente_id", clienteId)
            .limit(1)
            .single();
          if (remLocal?.nome) {
            contactName = remLocal.nome;
            contactEmail = remLocal.email || null;
            contactRole = "remetente";
          }
        }
      }

      // 5. Se não achou clienteId mas precisamos, resolver pelo telefone
      if (!clienteId) {
        clienteId = await resolveClienteId(supabase, contactPhone);
        if (clienteId) {
          await persistConversationClienteId(supabase, conversationId, clienteId);
          if (!contactName) {
            const details = await fetchClienteDetails(clienteId);
            if (details) {
              contactName = details.nome;
              contactEmail = details.email || null;
              contactRole = "cliente";
            }
          }
        }
      }

      // 6. Montar contexto
      if (contactName) {
        // Filtrar nomes genéricos/lixo
        const nomeUpper = contactName.toUpperCase().trim();
        const isGeneric = nomeUpper.length < 3 || nomeUpper.includes('CADASTRO') || nomeUpper.includes('NOLASTNAME') || /^[0-9a-f-]{36}$/i.test(nomeUpper);

        if (!isGeneric) {
          const roleLabel = contactRole === "destinatário" ? "um destinatário de envio" 
                          : contactRole === "remetente" ? "um remetente cadastrado"
                          : "um cliente da plataforma";
          contactContext = `\n\n[CONTEXTO DO CONTATO ATUAL]\nO contato que está falando com você se chama: ${contactName}. Tipo: ${roleLabel}. Email: ${contactEmail || "N/A"}. Telefone: ${contactPhone}.${clienteId ? ` ID cliente: ${clienteId}.` : ""}\nIMPORTANTE: Chame a pessoa pelo PRIMEIRO NOME de forma pessoal e simpática. Não peça identificação novamente, você já sabe quem é.`;

          // 7. AUTO-INJECT: Buscar envios pendentes do cliente automaticamente
          if (clienteId) {
            try {
              const shipmentContext = await fetchClienteShipments(clienteId, true);
              if (shipmentContext && !shipmentContext.includes("Nenhum") && !shipmentContext.includes("Erro") && !shipmentContext.includes("Todos os envios")) {
                contactContext += `\n\n[ENVIOS PENDENTES DO CLIENTE]\n${shipmentContext}\nUse estas informações para ser PROATIVA: se o cliente perguntar sobre um envio, você já tem os dados. Pode informar status, previsão de entrega e código de rastreio sem precisar que o cliente forneça. Se achar relevante, mencione brevemente que há envios em andamento.`;
              } else if (shipmentContext.includes("Todos os envios")) {
                contactContext += `\n\n[ENVIOS DO CLIENTE]\nTodos os envios desse cliente já foram entregues. Nenhum envio pendente no momento.`;
              }
              console.log("📦 Auto-inject envios:", shipmentContext.substring(0, 150));
            } catch (shipErr) {
              console.warn("⚠️ Erro ao buscar envios para contexto:", shipErr);
            }
          }

          // Atualizar contact_name na conversa
          if (!convData?.contact_name || convData.contact_name === contactPhone || convData.contact_name === normalized) {
            await supabase.from("whatsapp_conversations")
              .update({ contact_name: contactName })
              .eq("id", conversationId);
          }
        }
      }
    } catch (e) {
      console.warn("⚠️ Erro na auto-identificação:", e);
    }
    console.log("👤 Contexto de contato:", contactContext ? contactContext.substring(0, 120) : "NENHUM (não identificado)");

    const enrichedSystemPrompt = systemPrompt + contactContext;
    const messages: any[] = [{ role: "system", content: enrichedSystemPrompt }];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.content || "[mídia]",
        });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PRÉ-PROCESSAMENTO: converter mídia em contexto textual
    // ═══════════════════════════════════════════════════════════

    let userContent = message || "";

    // IMAGEM → Gemini extrai dados relevantes
    if (contentType === "image" && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const imageAnalysis = await analyzeImageWithGemini(mediaUrl, geminiKey);
          console.log("🖼️ Gemini extraiu:", JSON.stringify(imageAnalysis).substring(0, 200));
          
          // Compor contexto: dados extraídos da imagem + texto do usuário
          let imageInfo = imageAnalysis.description || "";
          if (imageAnalysis.trackingCode) {
            imageInfo = `Código de rastreio encontrado na imagem: ${imageAnalysis.trackingCode}. ${imageInfo}`;
          }
          if (imageAnalysis.cepOrigem) imageInfo += ` CEP origem: ${imageAnalysis.cepOrigem}`;
          if (imageAnalysis.cepDestino) imageInfo += ` CEP destino: ${imageAnalysis.cepDestino}`;
          
          userContent = `[Dados extraídos da imagem enviada: ${imageInfo}]${message ? ` Mensagem do cliente: "${message}"` : ""}`;
        } catch (e) {
          console.warn("⚠️ Erro Gemini:", e);
          userContent = message || "[imagem não processada]";
        }
      }
    }
    // ÁUDIO → transcrição
    else if ((contentType === "audio" || contentType === "voice" || contentType === "ptt") && mediaUrl) {
      const transcription = await transcribeAudio(mediaUrl);
      userContent = transcription || message || "[áudio não transcrito]";
    }

    // ═══════════════════════════════════════════════════════════
    // DETECÇÃO DE ETIQUETAS: código de rastreio como chave do atendimento
    // ═══════════════════════════════════════════════════════════
    let trackingContext = "";
    try {
      const trackingRegex = /\b[A-Z]{2}\d{9,13}[A-Z]{2}\b/g;
      
      // Detectar códigos na mensagem atual
      const currentCodes = (userContent || "").match(trackingRegex) || [];
      
      // Detectar códigos no histórico recente (últimas 10 mensagens inbound)
      const historyCodes: string[] = [];
      if (history) {
        for (const msg of history.filter((m: any) => m.direction === "inbound").slice(-10)) {
          const codes = (msg.content || "").match(trackingRegex) || [];
          historyCodes.push(...codes);
        }
      }
      
      // Combinar: códigos únicos, priorizando o mais recente
      const allCodes = [...new Set([...historyCodes, ...currentCodes])];
      
      if (allCodes.length > 0) {
        const lastCode = currentCodes.length > 0 ? currentCodes[currentCodes.length - 1] : allCodes[allCodes.length - 1];
        console.log(`📦 Códigos detectados: ${allCodes.join(", ")} | Referência principal: ${lastCode}`);
        
        // Buscar dados detalhados do último código (referência primária)
        let shipmentDetail = "";
        const { data: pedido } = await supabase
          .from("pedidos_importados")
          .select("destinatario_nome, destinatario_telefone, destinatario_cep, destinatario_cidade, destinatario_estado, remetente_id, cliente_id, servico_frete, numero_pedido, status")
          .eq("codigo_rastreio", lastCode)
          .limit(1)
          .single();
        
        if (pedido) {
          let remNome = "N/A";
          if (pedido.remetente_id) {
            const { data: rem } = await supabase.from("remetentes").select("nome, localidade, uf").eq("id", pedido.remetente_id).single();
            if (rem) remNome = `${rem.nome} (${rem.localidade || ""}/${rem.uf || ""})`;
          }
          shipmentDetail = `Código: ${lastCode}\nDestinatário: ${pedido.destinatario_nome || "N/A"}\nTelefone dest.: ${pedido.destinatario_telefone || "N/A"}\nCidade: ${pedido.destinatario_cidade || "N/A"}-${pedido.destinatario_estado || "N/A"}\nRemetente: ${remNome}\nServiço: ${pedido.servico_frete || "N/A"}\nPedido: ${pedido.numero_pedido || "N/A"}\nStatus: ${pedido.status || "N/A"}`;
        } else {
          // Tentar emissoes_externas
          const { data: emissao } = await supabase
            .from("emissoes_externas")
            .select("destinatario_nome, destinatario_cep, destinatario_cidade, destinatario_uf, remetente_id, servico, status")
            .eq("codigo_objeto", lastCode)
            .limit(1)
            .single();
          
          if (emissao) {
            let remNome = "N/A";
            if (emissao.remetente_id) {
              const { data: rem } = await supabase.from("remetentes").select("nome, localidade, uf").eq("id", emissao.remetente_id).single();
              if (rem) remNome = `${rem.nome} (${rem.localidade || ""}/${rem.uf || ""})`;
            }
            shipmentDetail = `Código: ${lastCode}\nDestinatário: ${emissao.destinatario_nome || "N/A"}\nCidade: ${emissao.destinatario_cidade || "N/A"}-${emissao.destinatario_uf || "N/A"}\nRemetente: ${remNome}\nServiço: ${emissao.servico || "N/A"}\nStatus: ${emissao.status || "N/A"}`;
          }
        }
        
        trackingContext = `\n\n[ETIQUETA DE REFERÊNCIA — CHAVE DO ATENDIMENTO]`;
        if (shipmentDetail) {
          trackingContext += `\n${shipmentDetail}`;
        } else {
          trackingContext += `\nCódigo: ${lastCode} (não encontrado no banco — pode ser de outra transportadora ou ainda não registrado)`;
        }
        
        if (allCodes.length > 1) {
          trackingContext += `\n\n⚠️ O cliente mencionou MAIS DE UM código nesta conversa: ${allCodes.join(", ")}. O código de referência atual é ${lastCode}. Se o cliente enviar uma pergunta genérica (ex: "cadê meu pacote?"), PERGUNTE sobre qual etiqueta ele está se referindo, listando os códigos mencionados. Só responda sobre uma etiqueta específica quando o cliente confirmar.`;
        } else {
          trackingContext += `\n\nEste é o código de referência para este atendimento. Todas as perguntas do cliente devem ser respondidas com base nesta etiqueta, a menos que ele informe outro código.`;
        }
      }
    } catch (trackErr) {
      console.warn("⚠️ Erro ao detectar etiquetas:", trackErr);
    }

    // Injetar contexto de etiqueta no sistema
    if (trackingContext) {
      // Inserir o tracking context logo após o sistema prompt base
      messages[0].content = messages[0].content + trackingContext;
    }

    messages.push({ role: "user", content: userContent });

    // ═══════════════════════════════════════════════════════════
    // CARREGAR TOOLS DINÂMICAS DO BANCO
    // ═══════════════════════════════════════════════════════════

    const dynamicTools = await loadCallableTools(supabase, agentName);
    console.log(`🔧 ${dynamicTools.length} tools carregadas para ${agentName}`);

    // ═══════════════════════════════════════════════════════════
    // LOOP DE TOOL CALLING (máximo 3 iterações)
    // ═══════════════════════════════════════════════════════════

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let aiReply = "";
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let toolsUsed: string[] = [];

    for (let iteration = 0; iteration < 3; iteration++) {
      console.log(`🔄 Iteração ${iteration + 1} - ${messages.length} mensagens`);

      const requestBody: any = {
        model: modelName,
        messages,
        max_tokens: maxTokens,
        temperature,
      };
      // Só incluir tools se houver alguma disponível
      if (dynamicTools.length > 0) {
        requestBody.tools = dynamicTools;
        requestBody.tool_choice = "auto";
      }

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("❌ OpenAI error:", aiResponse.status, errText);
        await logInteraction(supabase, {
          conversation_id: conversationId,
          agent_name: agentName,
          content_type: contentType || "text",
          provider: "openai",
          model: modelName,
          success: false,
          error_message: `OpenAI ${aiResponse.status}: ${errText.substring(0, 200)}`,
          response_time_ms: Date.now() - startTime,
        });
        throw new Error(`OpenAI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const choice = aiData.choices?.[0];
      totalInputTokens += aiData.usage?.prompt_tokens || 0;
      totalOutputTokens += aiData.usage?.completion_tokens || 0;

      // Se a IA quer chamar tools
      if (choice?.finish_reason === "tool_calls" || choice?.message?.tool_calls) {
        const toolCalls = choice.message.tool_calls || [];
        messages.push(choice.message); // Adicionar a mensagem com tool_calls

        for (const tc of toolCalls) {
          const toolName = tc.function.name;
          let toolArgs = {};
          try { toolArgs = JSON.parse(tc.function.arguments); } catch {}
          
          console.log(`🔧 Tool call: ${toolName}(${JSON.stringify(toolArgs)})`);
          toolsUsed.push(toolName);

          const toolResult = await executeTool(toolName, toolArgs, contactPhone, conversationId);
          
          // === POST-TOOL HANDOFF: Se o resultado da tool contém indicadores de problema grave E estamos com Veronica, escalar pro Felipe ===
          if (agentName === "veronica" && toolName === "rastrear_objeto") {
            const toolLower = toolResult.toLowerCase();
            const problemKeywords = ["avariado", "avariada", "danificado", "extraviado", "roubado", "apreendido", "retido", "devolvido ao remetente", "objeto não localizado"];
            const hasProblem = problemKeywords.some(k => toolLower.includes(k));
            if (hasProblem) {
              console.log("🔄 POST-TOOL HANDOFF: Resultado do rastreio indica problema grave → Felipe assume");
              
              const preHandoffChannel = await resolveChannelForConversation(conversationId);
              if (preHandoffChannel) {
                const { data: convPre } = await supabase.from("whatsapp_conversations")
                  .select("contact_name").eq("id", conversationId).single();
                const firstName = convPre?.contact_name ? convPre.contact_name.split(" ")[0] : "";
                const nameGreeting = firstName ? `${firstName}, ` : "";

                const veronicaHandoffMsg = `*Veronica:*\n\n${nameGreeting}vi aqui que rolou um problema com seu pacote. Esse tipo de caso é tratado pelo Felipe, nosso especialista do Suporte Nível 2 — ele tem acesso direto à operação e vai te dar um retorno completo. Vou te transferir agora, um instante! 😊`;

                await fetch("https://conversations.messagebird.com/v1/send", {
                  method: "POST",
                  headers: { Authorization: `AccessKey ${preHandoffChannel.access_key}`, "Content-Type": "application/json" },
                  body: JSON.stringify({ to: contactPhone, from: preHandoffChannel.channel_id, type: "text", content: { text: veronicaHandoffMsg } }),
                }).then(r => r.json()).then(async (mbResult) => {
                  await supabase.from("whatsapp_messages").insert({
                    conversation_id: conversationId, messagebird_id: mbResult.id || null,
                    direction: "outbound", content_type: "text", content: veronicaHandoffMsg,
                    status: "sent", sent_by: "veronica", ai_generated: true,
                  });
                });

                // Delay profissional
                await new Promise(resolve => setTimeout(resolve, 5000));
              }

              // Trocar agente para Felipe e reinjetar contexto
              agentName = "felipe";
              await supabase.from("whatsapp_conversations")
                .update({ active_agent: "felipe" })
                .eq("id", conversationId);

              // Recarregar config do Felipe e atualizar system prompt
              const { data: felipeConf } = await supabase.from("ai_agents").select("*").eq("name", "felipe").eq("is_active", true).single();
              if (felipeConf) {
                messages[0].content = (felipeConf.system_prompt || getDefaultPrompt("felipe")) + (trackingContext || "");
              } else {
                messages[0].content = getDefaultPrompt("felipe") + (trackingContext || "");
              }
            }
          }

          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: toolResult,
          });
        }
        // Continuar o loop para a IA processar os resultados
        continue;
      }

      // Resposta final (sem tool calls)
      aiReply = choice?.message?.content || "Desculpe, não consegui processar sua mensagem.";
      break;
    }

    // === SANITIZAR: Remover códigos de objeto e URLs da resposta ===
    aiReply = sanitizeAgentReply(aiReply, contentType || "text");

    // === PREFIXO DO AGENTE ===
    const agentDisplayName = agentConfig?.display_name || (agentName === "felipe" ? "Felipe" : "Veronica");
    aiReply = `*${agentDisplayName}:*\n\n${aiReply}`;

    console.log("🤖 Resposta final:", aiReply.substring(0, 150));

    // === PIPELINE & TICKETS ===
    await ensureTicketOpen(supabase, conversationId, contactPhone, message);
    await detectAndCreateSupportTicket(supabase, conversationId, contactPhone, message, aiReply, agentName);
    await progressPipelineStatus(supabase, conversationId, message, aiReply);
    await detectTicketResolution(supabase, conversationId, aiReply);

    // Log
    await logInteraction(supabase, {
      conversation_id: conversationId,
      agent_name: agentName,
      content_type: contentType || "text",
      provider: "openai",
      model: modelName,
      success: true,
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      response_time_ms: Date.now() - startTime,
      tool_used: toolsUsed.length > 0 ? toolsUsed.join(",") : null,
    });

    // === ENVIAR RESPOSTA VIA MESSAGEBIRD ===
    const channel = await resolveChannelForConversation(conversationId);
    if (channel) {
      const isAudioInput = contentType === "audio" || contentType === "voice" || contentType === "ptt";
      let audioSent = false;
      const shouldRespondWithAudio = agentConfig?.respond_with_audio !== false;
      const ttsEnabled = agentConfig?.tts_enabled !== false;

      if (isAudioInput && shouldRespondWithAudio && ttsEnabled) {
        const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
        if (elevenLabsKey) {
          try {
            const voiceConfig = {
              voiceId: agentConfig?.voice_id || "FGY2WhTYpPnrIDTdsKH5",
              model: agentConfig?.tts_model || "eleven_multilingual_v2",
              stability: agentConfig?.voice_stability ?? 0.5,
              similarityBoost: agentConfig?.voice_similarity_boost ?? 0.75,
              style: agentConfig?.voice_style ?? 0.0,
              speed: agentConfig?.voice_speed ?? 1.0,
            };
            const audioUrl = await generateTTSAudio(aiReply, elevenLabsKey, voiceConfig);
            if (audioUrl) {
              const mbAudioResponse = await fetch("https://conversations.messagebird.com/v1/send", {
                method: "POST",
                headers: {
                  Authorization: `AccessKey ${channel.access_key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to: contactPhone,
                  from: channel.channel_id,
                  type: "audio",
                  content: { audio: { url: audioUrl } },
                }),
              });
              const mbAudioResult = await mbAudioResponse.json();

              await supabase.from("whatsapp_messages").insert({
                conversation_id: conversationId,
                messagebird_id: mbAudioResult.id || null,
                direction: "outbound",
                content_type: "voice",
                content: aiReply,
                media_url: audioUrl,
                status: "sent",
                sent_by: agentName,
                ai_generated: true,
              });
              audioSent = true;
            }
          } catch (ttsError) {
            console.warn("⚠️ Erro TTS:", ttsError);
          }
        }
      }

      if (!audioSent) {
        const mbResponse = await fetch("https://conversations.messagebird.com/v1/send", {
          method: "POST",
          headers: {
            Authorization: `AccessKey ${channel.access_key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: contactPhone,
            from: channel.channel_id,
            type: "text",
            content: { text: aiReply },
          }),
        });
        const mbResult = await mbResponse.json();

        await supabase.from("whatsapp_messages").insert({
          conversation_id: conversationId,
          messagebird_id: mbResult.id || null,
          direction: "outbound",
          content_type: "text",
          content: aiReply,
          status: "sent",
          sent_by: agentName,
          ai_generated: true,
        });
      }

      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: aiReply.substring(0, 100),
        })
        .eq("id", conversationId);

      // === HANDOFF VERONICA → FELIPE (pós-resposta, só se NÃO veio do pré-handoff) ===
      // O pré-handoff já fez a transição com mensagem profissional, não duplicar
      if (agentName === "veronica" && detectHandoffTrigger(message, aiReply)) {
        // Se chegou aqui como veronica, o pré-handoff NÃO disparou (edge case)
        console.log("🔄 Handoff pós-resposta: Veronica → Felipe");
        await performHandoffToFelipe(supabase, conversationId, contactPhone, message, channel);
      }

      // === HANDOFF FELIPE → VERONICA (pós-resposta, caso detecte pedido) ===
      if (agentName === "felipe" && detectBackToVeronicaTrigger(message)) {
        console.log("🔄 Handoff: Felipe → Veronica");
        await performHandoffToVeronica(supabase, conversationId, contactPhone, message, channel);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, reply: aiReply, tools_used: toolsUsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("❌ Erro chat-ai:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ═══════════════════════════════════════════════════════════
// HELPERS: Resolução de cliente
// ═══════════════════════════════════════════════════════════

async function resolveClienteId(supabase: any, phone: string): Promise<string | null> {
  const normalized = (phone || "").replace(/\D/g, "");
  if (!normalized) return null;

  // 1. Buscar em conversas existentes
  const { data: conv } = await supabase
    .from("whatsapp_conversations")
    .select("cliente_id")
    .eq("contact_phone", normalized)
    .not("cliente_id", "is", null)
    .limit(1)
    .single();
  if (conv?.cliente_id) return conv.cliente_id;

  // 2. Buscar em remetentes por celular/telefone
  const phoneVariants = [
    normalized,
    normalized.startsWith("55") ? normalized.substring(2) : `55${normalized}`,
  ];
  for (const pv of phoneVariants) {
    const { data: rem } = await supabase
      .from("remetentes")
      .select("cliente_id")
      .or(`celular.ilike.%${pv}%,telefone.ilike.%${pv}%`)
      .limit(1)
      .single();
    if (rem?.cliente_id) return rem.cliente_id;
  }

  // 3. Buscar em cadastros_origem
  const { data: cadastro } = await supabase
    .from("cadastros_origem")
    .select("cliente_id")
    .or(`telefone_cliente.ilike.%${normalized}%`)
    .limit(1)
    .single();
  if (cadastro?.cliente_id) return cadastro.cliente_id;

  return null;
}

async function resolveClienteIdByIdentity(supabase: any, cpfCnpj?: string, email?: string): Promise<string | null> {
  const cleanDoc = (cpfCnpj || "").replace(/\D/g, "");
  const cleanEmail = (email || "").trim().toLowerCase();

  // 1) Busca local rápida por CPF/CNPJ em remetentes
  if (cleanDoc) {
    const { data: rem } = await supabase
      .from("remetentes")
      .select("cliente_id")
      .eq("cpf_cnpj", cleanDoc)
      .limit(1)
      .single();
    if (rem?.cliente_id) return rem.cliente_id;
  }

  // 2) Busca local por e-mail em cadastros_origem
  if (cleanEmail) {
    const { data: cadastro } = await supabase
      .from("cadastros_origem")
      .select("cliente_id")
      .ilike("email_cliente", cleanEmail)
      .limit(1)
      .single();
    if (cadastro?.cliente_id) return cadastro.cliente_id;
  }

  // 3) Fallback na API principal (match exato por CPF/CNPJ ou e-mail)
  const searchValue = cleanDoc || cleanEmail;
  if (!searchValue) return null;

  const token = await getAdminToken();
  if (!token) return null;

  try {
    const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
    const resp = await fetch(`${BASE_API_URL}/clientes?search=${encodeURIComponent(searchValue)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) return null;
    const clientes = await resp.json();
    if (!Array.isArray(clientes) || clientes.length === 0) return null;

    const match = clientes.find((c: any) => {
      if (cleanDoc) return String(c?.cpfCnpj || "").replace(/\D/g, "") === cleanDoc;
      if (cleanEmail) return String(c?.email || "").trim().toLowerCase() === cleanEmail;
      return false;
    });

    return match?.id || null;
  } catch {
    return null;
  }
}

async function persistConversationClienteId(supabase: any, conversationId: string, clienteId: string) {
  if (!conversationId || !clienteId) return;

  const { error } = await supabase
    .from("whatsapp_conversations")
    .update({ cliente_id: clienteId })
    .eq("id", conversationId);

  if (error) {
    console.warn("⚠️ Não foi possível persistir cliente_id na conversa:", error.message);
  }
}

async function fetchClienteDetails(clienteId: string): Promise<{ nome: string; email?: string; telefone?: string; cpfCnpj?: string } | null> {
  try {
    const token = await getAdminToken();
    if (!token) return null;
    const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
    const resp = await fetch(`${BASE_API_URL}/clientes/${clienteId}`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const cliente = data?.data || data;
    return {
      nome: cliente.nomeEmpresa || cliente.nomResponsavel || cliente.nome || "Desconhecido",
      email: cliente.email,
      telefone: cliente.telefone || cliente.celular,
      cpfCnpj: cliente.cpfCnpj,
    };
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════
// BUSCAR ENVIOS DO CLIENTE NA API EXTERNA
// ═══════════════════════════════════════════════════════════

const SHIPMENT_STATUS_DELIVERED = ["ENTREGUE", "DELIVERED", "DEVOLVIDO"];

async function fetchClienteShipments(clienteId: string, onlyPending = true): Promise<string> {
  try {
    const token = await getAdminToken();
    if (!token) return "Erro interno ao consultar envios.";
    const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
    const resp = await fetch(`${BASE_API_URL}/emissoes?clienteId=${clienteId}&size=30&sort=dataCriacao,desc`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return `Erro ao consultar envios: ${resp.status}`;
    const raw = await resp.json();
    const items = raw?.data?.content || raw?.data || raw?.content || [];
    if (!Array.isArray(items) || items.length === 0) return "Nenhum envio encontrado para esse cliente.";

    let filtered = items;
    if (onlyPending) {
      filtered = items.filter((e: any) => {
        const status = String(e.status || e.statusDescricao || "").toUpperCase().replace(/[-\s]/g, "_");
        return !SHIPMENT_STATUS_DELIVERED.some(s => status.includes(s));
      });
    }

    if (filtered.length === 0) return "Todos os envios desse cliente já foram entregues. Nenhum pendente.";

    let result = `Envios pendentes do cliente (${filtered.length}):\n`;
    for (const e of filtered.slice(0, 10)) {
      const codigo = e.codigoObjeto || e.codigo_objeto || "sem código";
      const destNome = e.destinatario?.nome || e.destinatarioNome || "?";
      const destCidade = e.destinatario?.localidade || e.destinatario?.cidade || "";
      const destUf = e.destinatario?.uf || "";
      const status = e.statusDescricao || e.status || "?";
      const previsao = e.previsaoEntrega || e.dataPrevisaoEntrega || "";
      const servico = e.nomeServico || e.servico || "";
      result += `- ${codigo} → ${destNome}${destCidade ? ` (${destCidade}-${destUf})` : ""} | Status: ${status}${previsao ? ` | Previsão: ${previsao}` : ""}${servico ? ` | ${servico}` : ""}\n`;
    }
    if (filtered.length > 10) result += `... e mais ${filtered.length - 10} envios.`;
    return result;
  } catch (e: any) {
    console.error("❌ Erro fetchClienteShipments:", e);
    return "Erro ao buscar envios do cliente.";
  }
}

async function getAdminToken(): Promise<string | null> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
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

// ═══════════════════════════════════════════════════════════
// HELPERS: Mídia (imagem, áudio)
// ═══════════════════════════════════════════════════════════

async function analyzeImageWithGemini(imageUrl: string, geminiKey: string): Promise<{ description: string; trackingCode: string | null; cepOrigem?: string; cepDestino?: string }> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = base64Encode(imageBuffer);
  const mimeType = (imageResponse.headers.get("content-type") || "image/jpeg").split(";")[0].trim();

  const prompt = `Extraia dados úteis desta imagem de forma CONCISA. Retorne no formato:
DESCRIÇÃO: [1 frase do que é a imagem]
CODIGO_RASTREIO: [código dos Correios se houver, formato XX123456789XX, ou NENHUM]
CEP_ORIGEM: [se visível, ou NENHUM]
CEP_DESTINO: [se visível, ou NENHUM]`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ] }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini error: ${response.status}`);
  const data = await response.json();
  const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  let trackingCode: string | null = null;
  const codigoMatch = fullText.match(/CODIGO_RASTREIO:\s*([A-Z]{2}\d{9}[A-Z]{2})/i);
  if (codigoMatch) trackingCode = codigoMatch[1].toUpperCase();
  if (!trackingCode) {
    const genericMatch = fullText.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/);
    if (genericMatch) trackingCode = genericMatch[1].toUpperCase();
  }

  const descMatch = fullText.match(/DESCRI[CÇ][AÃ]O:\s*(.+)/i);
  const description = descMatch ? descMatch[1].trim() : "Imagem analisada";

  const cepOrigemMatch = fullText.match(/CEP_ORIGEM:\s*(\d{5}-?\d{3})/);
  const cepDestinoMatch = fullText.match(/CEP_DESTINO:\s*(\d{5}-?\d{3})/);

  return {
    description,
    trackingCode,
    cepOrigem: cepOrigemMatch?.[1] || undefined,
    cepDestino: cepDestinoMatch?.[1] || undefined,
  };
}

async function transcribeAudio(mediaUrl: string): Promise<string | null> {
  // Tentar ElevenLabs primeiro, depois Gemini
  const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (elevenLabsKey) {
    try {
      return await transcribeAudioWithElevenLabs(mediaUrl, elevenLabsKey);
    } catch (e) {
      console.warn("⚠️ ElevenLabs STT falhou:", e);
    }
  }
  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey) {
    try {
      return await transcribeAudioWithGemini(mediaUrl, geminiKey);
    } catch (e) {
      console.warn("⚠️ Gemini STT falhou:", e);
    }
  }
  return null;
}

async function transcribeAudioWithElevenLabs(audioUrl: string, apiKey: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);
  const audioBlob = await audioResponse.blob();
  const contentType = audioResponse.headers.get("content-type") || "audio/ogg";

  const formData = new FormData();
  formData.append("file", new File([audioBlob], "audio.ogg", { type: contentType }));
  formData.append("model_id", "scribe_v2");
  formData.append("language_code", "por");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: formData,
  });

  if (!response.ok) throw new Error(`ElevenLabs STT error: ${response.status}`);
  const data = await response.json();
  return data.text || "Áudio não transcrito";
}

async function transcribeAudioWithGemini(audioUrl: string, geminiKey: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);
  const audioBuffer = await audioResponse.arrayBuffer();
  const base64Audio = base64Encode(audioBuffer);
  const mimeType = (audioResponse.headers.get("content-type") || "audio/ogg").split(";")[0].trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: "Transcreva este áudio em português. Retorne APENAS a transcrição:" },
          { inline_data: { mime_type: mimeType, data: base64Audio } },
        ] }],
      }),
    }
  );

  if (!response.ok) throw new Error(`Gemini audio error: ${response.status}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Áudio não transcrito";
}

// ═══════════════════════════════════════════════════════════
// HELPERS: TTS
// ═══════════════════════════════════════════════════════════

interface VoiceConfig {
  voiceId: string;
  model: string;
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

async function generateTTSAudio(text: string, apiKey: string, voiceConfig?: VoiceConfig): Promise<string | null> {
  const ttsText = text.length > 500 ? text.substring(0, 497) + "..." : text;
  const voiceId = voiceConfig?.voiceId || "FGY2WhTYpPnrIDTdsKH5";
  const modelId = voiceConfig?.model || "eleven_multilingual_v2";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=opus_48000_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ttsText,
        model_id: modelId,
        voice_settings: {
          stability: voiceConfig?.stability ?? 0.5,
          similarity_boost: voiceConfig?.similarityBoost ?? 0.75,
          style: voiceConfig?.style ?? 0.0,
          use_speaker_boost: true,
          speed: voiceConfig?.speed ?? 1.0,
        },
      }),
    }
  );

  if (!response.ok) throw new Error(`TTS error: ${response.status}`);
  const audioBuffer = await response.arrayBuffer();

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const fileName = `tts-${Date.now()}.ogg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(`tts-audio/${fileName}`, new Uint8Array(audioBuffer), {
      contentType: "audio/ogg; codecs=opus",
      upsert: true,
    });

  if (uploadError) return null;
  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(`tts-audio/${fileName}`);
  return publicUrl.publicUrl;
}

// ═══════════════════════════════════════════════════════════
// HELPERS: Rastreio
// ═══════════════════════════════════════════════════════════

async function fetchTrackingData(codigo: string): Promise<any> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
  const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
  const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");
  if (!adminEmail || !adminPassword) return null;

  const loginResponse = await fetch(`${BASE_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });
  if (!loginResponse.ok) return null;
  const loginData = await loginResponse.json();

  const rastreioResponse = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${loginData.token}`, "Content-Type": "application/json" },
  });
  if (!rastreioResponse.ok) return null;
  return await rastreioResponse.json();
}

function formatTrackingForAI(rastreioData: any): string {
  const dados = rastreioData?.data || rastreioData;
  const eventos = dados?.eventos || [];
  let result = "";
  if (dados?.codigoObjeto) result += `Código: ${dados.codigoObjeto}\n`;
  if (dados?.servico) result += `Serviço: ${dados.servico}\n`;
  if (dados?.dataPrevisaoEntrega) result += `Previsão de entrega: ${dados.dataPrevisaoEntrega}\n`;

  // Extrair endereço de retirada/entrega do último evento (se aguardando retirada)
  if (dados?.enderecoRetirada) {
    result += `📍 Endereço de retirada: ${dados.enderecoRetirada}\n`;
  }

  if (eventos.length > 0) {
    result += `Últimos eventos:\n`;
    for (const ev of eventos.slice(0, 8)) {
      const local = ev.unidade?.cidadeUf || "";
      result += `- ${ev.dataCompleta || ev.date || ""} ${ev.horario || ""}: ${ev.descricao || ""}`;

      // Endereço completo da unidade (se disponível)
      const unidade = ev.unidade || {};
      if (unidade.endereco?.logradouro || unidade.endereco?.bairro) {
        const end = unidade.endereco;
        const endCompleto = [end.logradouro, end.numero, end.bairro, end.localidade, end.uf, end.cep].filter(Boolean).join(", ");
        if (endCompleto) result += ` | Endereço: ${endCompleto}`;
      } else if (unidade.nome && unidade.nome !== local) {
        result += ` | Unidade: ${unidade.nome}`;
      }

      if (local) result += ` (${local})`;
      if (ev.unidadeDestino?.cidadeUf) result += ` → ${ev.unidadeDestino.cidadeUf}`;
      
      // Detalhes adicionais do evento (endereço de retirada, observações)
      if (ev.detalhe) result += ` — ${ev.detalhe}`;
      if (ev.enderecoRetirada) result += ` | 📍 Local de retirada: ${ev.enderecoRetirada}`;
      
      // Endereço completo do destino (se presente)
      const dest = ev.unidadeDestino || {};
      if (dest.endereco?.logradouro) {
        const endDest = dest.endereco;
        const endDestCompleto = [endDest.logradouro, endDest.numero, endDest.bairro, endDest.localidade, endDest.uf, endDest.cep].filter(Boolean).join(", ");
        if (endDestCompleto) result += ` | End. destino: ${endDestCompleto}`;
      }
      
      result += "\n";
    }

    // Extrair endereço de retirada do evento mais recente que indica aguardando retirada
    const eventoRetirada = eventos.find((ev: any) => {
      const desc = (ev.descricao || "").toLowerCase();
      return desc.includes("aguardando retirada") || desc.includes("disponível para retirada") || desc.includes("saiu para entrega");
    });
    if (eventoRetirada) {
      const unidadeRet = eventoRetirada.unidade || {};
      const endRet = unidadeRet.endereco || {};
      const enderecoCompleto = [endRet.logradouro, endRet.numero, endRet.bairro, endRet.localidade, endRet.uf, endRet.cep].filter(Boolean).join(", ");
      if (enderecoCompleto) {
        result += `\n📍 LOCAL PARA RETIRADA: ${unidadeRet.nome ? unidadeRet.nome + " — " : ""}${enderecoCompleto}\n`;
      } else if (unidadeRet.nome) {
        result += `\n📍 LOCAL PARA RETIRADA: ${unidadeRet.nome} (${unidadeRet.cidadeUf || ""})\n`;
      }
    }
  } else {
    result += "Nenhum evento de rastreio encontrado.\n";
  }

  // Dados adicionais que podem conter endereço
  if (dados?.destinatario) {
    const d = dados.destinatario;
    result += `\nDestinatário: ${d.nome || "N/A"}`;
    if (d.logradouro || d.localidade) {
      result += ` | End: ${[d.logradouro, d.numero, d.bairro, d.localidade, d.uf, d.cep].filter(Boolean).join(", ")}`;
    }
    result += "\n";
  }

  return result;
}

// ═══════════════════════════════════════════════════════════
// HELPERS: Prompts padrão
// ═══════════════════════════════════════════════════════════

function getDefaultPrompt(agent: string): string {
  if (agent === "felipe") {
    return `Você é Felipe, especialista de resolução de problemas (Suporte Nível 2) da BRHUB Envios. Fale como um profissional experiente no WhatsApp.

REGRAS OBRIGATÓRIAS:
- Respostas CURTAS mas COMPLETAS: 2-4 frases. Inclua TODOS os dados relevantes.
- Fale como gente de verdade. Linguagem natural, informal mas profissional.
- Vá direto ao ponto. Sem saudações genéricas após a primeira mensagem.
- Use 1 emoji no máximo por mensagem.
- Se não souber, diga "vou verificar com o time" e pronto.
- Português brasileiro natural. Pode usar "vc", "tá", "pra".
- Você tem acesso a ferramentas (rastreio, cotação, saldo). USE-AS quando o contexto pedir, não invente dados.

FORMATO — IMPORTANTÍSSIMO, SIGA À RISCA:
- ESCREVA COMO SE FOSSE UMA MENSAGEM NORMAL DE WHATSAPP. Texto corrido, como uma pessoa real digitando.
- PROIBIDO: bullet points (•, -, *, ●, ▸), listas numeradas (1. 2. 3.), formatação "Situação Atual:", "Ação Necessária:" ou qualquer estrutura de email/relatório.
- PROIBIDO: separar informações em tópicos. Tudo deve ser texto corrido natural.
- NUNCA use formatação elaborada. É WhatsApp, não email.

EXEMPLO CORRETO: "E aí, dei uma olhada no seu pacote AB123456789BR. Ele tá aguardando retirada na Rua Edson Luiz Rigonatto, 1199, Jardim Metonopolis em Campinas-SP. Vou acionar a operação pra entender o que houve com a avaria e te retorno."
EXEMPLO ERRADO: "• Situação Atual: Avariado\\n• Ação Necessária: Retirar no endereço..."

ETIQUETA COMO CHAVE DO ATENDIMENTO:
- O código de rastreio é a CHAVE PRIMÁRIA do atendimento. Use sempre a última etiqueta informada como referência.
- Se o cliente mencionar mais de um código, PERGUNTE sobre qual etiqueta ele quer tratar.
- Se o cliente quiser abrir manifestação/reclamação, use "abrir_manifestacao" com o código de referência.

REGRA CRÍTICA — DADOS COMPLETOS:
- SEMPRE forneça endereços COMPLETOS quando disponíveis (logradouro, número, bairro, cidade, UF, CEP).
- Se o pacote está aguardando retirada, informe o ENDEREÇO COMPLETO do local de retirada. Nunca diga apenas "no endereço indicado" ou "verifique o local". Passe o endereço.
- Se o rastreio trouxer dados de endereço nos eventos, REPASSE ao cliente de forma clara.
- Se não tiver endereço no rastreio, use a tool rastrear_objeto para buscar dados completos antes de responder.
- NUNCA dê respostas vagas como "verifique o local" ou "no endereço indicado". Se vc tem o dado, PASSA pro cliente. Se não tem, diz que vai verificar.

REGRA CRÍTICA — VOCÊ É A BRHUB:
- A BRHUB é representante oficial dos Correios, Jadlog, Loggi e Azul. Para o cliente, NÓS somos os responsáveis pelo envio.
- NUNCA diga "entre em contato com os Correios", "fale com a transportadora", "ligue para os Correios", "procure a Secretaria da Fazenda" ou qualquer variação.
- NUNCA diga "recomendo que você vá até", "sugiro que verifique" ou "vá ao endereço". NÓS damos o endereço e NÓS acionamos a operação.
- NUNCA terceirize a resolução. O problema é NOSSO e NÓS vamos resolver.
- Se houver apreensão, extravio, atraso ou qualquer incidente: demonstre que você vai cuidar pessoalmente.
- Se for algo fora do seu alcance imediato: "vou escalar pro nosso time de operações e te retorno com uma posição, tá?". NUNCA mande o cliente resolver sozinho.

MANIFESTAÇÃO / RECLAMAÇÃO:
- Se o destinatário informar um código de rastreio e pedir para abrir manifestação ou reclamação, use a ferramenta "abrir_manifestacao" com o código e o motivo.
- Após usar a ferramenta, confirme ao cliente que a manifestação foi registrada e que você está acompanhando pessoalmente.

APRENDIZADO CONTÍNUO:
- Analise o contexto da conversa e aprenda com as interações. Se o cliente mencionou um problema, confirme que entendeu antes de agir.
- Sempre use as ferramentas disponíveis para buscar dados REAIS. Nunca invente informações.`;
  }
  return `Você é a Veronica, do Time de Suporte da BRHUB Envios — plataforma de logística com fretes até 70% mais baratos via contratos com Correios, Jadlog, Loggi e Azul.

APRESENTAÇÃO: Na PRIMEIRA mensagem: "Oi! Sou a Veronica do Time de Suporte da BRHUB Envios 😊". Depois não repita.

FERRAMENTAS: Você tem acesso a ferramentas reais (rastrear pacote, cotar frete, consultar saldo). SEMPRE use a ferramenta certa ao invés de inventar dados.

ETIQUETA COMO CHAVE DO ATENDIMENTO:
- O código de rastreio é a CHAVE PRIMÁRIA do atendimento. Use sempre a última etiqueta informada como referência.
- Se o cliente mencionar mais de um código na mesma conversa, PERGUNTE sobre qual etiqueta ele quer tratar antes de responder.
- Se o cliente perguntar algo genérico (ex: "cadê meu pacote?"), use a etiqueta de referência que está no contexto.

REGRA CRÍTICA — DADOS COMPLETOS:
- SEMPRE forneça informações completas quando disponíveis. Endereços, datas, status detalhados.
- Se o pacote está aguardando retirada, informe o endereço completo do local.
- NUNCA dê respostas vagas. Se vc tem o dado, passa pro cliente.

FORMATO — IMPORTANTÍSSIMO, SIGA À RISCA:
- ESCREVA COMO SE FOSSE UMA MENSAGEM NORMAL DE WHATSAPP. Texto corrido, como uma pessoa real digitando.
- PROIBIDO: bullet points (•, -, *, ●, ▸), listas numeradas (1. 2. 3.), formatação "Situação Atual:", "Ação Necessária:" ou qualquer estrutura de email/relatório.
- PROIBIDO: separar informações em tópicos. Tudo deve ser texto corrido natural.
- Máximo 2-3 frases. NUNCA mais que 4 linhas.
- Use 1-2 emojis naturalmente. Português informal: "vc", "tá", "pra".
- Vá direto ao ponto. Seja proativa e carinhosa.
- Quando usar uma ferramenta e tiver resultado, responda de forma natural e curta com os dados.
- Se não souber: "vou chamar alguém do time pra te ajudar 😊"

EXEMPLO CORRETO: "Oi! Seu pacote AB123456789BR tá em Campinas-SP aguardando retirada na Rua Tal, 123, Bairro X. Vc pode buscar lá ou quer que eu acione a operação? 😊"
EXEMPLO ERRADO: "• Situação Atual: Aguardando retirada\\n• Endereço: Rua Tal..."

REGRA CRÍTICA — VOCÊ É A BRHUB:
- A BRHUB é representante oficial dos Correios, Jadlog, Loggi e Azul. Para o cliente, NÓS somos os responsáveis pelo envio.
- NUNCA diga "entre em contato com os Correios", "fale com a transportadora" ou qualquer variação.
- NUNCA terceirize a resolução. O problema é NOSSO e NÓS vamos resolver.
- NUNCA diga "recomendo que você vá até", "verifique o local" ou "procure o endereço". NÓS informamos o endereço completo e oferecemos ajuda.
- Se for algo fora do seu alcance: "vou acionar nosso time de operações e te retorno 😊". NUNCA mande o cliente resolver sozinho.

MANIFESTAÇÃO / RECLAMAÇÃO:
- Se o destinatário informar um código de rastreio e pedir para abrir manifestação ou reclamação, use a ferramenta "abrir_manifestacao" com o código e o motivo.
- Após usar a ferramenta, confirme ao cliente que a manifestação foi registrada e que a equipe vai analisar.

TRANSFERÊNCIA PRO FELIPE (SUPORTE NÍVEL 2):
- Casos de atraso, extravio, dano, apreensão e problemas graves são tratados pelo Felipe do Suporte Nível 2.
- O sistema transfere automaticamente COM uma mensagem profissional de transição — você NÃO precisa avisar manualmente.
- Apenas demonstre empatia e reconheça a situação do cliente.`;
}

// ═══════════════════════════════════════════════════════════
// HELPERS: Logging
// ═══════════════════════════════════════════════════════════

async function logInteraction(supabase: any, data: any) {
  try {
    await supabase.from("ai_interaction_logs").insert(data);
  } catch (e) {
    console.warn("⚠️ Erro ao logar:", e);
  }
}

// ═══════════════════════════════════════════════════════════
// HELPERS: Tickets & Pipeline
// ═══════════════════════════════════════════════════════════

async function detectAndCreateSupportTicket(supabase: any, conversationId: string, contactPhone: string, userMessage: string, _aiReply: string, agentName: string) {
  try {
    const lowerMsg = (userMessage || "").toLowerCase();
    
    // Regras de categorização por keyword
    const categoryRules: { keywords: string[]; category: string; priority: string }[] = [
      { keywords: ["procon", "processo", "advogado", "pior empresa", "denúncia", "reclame aqui"], category: "reclamacao", priority: "urgente" },
      { keywords: ["péssimo", "horrível", "absurdo", "lixo", "nunca mais", "vou processar"], category: "reclamacao", priority: "urgente" },
      { keywords: ["reclamar", "reclamação", "insatisfeito", "problema grave"], category: "reclamacao", priority: "alta" },
      { keywords: ["manifestação", "manifestacao", "abrir manifestação", "abrir manifestacao", "abrir reclamação", "abrir reclamacao", "registrar reclamação", "registrar reclamacao"], category: "reclamacao", priority: "alta" },
      { keywords: ["extraviou", "extraviado", "roubado", "furto", "sumiu", "perdido", "perdida"], category: "rastreio", priority: "urgente" },
      { keywords: ["não chegou", "nao chegou", "demora", "atraso", "atrasado", "atrasada", "demorando"], category: "rastreio", priority: "alta" },
      { keywords: ["rastreio", "rastrear", "rastreamento", "código", "cadê", "cade", "onde tá", "onde ta", "quando chega"], category: "rastreio", priority: "normal" },
      { keywords: ["danificado", "quebrado", "avariado", "amassado", "destruído"], category: "reclamacao", priority: "alta" },
      { keywords: ["apreendido", "apreensão", "retido", "retida", "retenção"], category: "rastreio", priority: "urgente" },
      { keywords: ["cancelar", "cancelamento", "estornar", "estorno", "reembolso"], category: "cancelamento", priority: "alta" },
      { keywords: ["cobrado errado", "cobrança indevida", "valor errado", "fatura", "boleto"], category: "financeiro", priority: "alta" },
      { keywords: ["saldo", "crédito", "recarga", "pix", "pagamento"], category: "financeiro", priority: "normal" },
      { keywords: ["etiqueta", "emitir", "emissão", "planilha", "importar"], category: "operacional", priority: "normal" },
      { keywords: ["cadastro", "senha", "login", "acesso", "conta"], category: "acesso", priority: "normal" },
      { keywords: ["cotação", "cotacao", "preço", "frete", "simular"], category: "comercial", priority: "normal" },
      { keywords: ["elogio", "parabéns", "excelente", "ótimo", "muito bom", "nota 10"], category: "elogio", priority: "baixa" },
    ];

    let matchedCategory = "duvida"; // default: se não matchou nada, é dúvida geral
    let matchedPriority = "normal";
    for (const rule of categoryRules) {
      if (rule.keywords.some(k => lowerMsg.includes(k))) {
        matchedCategory = rule.category;
        matchedPriority = rule.priority;
        break;
      }
    }

    // Verificar se já existe card aberto para esta conversa
    const { data: existing } = await supabase
      .from("ai_support_pipeline")
      .select("id, status, category")
      .eq("conversation_id", conversationId)
      .not("status", "eq", "concluido")
      .not("status", "eq", "entregue")
      .not("status", "eq", "cancelado")
      .not("status", "eq", "fechado")
      .limit(1);

    if (existing && existing.length > 0) {
      // Card já existe — atualizar sentimento se necessário
      const negativePatterns = ["péssimo", "horrível", "absurdo", "pior", "lixo", "nunca mais"];
      const positivePatterns = ["obrigado", "obrigada", "valeu", "muito bom", "excelente", "parabéns"];
      if (negativePatterns.some(p => lowerMsg.includes(p))) {
        await supabase.from("ai_support_pipeline").update({ sentiment: "muito_negativo", updated_at: new Date().toISOString() }).eq("id", existing[0].id);
      } else if (positivePatterns.some(p => lowerMsg.includes(p))) {
        await supabase.from("ai_support_pipeline").update({ sentiment: "positivo", updated_at: new Date().toISOString() }).eq("id", existing[0].id);
      }
      return;
    }

    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name")
      .eq("id", conversationId)
      .single();

    // Determinar sentimento inicial
    const negPatterns = ["péssimo", "horrível", "absurdo", "pior", "lixo", "procon", "processo"];
    const sentiment = negPatterns.some(p => lowerMsg.includes(p)) ? "muito_negativo"
      : matchedPriority === "urgente" ? "negativo"
      : matchedPriority === "alta" ? "negativo"
      : matchedCategory === "elogio" ? "positivo"
      : "neutro";

    console.log("📋 Criando card pipeline:", { category: matchedCategory, priority: matchedPriority, sentiment });

    await supabase.from("ai_support_pipeline").insert({
      conversation_id: conversationId,
      contact_phone: contactPhone,
      contact_name: conv?.contact_name || null,
      category: matchedCategory,
      priority: matchedPriority,
      status: "novo",
      subject: (userMessage || "").substring(0, 120),
      description: userMessage?.substring(0, 500) || null,
      sentiment,
      detected_by: agentName,
    });
    console.log("✅ Card pipeline criado para conversa:", conversationId);
  } catch (e) {
    console.warn("⚠️ Erro pipeline:", e);
  }
}

async function ensureTicketOpen(supabase: any, conversationId: string, contactPhone: string, userMessage: string) {
  try {
    const { data: openTicket } = await supabase
      .from("whatsapp_tickets")
      .select("id, message_count")
      .eq("conversation_id", conversationId)
      .eq("status", "open")
      .limit(1)
      .single();

    if (openTicket) {
      await supabase.from("whatsapp_tickets").update({
        message_count: (openTicket.message_count || 0) + 1,
        last_message_at: new Date().toISOString(),
      }).eq("id", openTicket.id);
      return;
    }

    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name")
      .eq("id", conversationId)
      .single();

    await supabase.from("whatsapp_tickets").insert({
      conversation_id: conversationId,
      contact_phone: contactPhone,
      contact_name: conv?.contact_name || null,
      status: "open",
      subject: userMessage?.substring(0, 120) || "Nova conversa",
      first_message_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 1,
    });
    console.log("🎫 Ticket criado para conversa:", conversationId);
  } catch (e) {
    console.warn("⚠️ Erro ticket:", e);
  }
}

const PIPELINE_FLOWS: Record<string, string[]> = {
  reclamacao: ["novo", "triagem", "investigacao", "resolucao", "concluido"],
  rastreio: ["novo", "verificando", "localizado", "em_transito", "entregue"],
  cancelamento: ["novo", "analise", "processamento", "aprovado", "concluido"],
  financeiro: ["novo", "analise", "processamento", "aprovado", "concluido"],
  operacional: ["novo", "em_andamento", "concluido"],
  acesso: ["novo", "em_andamento", "concluido"],
  comercial: ["novo", "em_andamento", "concluido"],
  duvida: ["novo", "respondido", "concluido"],
  elogio: ["novo", "concluido"],
};

async function progressPipelineStatus(supabase: any, conversationId: string, userMessage: string, aiReply: string) {
  try {
    const { data: pipeline } = await supabase
      .from("ai_support_pipeline")
      .select("*")
      .eq("conversation_id", conversationId)
      .not("status", "eq", "concluido")
      .not("status", "eq", "entregue")
      .not("status", "eq", "cancelado")
      .not("status", "eq", "fechado")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!pipeline) return;

    const category = pipeline.category || "duvida";
    const flow = PIPELINE_FLOWS[category] || PIPELINE_FLOWS.duvida;
    const currentIdx = flow.indexOf(pipeline.status);
    if (currentIdx === -1 || currentIdx >= flow.length - 1) return;

    const lowerReply = (aiReply || "").toLowerCase();
    const lowerMsg = (userMessage || "").toLowerCase();
    let shouldProgress = false;
    let newStatus = "";
    let progressReason = "";

    if (category === "rastreio") {
      if (pipeline.status === "novo" && (lowerReply.includes("rastr") || lowerReply.includes("verific") || lowerReply.includes("consult"))) {
        shouldProgress = true; newStatus = "verificando"; progressReason = "IA verificou rastreio";
      } else if (pipeline.status === "verificando" && (lowerReply.includes("localizado") || lowerReply.includes("encontr") || lowerReply.includes("em trânsito") || lowerReply.includes("em transito"))) {
        shouldProgress = true; newStatus = "localizado"; progressReason = "Pacote localizado";
      } else if ((lowerReply.includes("entregue") || lowerReply.includes("entrega confirmada") || lowerReply.includes("foi entregue"))) {
        shouldProgress = true; newStatus = "entregue"; progressReason = "Entrega confirmada";
      }
    } else if (category === "reclamacao") {
      if (pipeline.status === "novo" && lowerReply.length > 50) {
        shouldProgress = true; newStatus = "triagem"; progressReason = "Triagem inicial pela IA";
      } else if (pipeline.status === "triagem" && (lowerReply.includes("investigar") || lowerReply.includes("verificar") || lowerReply.includes("analis"))) {
        shouldProgress = true; newStatus = "investigacao"; progressReason = "Em investigação";
      }
    } else if (category === "duvida") {
      if (pipeline.status === "novo" && lowerReply.length > 30) {
        shouldProgress = true; newStatus = "respondido"; progressReason = "Dúvida respondida pela IA";
      }
    } else {
      // Categorias genéricas (operacional, acesso, comercial, financeiro, cancelamento)
      if (pipeline.status === "novo" && lowerReply.length > 30) {
        shouldProgress = true; newStatus = flow[1]; progressReason = "Em andamento";
      }
    }

    // Detectar resolução por keywords
    const resolutionPatterns = ["resolvido", "solucionado", "concluído", "foi corrigido", "problema resolvido", "tudo certo", "está tudo ok"];
    if (resolutionPatterns.some(p => lowerReply.includes(p))) {
      shouldProgress = true; newStatus = flow[flow.length - 1]; progressReason = "Resolução detectada pela IA";
    }

    // Detectar resolução por agradecimento do cliente (indica satisfação)
    const gratitudePatterns = ["obrigado", "obrigada", "valeu", "muito obrigado", "agradeço", "perfeito"];
    if (gratitudePatterns.some(p => lowerMsg.includes(p)) && currentIdx >= 1) {
      shouldProgress = true; newStatus = flow[flow.length - 1]; progressReason = "Cliente agradeceu — caso resolvido";
    }

    if (shouldProgress && newStatus) {
      console.log("📋 Pipeline progredindo:", { from: pipeline.status, to: newStatus, reason: progressReason });
      await supabase.from("ai_support_pipeline").update({
        status: newStatus,
        resolution: progressReason,
        updated_at: new Date().toISOString(),
      }).eq("id", pipeline.id);

      // Atualizar sentimento se positivo
      if (gratitudePatterns.some(p => lowerMsg.includes(p))) {
        await supabase.from("ai_support_pipeline").update({ sentiment: "positivo" }).eq("id", pipeline.id);
      }
    }
  } catch (e) {
    console.warn("⚠️ Erro pipeline progress:", e);
  }
}

async function detectTicketResolution(supabase: any, conversationId: string, aiReply: string) {
  try {
    const lowerReply = (aiReply || "").toLowerCase();
    
    // Padrões de resolução na resposta da IA
    const strongPatterns = ["resolvido", "solucionado", "concluído", "foi entregue", "entregue com sucesso", "estorno realizado", "problema corrigido"];
    // Padrões de finalização mais suaves
    const softPatterns = ["mais alguma coisa", "posso ajudar em algo mais", "precisa de mais alguma", "qualquer dúvida", "estou à disposição"];
    
    const isStrong = strongPatterns.some(p => lowerReply.includes(p));
    
    if (!isStrong) return;

    const { data: updated } = await supabase.from("whatsapp_tickets").update({
      status: "resolved",
      resolution: aiReply.substring(0, 200),
      closed_at: new Date().toISOString(),
      closed_by: "ai",
    }).eq("conversation_id", conversationId).eq("status", "open").select("id");

    if (updated && updated.length > 0) {
      console.log("🎫 Ticket resolvido automaticamente:", updated[0].id);
    }
  } catch (e) {
    console.warn("⚠️ Erro ticket resolution:", e);
  }
}

// ═══════════════════════════════════════════════════════════
// SANITIZAR RESPOSTA: Remover códigos de rastreio e URLs
// ═══════════════════════════════════════════════════════════

function sanitizeAgentReply(reply: string, contentType: string): string {
  // Códigos de rastreio só são removidos em respostas de ÁUDIO (TTS)
  if (contentType === "audio" || contentType === "voice" || contentType === "ptt") {
    reply = reply.replace(/\b[A-Z]{2}\d{9,13}[A-Z]{2}\b/g, "[código de rastreio informado]");
  }

  // URLs sempre removidas
  reply = reply.replace(/https?:\/\/[^\s)>\]]+/gi, "[link removido]");
  reply = reply.replace(/www\.[^\s)>\]]+/gi, "[link removido]");

  // Remover múltiplos placeholders seguidos
  reply = reply.replace(/(\[código de rastreio informado\]\s*,?\s*){2,}/g, "[código de rastreio informado]");
  reply = reply.replace(/(\[link removido\]\s*,?\s*){2,}/g, "[link removido]");

  // Remover bullet points e formatação de lista que a IA insiste em usar
  reply = reply.replace(/^[\s]*[•·●○▪▸►▹–—]\s*/gm, "");
  reply = reply.replace(/^\s*[-]\s+/gm, "");
  reply = reply.replace(/^\s*\d+[.)]\s+/gm, "");
  // Remover linhas com formato "**Label:** valor" mantendo o conteúdo natural
  reply = reply.replace(/\*\*([^*]+):\*\*\s*/g, "$1: ");
  // Remover CEPs soltos sem contexto (8 dígitos que não são parte de endereço)
  // Manter CEPs que já estão formatados (XXXXX-XXX) ou precedidos por "CEP"
  
  // Limpar linhas vazias duplas
  reply = reply.replace(/\n{3,}/g, "\n\n");

  return reply.trim();
}

// ═══════════════════════════════════════════════════════════
// HANDOFF: Veronica → Felipe
// ═══════════════════════════════════════════════════════════

function detectHandoffTrigger(userMessage: string, _aiReply: string): boolean {
  const lowerMsg = (userMessage || "").toLowerCase();
  const escalationKeywords = [
    "procon", "processo", "advogado", "denúncia", "reclame aqui",
    "pior empresa", "péssimo", "horrível", "absurdo", "lixo",
    "cobrança indevida", "cobrado errado", "valor errado",
    "estorno", "reembolso", "devolver meu dinheiro",
    "extraviou", "extraviado", "extraviada", "roubado", "furto", "sumiu", "perdido", "perdida",
    "danificado", "danificada", "quebrado", "quebrada", "avariado", "avariada", "amassado", "destruído",
    "cancelar tudo", "quero cancelar", "cancela minha conta",
    "nunca mais", "vou processar", "vou denunciar", "que vergonha",
    "muita raiva", "revoltado", "revoltada",
    // Atraso / demora (masculino + feminino)
    "atrasado", "atrasada", "atrasados", "atrasadas", "atraso", "atrasou",
    "demora", "demorando", "demorou", "demorada",
    "não chegou", "nao chegou", "não chegando", "nao chegando",
    "cadê meu", "cade meu", "cadê minha", "cade minha",
    "tá demorando", "ta demorando", "prazo estourou", "prazo vencido",
    "passou do prazo", "fora do prazo", "entrega atrasada",
    "não recebi", "nao recebi", "quando chega", "quando vai chegar",
    // Apreensão / retenção
    "apreendido", "apreendida", "apreensão", "apreensao", "retido", "retida", "retenção", "retencao",
  ];
  return escalationKeywords.some(k => lowerMsg.includes(k));
}

function detectBackToVeronicaTrigger(userMessage: string): boolean {
  const lowerMsg = (userMessage || "").toLowerCase();
  const keywords = [
    "quero falar com a veronica", "quero a veronica", "volta pra veronica",
    "transfere pra veronica", "transferir pra veronica", "transfere para veronica",
    "passa pra veronica", "chama a veronica", "falar com veronica",
    "prefiro a veronica", "me passa pra veronica", "veronica por favor",
  ];
  return keywords.some(k => lowerMsg.includes(k));
}

async function performHandoffToVeronica(
  supabase: any, conversationId: string, contactPhone: string, userMessage: string,
  channel: { channel_id: string; access_key: string }
) {
  try {
    const handoffMessage = "*Felipe:*\n\nSem problemas! Vou te passar pra Veronica agora, ela vai continuar te atendendo. Um momento 😊";

    await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: { Authorization: `AccessKey ${channel.access_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: contactPhone, from: channel.channel_id, type: "text", content: { text: handoffMessage } }),
    }).then(r => r.json()).then(async (mbResult) => {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId, messagebird_id: mbResult.id || null,
        direction: "outbound", content_type: "text", content: handoffMessage,
        status: "sent", sent_by: "felipe", ai_generated: true,
      });
    });

    // Delay profissional para transição natural
    await new Promise(resolve => setTimeout(resolve, 5000));

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return;

    const { data: veronicaConfig } = await supabase.from("ai_agents").select("*").eq("name", "veronica").eq("is_active", true).single();
    const { data: conv } = await supabase.from("whatsapp_conversations").select("contact_name").eq("id", conversationId).single();

    const contactName = conv?.contact_name || "";
    const greeting = contactName ? contactName.split(" ")[0] : "tudo bem";

    const veronicaIntroPrompt = `Você é a Veronica, atendente virtual da BRHUB Envios. O Felipe te transferiu o cliente de volta.
O cliente disse: "${userMessage}"
Se apresente de volta: "Oi ${greeting}, aqui é a Veronica de novo!". Pergunte como pode ajudar.
Tom amigável, informal, acolhedor. Máximo 2-3 frases. Use emojis moderados.`;

    const veronicaResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: veronicaConfig?.model || "gpt-4o",
        messages: [{ role: "system", content: veronicaIntroPrompt }, { role: "user", content: userMessage }],
        max_tokens: 150, temperature: 0.8,
      }),
    });

    if (!veronicaResponse.ok) return;
    const veronicaData = await veronicaResponse.json();
    const veronicaRaw = veronicaData.choices?.[0]?.message?.content || `Oi ${greeting}, aqui é a Veronica de novo! Como posso te ajudar? 😊`;
    const veronicaReply = `*Veronica:*\n\n${veronicaRaw}`;

    const mbText = await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: { Authorization: `AccessKey ${channel.access_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: contactPhone, from: channel.channel_id, type: "text", content: { text: veronicaReply } }),
    });
    const mbTextResult = await mbText.json();
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId, messagebird_id: mbTextResult.id || null,
      direction: "outbound", content_type: "text", content: veronicaReply,
      status: "sent", sent_by: "veronica", ai_generated: true,
    });

    await supabase.from("whatsapp_conversations").update({
      active_agent: "veronica",
      last_message_at: new Date().toISOString(),
      last_message_preview: veronicaReply.substring(0, 100),
    }).eq("id", conversationId);

    await logInteraction(supabase, {
      conversation_id: conversationId, agent_name: "veronica", content_type: "text",
      provider: "openai", model: veronicaConfig?.model || "gpt-4o", success: true,
      response_time_ms: 0, tool_used: "handoff_from_felipe",
    });

    console.log("✅ Handoff Felipe → Veronica concluído");
  } catch (e) {
    console.error("❌ Erro handoff Felipe → Veronica:", e);
  }
}

async function performHandoffToFelipe(
  supabase: any, conversationId: string, contactPhone: string, userMessage: string,
  channel: { channel_id: string; access_key: string }
) {
  try {
    const handoffMessage = "*Veronica:*\n\nEntendi a situação! Para esse tipo de caso, nosso time de Suporte Nível 2 é quem cuida diretamente. Vou te passar pro Felipe, que é nosso especialista em resoluções — ele vai analisar tudo e te dar um retorno completo, tá? Um instante 😊";

    await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: { Authorization: `AccessKey ${channel.access_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: contactPhone, from: channel.channel_id, type: "text", content: { text: handoffMessage } }),
    }).then(r => r.json()).then(async (mbResult) => {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId, messagebird_id: mbResult.id || null,
        direction: "outbound", content_type: "text", content: handoffMessage,
        status: "sent", sent_by: "veronica", ai_generated: true,
      });
    });

    // Delay profissional para transição natural
    await new Promise(resolve => setTimeout(resolve, 5000));

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) return;

    const { data: felipeConfig } = await supabase.from("ai_agents").select("*").eq("name", "felipe").eq("is_active", true).single();
    const { data: conv } = await supabase.from("whatsapp_conversations").select("contact_name").eq("id", conversationId).single();

    const contactName = conv?.contact_name || "";
    const greeting = contactName ? contactName.split(" ")[0] : "tudo bem";

    const felipeIntroPrompt = `Você é o Felipe, especialista de resolução de problemas da BRHUB Envios. A Veronica te transferiu um cliente.
O cliente disse: "${userMessage}"
Se apresente: "E aí ${greeting}, aqui é o Felipe". Diga que a Veronica te passou a situação. Mostre que entendeu. Tranquilize.
Tom calmo, confiante, informal. Máximo 3-4 frases. SEM emojis (vai virar áudio). SEM perguntas na primeira mensagem.`;

    const felipeResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: felipeConfig?.model || "gpt-4o",
        messages: [{ role: "system", content: felipeIntroPrompt }, { role: "user", content: userMessage }],
        max_tokens: 150, temperature: 0.8,
      }),
    });

    if (!felipeResponse.ok) return;
    const felipeData = await felipeResponse.json();
    const felipeRaw = felipeData.choices?.[0]?.message?.content || "E aí, aqui é o Felipe. A Veronica me passou sua situação e vou te ajudar a resolver.";
    const felipeReply = `*Felipe:*\n\n${felipeRaw}`;

    let audioSent = false;
    const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (elevenLabsKey) {
      try {
        const voiceConfig: VoiceConfig = {
          voiceId: felipeConfig?.voice_id || "cjVigY5qzO86Huf0OWal",
          model: felipeConfig?.tts_model || "eleven_multilingual_v2",
          stability: felipeConfig?.voice_stability ?? 0.45,
          similarityBoost: felipeConfig?.voice_similarity_boost ?? 0.75,
          style: felipeConfig?.voice_style ?? 0.2,
          speed: felipeConfig?.voice_speed ?? 1.0,
        };
        const audioUrl = await generateTTSAudio(felipeReply, elevenLabsKey, voiceConfig);
        if (audioUrl) {
          const mbAudio = await fetch("https://conversations.messagebird.com/v1/send", {
            method: "POST",
            headers: { Authorization: `AccessKey ${channel.access_key}`, "Content-Type": "application/json" },
            body: JSON.stringify({ to: contactPhone, from: channel.channel_id, type: "audio", content: { audio: { url: audioUrl } } }),
          });
          const mbAudioResult = await mbAudio.json();
          await supabase.from("whatsapp_messages").insert({
            conversation_id: conversationId, messagebird_id: mbAudioResult.id || null,
            direction: "outbound", content_type: "voice", content: felipeReply,
            media_url: audioUrl, status: "sent", sent_by: "felipe", ai_generated: true,
          });
          audioSent = true;
        }
      } catch (e) { console.warn("⚠️ TTS Felipe:", e); }
    }

    if (!audioSent) {
      const mbText = await fetch("https://conversations.messagebird.com/v1/send", {
        method: "POST",
        headers: { Authorization: `AccessKey ${channel.access_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ to: contactPhone, from: channel.channel_id, type: "text", content: { text: felipeReply } }),
      });
      const mbTextResult = await mbText.json();
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId, messagebird_id: mbTextResult.id || null,
        direction: "outbound", content_type: "text", content: felipeReply,
        status: "sent", sent_by: "felipe", ai_generated: true,
      });
    }

    await supabase.from("whatsapp_conversations").update({
      active_agent: "felipe",
      last_message_at: new Date().toISOString(),
      last_message_preview: felipeReply.substring(0, 100),
    }).eq("id", conversationId);

    await logInteraction(supabase, {
      conversation_id: conversationId, agent_name: "felipe", content_type: "voice",
      provider: "openai", model: felipeConfig?.model || "gpt-4o", success: true,
      response_time_ms: 0, tool_used: "handoff_from_veronica",
    });

    console.log("✅ Handoff Veronica → Felipe concluído");
  } catch (e) {
    console.error("❌ Erro handoff:", e);
  }
}
