// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelForConversation } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { conversationId, message, contactPhone, agent, contentType, mediaUrl } = await req.json();

    if (!conversationId || !message) {
      return new Response(
        JSON.stringify({ error: "Dados insuficientes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🤖 Chat AI para conversa ${conversationId}, agente: ${agent}`);

    // Buscar histórico da conversa (últimas 20 mensagens)
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, content_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    // Montar mensagens para o modelo
    const systemPrompt = getSystemPrompt(agent || "maya");
    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.content || "[mídia]",
        });
      }
    }

    // Adicionar mensagem atual
    messages.push({ role: "user", content: message });

    // Se tem imagem e GEMINI_API_KEY, usar Gemini para interpretar
    let imageContext = "";
    if (contentType === "image" && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          imageContext = await interpretImage(mediaUrl, geminiKey);
          messages.push({ role: "user", content: `[Contexto da imagem enviada: ${imageContext}]` });
        } catch (e) {
          console.warn("⚠️ Erro ao interpretar imagem:", e);
        }
      }
    }

    // Chamar Lovable AI (OpenAI GPT via gateway)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("❌ AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit - IA indisponível temporariamente" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos IA esgotados" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    console.log("🤖 Resposta IA:", aiReply.substring(0, 100));

    // Enviar resposta via MessageBird
    const channel = await resolveChannelForConversation(conversationId);
    if (channel) {
      const sendPayload = {
        to: contactPhone,
        from: channel.channel_id,
        type: "text",
        content: { text: aiReply },
      };

      const mbResponse = await fetch("https://conversations.messagebird.com/v1/send", {
        method: "POST",
        headers: {
          Authorization: `AccessKey ${channel.access_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sendPayload),
      });

      const mbResult = await mbResponse.json();
      console.log("📨 Resposta IA enviada via MessageBird:", mbResponse.status);

      // Salvar resposta da IA no banco
      await supabase.from("whatsapp_messages").insert({
        conversation_id: conversationId,
        messagebird_id: mbResult.id || null,
        direction: "outbound",
        content_type: "text",
        content: aiReply,
        status: "sent",
        sent_by: agent || "maya",
        ai_generated: true,
      });

      // Atualizar conversa
      await supabase
        .from("whatsapp_conversations")
        .update({
          last_message_at: new Date().toISOString(),
          last_message_preview: aiReply.substring(0, 100),
        })
        .eq("id", conversationId);
    }

    return new Response(
      JSON.stringify({ ok: true, reply: aiReply }),
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

function getSystemPrompt(agent: string): string {
  if (agent === "felipe") {
    return `Você é Felipe, assistente virtual da BRHUB Envios. Você é direto, profissional e eficiente.
Você ajuda clientes com:
- Rastreamento de encomendas
- Informações sobre serviços de frete
- Dúvidas sobre preços e prazos
- Suporte geral sobre envios
Responda sempre em português brasileiro, de forma concisa e útil.
Se não souber a resposta, diga que vai encaminhar para um atendente humano.`;
  }

  // Maya (padrão)
  return `Você é Maya, assistente virtual da BRHUB Envios. Você é simpática, prestativa e empática.
Você ajuda clientes com:
- Rastreamento de encomendas
- Informações sobre serviços de frete e transportadoras
- Dúvidas sobre preços, prazos e embalagens
- Suporte geral sobre envios e logística
- Reclamações e problemas com entregas
Responda sempre em português brasileiro, de forma acolhedora e clara.
Use emojis com moderação para tornar a conversa mais amigável.
Se não souber a resposta, diga que vai encaminhar para um atendente humano.`;
}

async function interpretImage(imageUrl: string, geminiKey: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Descreva brevemente o conteúdo desta imagem em português:" },
              { inline_data: { mime_type: "image/jpeg", data: imageUrl } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Imagem não identificada";
}
