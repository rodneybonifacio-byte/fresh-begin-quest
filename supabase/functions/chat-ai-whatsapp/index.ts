// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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

    console.log(`🤖 Chat AI para conversa ${conversationId}, agente: ${agent}, contentType: ${contentType}`);

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

    // Se tem imagem, interpretar via Gemini com base64
    if (contentType === "image" && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const imageContext = await interpretImage(mediaUrl, geminiKey);
          messages.push({ role: "user", content: `[O cliente enviou uma imagem. Descrição: ${imageContext}]\n\n${message || "O que você vê nesta imagem?"}` });
        } catch (e) {
          console.warn("⚠️ Erro ao interpretar imagem:", e);
          messages.push({ role: "user", content: message || "[O cliente enviou uma imagem que não pude interpretar]" });
        }
      } else {
        messages.push({ role: "user", content: message || "[imagem enviada]" });
      }
    }
    // Se tem áudio, transcrever via Gemini
    else if ((contentType === "audio" || contentType === "voice" || contentType === "ptt") && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const transcription = await transcribeAudio(mediaUrl, geminiKey);
          console.log("🎤 Transcrição do áudio:", transcription.substring(0, 100));
          messages.push({ role: "user", content: `[O cliente enviou um áudio. Transcrição: "${transcription}"]\n\nResponda ao que o cliente disse no áudio.` });
        } catch (e) {
          console.warn("⚠️ Erro ao transcrever áudio:", e);
          messages.push({ role: "user", content: message || "[O cliente enviou um áudio que não pude transcrever]" });
        }
      } else {
        messages.push({ role: "user", content: message || "[áudio enviado]" });
      }
    }
    // Mensagem de texto normal
    else {
      messages.push({ role: "user", content: message });
    }

    // Chamar Lovable AI
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
Se não souber a resposta, diga que vai encaminhar para um atendente humano.
Quando o cliente enviar um áudio, responda normalmente ao conteúdo transcrito.
Quando o cliente enviar uma imagem, comente sobre o conteúdo da imagem e ajude no que for necessário.`;
}

/** Baixa a imagem da URL e converte para base64, depois envia ao Gemini */
async function interpretImage(imageUrl: string, geminiKey: string): Promise<string> {
  // Baixar a imagem
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
  }
  
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = base64Encode(imageBuffer);
  
  // Detectar mime type
  const contentTypeHeader = imageResponse.headers.get("content-type") || "image/jpeg";
  const mimeType = contentTypeHeader.split(";")[0].trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Descreva brevemente o conteúdo desta imagem em português. Seja objetivo e mencione detalhes relevantes:" },
              { inline_data: { mime_type: mimeType, data: base64Image } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Imagem não identificada";
}

/** Baixa o áudio da URL, converte para base64 e transcreve via Gemini */
async function transcribeAudio(audioUrl: string, geminiKey: string): Promise<string> {
  // Baixar o áudio
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) {
    throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);
  }
  
  const audioBuffer = await audioResponse.arrayBuffer();
  const base64Audio = base64Encode(audioBuffer);
  
  // Detectar mime type
  const contentTypeHeader = audioResponse.headers.get("content-type") || "audio/ogg";
  let mimeType = contentTypeHeader.split(";")[0].trim();
  
  // Normalizar mime types comuns do WhatsApp
  if (mimeType === "audio/ogg; codecs=opus" || mimeType === "audio/ogg") {
    mimeType = "audio/ogg";
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Transcreva o conteúdo deste áudio em português. Retorne APENAS a transcrição, sem comentários adicionais:" },
              { inline_data: { mime_type: mimeType, data: base64Audio } },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini audio error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Áudio não transcrito";
}