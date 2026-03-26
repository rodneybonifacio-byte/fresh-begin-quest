// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { validateBrhubToken } from "../_shared/brhubAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-brhub-authorization, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ══════════════════════════════════════════
    // 1. Validar token BRHUB
    // ══════════════════════════════════════════
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

    const supabaseEarly = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ══════════════════════════════════════════
    // ACTION: load-history — retorna mensagens anteriores
    // ══════════════════════════════════════════
    if (action === "load-history") {
      const syntheticPhone = `web-panel-${clienteId}`;
      
      // Buscar conversa existente
      const { data: conv } = await supabaseEarly
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

      const { data: msgs } = await supabaseEarly
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

    const supabase = supabaseEarly;

    // ══════════════════════════════════════════
    // 2. Encontrar ou criar conversa no CRM
    // ══════════════════════════════════════════
    const syntheticPhone = `web-panel-${clienteId}`;
    let conversationId = existingConvId;

    if (conversationId) {
      // Verificar se a conversa existe e pertence a este cliente
      const { data: existingConv } = await supabase
        .from("whatsapp_conversations")
        .select("id, cliente_id")
        .eq("id", conversationId)
        .eq("contact_phone", syntheticPhone)
        .single();

      if (!existingConv) conversationId = null;
    }

    if (!conversationId) {
      // Buscar conversa existente para este cliente no painel web
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
        // Criar nova conversa
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

        if (createErr) {
          console.error("❌ Erro ao criar conversa:", createErr);
          throw new Error("Falha ao criar conversa");
        }
        conversationId = newConv.id;
      }
    }

    // ══════════════════════════════════════════
    // 3. Salvar mensagem do usuário
    // ══════════════════════════════════════════
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

    // Atualizar conversa
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: message.substring(0, 100),
        status: "open",
        ai_enabled: true,
      })
      .eq("id", conversationId);

    // ══════════════════════════════════════════
    // 4. Carregar histórico de mensagens
    // ══════════════════════════════════════════
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, ai_generated, sent_by")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    const chatHistory = (history || []).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.content || "",
    }));

    // ══════════════════════════════════════════
    // 5. Buscar dados do cliente via API BRHUB
    // ══════════════════════════════════════════
    const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br/api";
    let clienteContext = "";

    try {
      // Buscar emissões recentes
      const emissionsResp = await fetch(`${BASE_API_URL}/emissoes?page=0&size=10&sort=criadoEm,desc`, {
        headers: { Authorization: `Bearer ${brhubToken}`, "Content-Type": "application/json" },
      });

      if (emissionsResp.ok) {
        const emissionsData = await emissionsResp.json();
        const emissoes = emissionsData?.content || emissionsData?.data?.content || [];
        if (emissoes.length > 0) {
          const resumo = emissoes.slice(0, 5).map((e: any) =>
            `- ${e.codigoObjeto || "sem código"} | ${e.servico || "?"} | Status: ${e.status || "?"} | Dest: ${e.destinatario?.nome || "?"} | Valor: R$${e.valorPostagem || "?"}`
          ).join("\n");
          clienteContext += `\n\n📦 ÚLTIMAS EMISSÕES DO CLIENTE:\n${resumo}`;
        }
      }

      // Buscar saldo
      const { data: saldoData } = await supabase.rpc("calcular_saldo_disponivel", { p_cliente_id: clienteId });
      if (saldoData !== null && saldoData !== undefined) {
        clienteContext += `\n\n💰 SALDO DISPONÍVEL: R$ ${Number(saldoData).toFixed(2)}`;
      }

      // Buscar remetentes
      const { data: remetentes } = await supabase
        .from("remetentes")
        .select("id, nome, cpf_cnpj, cep, localidade, uf")
        .eq("cliente_id", clienteId)
        .limit(5);

      if (remetentes && remetentes.length > 0) {
        const remResumo = remetentes.map((r: any) => `- ${r.nome} (${r.cpf_cnpj}) - ${r.localidade}/${r.uf}`).join("\n");
        clienteContext += `\n\n📋 REMETENTES CADASTRADOS:\n${remResumo}`;
      }
    } catch (ctxErr) {
      console.warn("⚠️ Erro ao buscar contexto do cliente:", ctxErr);
    }

    // ══════════════════════════════════════════
    // 6. Montar system prompt segmentado
    // ══════════════════════════════════════════
    const today = new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    
    const systemPrompt = `Você é a Veronica, assistente virtual da BRHUB, atendendo via painel web.

DATA ATUAL: ${today}

CLIENTE LOGADO:
- Nome: ${userName}
- Email: ${userEmail}
- ID: ${clienteId}

${clienteContext}

REGRAS:
1. Você ATENDE EXCLUSIVAMENTE este cliente. Nunca forneça dados de outro cliente.
2. Seja informal, amigável e concisa. Use emojis com moderação.
3. Para rastreio: informe o status real dos objetos listados acima. Se o cliente perguntar por um código específico, use os dados que tem.
4. Para etiquetas: oriente o cliente a usar a funcionalidade de emissão no painel, ou diga que pode ajudar com informações sobre como emitir.
5. Para saldo: informe o saldo disponível quando perguntado.
6. Se não souber algo, diga que vai verificar e oriente o cliente a usar as funcionalidades do painel.
7. Máximo 3-4 frases por resposta. Seja direta e útil.
8. NUNCA invente dados. Use apenas informações reais do contexto.`;

    // ══════════════════════════════════════════
    // 7. Chamar IA
    // ══════════════════════════════════════════
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("AI não configurada");
    }

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...chatHistory,
    ];

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: aiMessages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("❌ AI error:", aiResponse.status, errText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem. Tente novamente.";

    // ══════════════════════════════════════════
    // 8. Salvar resposta da IA
    // ══════════════════════════════════════════
    await supabase.from("whatsapp_messages").insert({
      conversation_id: conversationId,
      direction: "outbound",
      content_type: "text",
      content: aiReply,
      status: "delivered",
      sent_by: "veronica",
      ai_generated: true,
      metadata: { source: "web-panel", agent: "veronica" },
    });

    // Atualizar preview
    await supabase
      .from("whatsapp_conversations")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: aiReply.substring(0, 100),
      })
      .eq("id", conversationId);

    // Log
    await supabase.from("ai_interaction_logs").insert({
      conversation_id: conversationId,
      agent_name: "veronica-web",
      content_type: "text",
      provider: "openai",
      model: "gpt-4o-mini",
      success: true,
      input_tokens: aiData.usage?.prompt_tokens || 0,
      output_tokens: aiData.usage?.completion_tokens || 0,
    });

    return new Response(
      JSON.stringify({
        reply: aiReply,
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
