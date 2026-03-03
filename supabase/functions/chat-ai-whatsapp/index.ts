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

    console.log(`🤖 Chat AI conversa ${conversationId}, agente: ${agent}, tipo: ${contentType}`);

    // Buscar histórico (últimas 20 mensagens)
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, content_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

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

    // === IMAGEM → Gemini ===
    if (contentType === "image" && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const imageContext = await interpretImageWithGemini(mediaUrl, geminiKey);
          messages.push({ role: "user", content: `[O cliente enviou uma imagem. Descrição: ${imageContext}]\n\n${message || "O que você vê nesta imagem?"}` });
        } catch (e) {
          console.warn("⚠️ Erro Gemini imagem:", e);
          messages.push({ role: "user", content: message || "[imagem não interpretada]" });
        }
      } else {
        messages.push({ role: "user", content: message || "[imagem enviada]" });
      }
    }
    // === ÁUDIO → ElevenLabs STT ===
    else if ((contentType === "audio" || contentType === "voice" || contentType === "ptt") && mediaUrl) {
      const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
      if (elevenLabsKey) {
        try {
          const transcription = await transcribeAudioWithElevenLabs(mediaUrl, elevenLabsKey);
          console.log("🎤 ElevenLabs transcrição:", transcription.substring(0, 100));
          messages.push({ role: "user", content: `[O cliente enviou um áudio. Transcrição: "${transcription}"]\n\nResponda ao que o cliente disse no áudio.` });
        } catch (e) {
          console.warn("⚠️ Erro ElevenLabs STT:", e);
          // Fallback para Gemini
          const geminiKey = Deno.env.get("GEMINI_API_KEY");
          if (geminiKey) {
            try {
              const transcription = await transcribeAudioWithGemini(mediaUrl, geminiKey);
              messages.push({ role: "user", content: `[Áudio do cliente. Transcrição: "${transcription}"]\n\nResponda ao que o cliente disse.` });
            } catch (e2) {
              console.warn("⚠️ Fallback Gemini áudio também falhou:", e2);
              messages.push({ role: "user", content: message || "[áudio não transcrito]" });
            }
          } else {
            messages.push({ role: "user", content: message || "[áudio não transcrito]" });
          }
        }
      } else {
        messages.push({ role: "user", content: message || "[áudio enviado]" });
      }
    }
    // === TEXTO → direto ===
    else {
      messages.push({ role: "user", content: message });
    }

    // === LÓGICA → OpenAI ===
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "AI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("❌ OpenAI error:", aiResponse.status, errText);
      throw new Error(`OpenAI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const aiReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";

    console.log("🤖 Resposta OpenAI:", aiReply.substring(0, 100));

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

/** Imagem → Gemini Vision (baixa, converte base64, envia) */
async function interpretImageWithGemini(imageUrl: string, geminiKey: string): Promise<string> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);

  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = base64Encode(imageBuffer);
  const mimeType = (imageResponse.headers.get("content-type") || "image/jpeg").split(";")[0].trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Descreva brevemente o conteúdo desta imagem em português. Seja objetivo e mencione detalhes relevantes:" },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        }],
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

/** Áudio → ElevenLabs Scribe STT */
async function transcribeAudioWithElevenLabs(audioUrl: string, apiKey: string): Promise<string> {
  // Baixar o áudio
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);

  const audioBlob = await audioResponse.blob();
  const contentType = audioResponse.headers.get("content-type") || "audio/ogg";

  // Enviar para ElevenLabs STT
  const formData = new FormData();
  formData.append("file", new File([audioBlob], "audio.ogg", { type: contentType }));
  formData.append("model_id", "scribe_v2");
  formData.append("language_code", "por");

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs STT error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.text || "Áudio não transcrito";
}

/** Fallback: Áudio → Gemini */
async function transcribeAudioWithGemini(audioUrl: string, geminiKey: string): Promise<string> {
  const audioResponse = await fetch(audioUrl);
  if (!audioResponse.ok) throw new Error(`Erro ao baixar áudio: ${audioResponse.status}`);

  const audioBuffer = await audioResponse.arrayBuffer();
  const base64Audio = base64Encode(audioBuffer);
  let mimeType = (audioResponse.headers.get("content-type") || "audio/ogg").split(";")[0].trim();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Transcreva o conteúdo deste áudio em português. Retorne APENAS a transcrição:" },
            { inline_data: { mime_type: mimeType, data: base64Audio } },
          ],
        }],
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