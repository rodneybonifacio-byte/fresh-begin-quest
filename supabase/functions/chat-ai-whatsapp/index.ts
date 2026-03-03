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

  const startTime = Date.now();

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { conversationId, message, contactPhone, agent, contentType, mediaUrl } = await req.json();

    // Para áudio/imagem, não exigir message (texto) pois o conteúdo está na mídia
    const isMediaMessage = (contentType === "audio" || contentType === "voice" || contentType === "ptt" || contentType === "image") && mediaUrl;
    if (!conversationId || (!message && !isMediaMessage)) {
      return new Response(
        JSON.stringify({ error: "Dados insuficientes" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const agentName = agent || "maya";
    console.log(`🤖 Chat AI conversa ${conversationId}, agente: ${agentName}, tipo: ${contentType}`);

    // === BUSCAR CONFIG DO AGENTE NO BANCO ===
    const { data: agentConfig } = await supabase
      .from("ai_agents")
      .select("*")
      .eq("name", agentName)
      .eq("is_active", true)
      .single();

    const systemPrompt = agentConfig?.system_prompt || getDefaultPrompt(agentName);
    const modelName = agentConfig?.model || "gpt-4o";
    const temperature = agentConfig?.temperature || 0.7;
    const maxTokens = agentConfig?.max_tokens || 200;

    // Buscar histórico (últimas 20 mensagens)
    const { data: history } = await supabase
      .from("whatsapp_messages")
      .select("direction, content, content_type, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    const messages: any[] = [{ role: "system", content: systemPrompt }];

    if (history) {
      for (const msg of history) {
        messages.push({
          role: msg.direction === "inbound" ? "user" : "assistant",
          content: msg.content || "[mídia]",
        });
      }
    }

    // === IMAGEM → Gemini (análise completa + extração de código de rastreio) ===
    if (contentType === "image" && mediaUrl) {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        try {
          const imageAnalysis = await analyzeImageWithGemini(mediaUrl, geminiKey);
          console.log("🖼️ Análise Gemini:", JSON.stringify(imageAnalysis).substring(0, 200));

          let imageContext = `[CONTEXTO INTERNO - NÃO mencione que recebeu imagem, o cliente já sabe. Responda direto sobre o conteúdo.]\n\nConteúdo identificado: ${imageAnalysis.description}`;

          if (imageAnalysis.trackingCode) {
            console.log("📦 Código de rastreio extraído da imagem:", imageAnalysis.trackingCode);
            try {
              const trackingData = await fetchTrackingData(imageAnalysis.trackingCode);
              if (trackingData) {
                const trackingInfo = formatTrackingForAI(trackingData);
                imageContext += `\n\nCódigo de rastreio encontrado: ${imageAnalysis.trackingCode}\nDados:\n${trackingInfo}`;
                imageContext += `\n\n[INSTRUÇÃO: Vá direto ao ponto. Diga o status do pacote, onde tá e previsão. Sem dizer "identifiquei na imagem" ou "analisei sua foto". O cliente sabe o que mandou.]`;
              } else {
                imageContext += `\n\nCódigo ${imageAnalysis.trackingCode} encontrado mas sem dados. [INSTRUÇÃO: Pergunte se o código tá certo, sem mencionar "na imagem".]`;
              }
            } catch (trackErr) {
              console.warn("⚠️ Erro ao consultar rastreio da imagem:", trackErr);
              imageContext += `\n\nCódigo ${imageAnalysis.trackingCode} encontrado mas erro na consulta. [INSTRUÇÃO: Diga que não conseguiu consultar agora e peça pra mandar o código por texto.]`;
            }
          } else {
            imageContext += `\n\n[INSTRUÇÃO: Responda sobre o conteúdo diretamente, sem dizer "recebi sua imagem" ou "analisando a foto". Seja natural.]`;
          }

          if (message) imageContext += `\n\nCliente disse: "${message}"`;
          messages.push({ role: "user", content: imageContext });
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
    // === TEXTO ===
    else {
      // Detectar código de rastreio e consultar API
      const trackingCode = detectTrackingCode(message);
      if (trackingCode) {
        console.log("📦 Código de rastreio detectado:", trackingCode);
        try {
          const trackingData = await fetchTrackingData(trackingCode);
          if (trackingData) {
            const trackingContext = formatTrackingForAI(trackingData);
            messages.push({ role: "user", content: `[O cliente enviou um código de rastreio: ${trackingCode}]\n\nDados do rastreio:\n${trackingContext}\n\nMensagem original: "${message}"\n\nResponda ao cliente com as informações de rastreio de forma clara e amigável.` });
          } else {
            messages.push({ role: "user", content: `[O cliente enviou um código de rastreio: ${trackingCode}, mas não foi possível obter informações. Informe que o código não retornou dados ou pode estar incorreto.]\n\nMensagem original: "${message}"` });
          }
        } catch (trackErr) {
          console.warn("⚠️ Erro ao consultar rastreio:", trackErr);
          messages.push({ role: "user", content: `[O cliente enviou um código de rastreio: ${trackingCode}, mas houve um erro ao consultar. Peça desculpas e sugira tentar novamente.]\n\nMensagem original: "${message}"` });
        }
      } else {
        messages.push({ role: "user", content: message });
      }
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
        model: modelName,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("❌ OpenAI error:", aiResponse.status, errText);

      // Log de erro
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
    const aiReply = aiData.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
    const inputTokens = aiData.usage?.prompt_tokens;
    const outputTokens = aiData.usage?.completion_tokens;

    console.log("🤖 Resposta OpenAI:", aiReply.substring(0, 100));

    // === GERENCIAR TICKETS ===
    await ensureTicketOpen(supabase, conversationId, contactPhone, message);
    await detectAndCreateSupportTicket(supabase, conversationId, contactPhone, message, aiReply, agentName);
    await detectTicketResolution(supabase, conversationId, aiReply);

    // Log de sucesso
    await logInteraction(supabase, {
      conversation_id: conversationId,
      agent_name: agentName,
      content_type: contentType || "text",
      provider: "openai",
      model: modelName,
      success: true,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      response_time_ms: Date.now() - startTime,
    });

    // Enviar resposta via MessageBird
    const channel = await resolveChannelForConversation(conversationId);
    if (channel) {
      // Se o cliente enviou áudio, responder com áudio (TTS) + texto
      const isAudioInput = contentType === "audio" || contentType === "voice" || contentType === "ptt";
      let audioSent = false;

      if (isAudioInput) {
        const elevenLabsKey = Deno.env.get("ELEVENLABS_API_KEY");
        if (elevenLabsKey) {
          try {
            const audioUrl = await generateTTSAudio(aiReply, elevenLabsKey);
            if (audioUrl) {
              // Enviar áudio via MessageBird
              const audioPayload = {
                to: contactPhone,
                from: channel.channel_id,
                type: "audio",
                content: { audio: { url: audioUrl } },
              };

              const mbAudioResponse = await fetch("https://conversations.messagebird.com/v1/send", {
                method: "POST",
                headers: {
                  Authorization: `AccessKey ${channel.access_key}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(audioPayload),
              });

              const mbAudioResult = await mbAudioResponse.json();
              console.log("🔊 Áudio TTS enviado via MessageBird:", mbAudioResponse.status);

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
            console.warn("⚠️ Erro ao gerar TTS, enviando como texto:", ttsError);
          }
        }
      }

      // Enviar como texto se não enviou áudio (ou como fallback)
      if (!audioSent) {
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

// === HELPERS ===

async function logInteraction(supabase: any, data: any) {
  try {
    await supabase.from("ai_interaction_logs").insert(data);
  } catch (e) {
    console.warn("⚠️ Erro ao logar interação:", e);
  }
}

async function detectAndCreateSupportTicket(supabase: any, conversationId: string, contactPhone: string, userMessage: string, _aiReply: string, agentName: string) {
  try {
    const lowerMsg = (userMessage || "").toLowerCase();

    // Categorização por contexto
    const categoryRules: { keywords: string[]; category: string; priority: string }[] = [
      { keywords: ["procon", "processo", "advogado", "pior empresa", "denúncia"], category: "reclamacao", priority: "urgente" },
      { keywords: ["péssimo", "horrível", "absurdo", "lixo", "nunca mais"], category: "reclamacao", priority: "urgente" },
      { keywords: ["reclamar", "reclamação", "insatisfeito", "insatisfação", "problema grave"], category: "reclamacao", priority: "alta" },
      { keywords: ["extraviou", "extraviado", "roubado", "furto", "sumiu", "perdido"], category: "rastreio", priority: "urgente" },
      { keywords: ["não chegou", "demora", "atraso", "atrasado", "sem atualização"], category: "rastreio", priority: "alta" },
      { keywords: ["danificado", "quebrado", "avariado", "amassado"], category: "reclamacao", priority: "alta" },
      { keywords: ["cancelar", "cancelamento", "estornar", "estorno", "reembolso", "devolver"], category: "cancelamento", priority: "alta" },
      { keywords: ["cobrado errado", "cobrança indevida", "valor errado", "não recebi crédito"], category: "financeiro", priority: "alta" },
    ];

    let matchedCategory: string | null = null;
    let matchedPriority = "normal";

    for (const rule of categoryRules) {
      if (rule.keywords.some(k => lowerMsg.includes(k))) {
        matchedCategory = rule.category;
        matchedPriority = rule.priority;
        break;
      }
    }

    if (!matchedCategory) return;

    // Verificar se já existe ticket aberto para esta conversa
    const { data: existing } = await supabase
      .from("ai_support_pipeline")
      .select("id")
      .eq("conversation_id", conversationId)
      .in("status", ["novo", "em_atendimento", "aguardando", "aberto", "em_andamento"])
      .limit(1);

    if (existing && existing.length > 0) return;

    // Buscar nome do contato
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name")
      .eq("id", conversationId)
      .single();

    // Determinar sentimento
    const strongNeg = ["péssimo", "horrível", "absurdo", "procon", "processo", "advogado", "pior empresa", "lixo"];
    const sentiment = strongNeg.some(p => lowerMsg.includes(p)) ? "muito_negativo" : "negativo";

    await supabase.from("ai_support_pipeline").insert({
      conversation_id: conversationId,
      contact_phone: contactPhone,
      contact_name: conv?.contact_name,
      category: matchedCategory,
      priority: matchedPriority,
      status: "novo",
      subject: `${categoryRules.find(r => r.category === matchedCategory)?.category === 'rastreio' ? '📦' : '⚠️'} ${userMessage.substring(0, 100)}`,
      description: userMessage,
      sentiment,
      detected_by: agentName,
    });

    console.log(`🎫 Ticket criado [${matchedCategory}/${matchedPriority}] conversa:`, conversationId);
  } catch (e) {
    console.warn("⚠️ Erro ao detectar reclamação:", e);
}

// === GERENCIAMENTO DE TICKETS (whatsapp_tickets) ===

async function ensureTicketOpen(supabase: any, conversationId: string, contactPhone: string, userMessage: string) {
  try {
    // Verificar se já existe ticket aberto para esta conversa
    const { data: openTicket } = await supabase
      .from("whatsapp_tickets")
      .select("id, message_count")
      .eq("conversation_id", conversationId)
      .eq("status", "open")
      .limit(1)
      .single();

    if (openTicket) {
      // Atualizar contagem e último timestamp
      await supabase
        .from("whatsapp_tickets")
        .update({
          message_count: (openTicket.message_count || 0) + 1,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", openTicket.id);
      return;
    }

    // Buscar nome do contato
    const { data: conv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name")
      .eq("id", conversationId)
      .single();

    // Criar novo ticket
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

    console.log(`🎫 Ticket aberto para conversa ${conversationId}`);
  } catch (e) {
    console.warn("⚠️ Erro ao gerenciar ticket:", e);
  }
}

async function detectTicketResolution(supabase: any, conversationId: string, aiReply: string) {
  try {
    const lowerReply = (aiReply || "").toLowerCase();

    // Padrões que indicam resolução
    const resolutionPatterns = [
      "resolvido", "solucionado", "concluído",
      "problema foi resolvido", "está tudo certo",
      "foi entregue", "entrega confirmada", "entregue com sucesso",
      "estorno realizado", "reembolso aprovado", "crédito devolvido",
      "qualquer dúvida", "estou à disposição", "posso ajudar em mais algo",
      "foi corrigido", "ajustado com sucesso"
    ];

    const isResolution = resolutionPatterns.some(p => lowerReply.includes(p));
    if (!isResolution) return;

    // Buscar ticket aberto
    const { data: openTicket } = await supabase
      .from("whatsapp_tickets")
      .select("id")
      .eq("conversation_id", conversationId)
      .eq("status", "open")
      .limit(1)
      .single();

    if (!openTicket) return;

    // Fechar ticket
    await supabase
      .from("whatsapp_tickets")
      .update({
        status: "closed",
        closed_by: "ai",
        closed_at: new Date().toISOString(),
        resolution: aiReply.substring(0, 500),
      })
      .eq("id", openTicket.id);

    console.log(`✅ Ticket ${openTicket.id} fechado automaticamente pela IA`);
  } catch (e) {
    console.warn("⚠️ Erro ao detectar resolução:", e);
  }
}
}

function getDefaultPrompt(agent: string): string {
  if (agent === "felipe") {
    return `Você é Felipe, atendente da BRHUB Envios. Fale como um humano real no WhatsApp.

REGRAS OBRIGATÓRIAS:
- Respostas CURTAS: máximo 2-3 frases. Nunca mais que 4 linhas.
- Fale como gente de verdade, não como robô. Use linguagem natural e informal (mas educada).
- Vá direto ao ponto. Nada de "Olá! Tudo bem? Como posso ajudá-lo hoje?"
- Use 1 emoji no máximo por mensagem, e só quando fizer sentido.
- Se não souber, diga "vou passar pro time resolver" e pronto.
- NUNCA use bullet points, listas ou formatação elaborada. É WhatsApp, não email.
- Português brasileiro natural. Pode usar "vc", "tá", "pra" quando apropriado.`;
  }
  return `Você é Veronica, do Time de Suporte da BRHUB Envios.

APRESENTAÇÃO:
- Na PRIMEIRA mensagem de cada conversa, SEMPRE se apresente: "Oi! Sou a Veronica do Time de Suporte da BRHUB Envios 😊"
- Nas mensagens seguintes, não precisa se apresentar de novo.

PERSONALIDADE:
- Você é simpática, acolhedora e sempre quer ajudar de verdade.
- Trate o cliente como alguém importante. Mostre que se importa.
- Use tom carinhoso mas profissional. "Vou resolver isso pra vc!" não "Encaminharei sua solicitação."

FOLLOW-UP:
- Se perceber que o cliente pode precisar de mais algo, PERGUNTE proativamente.
  Exemplos: "Precisa de mais alguma coisa?", "Quer que eu verifique outro pedido também?", "Tá tudo certo ou posso te ajudar com mais algo?"
- Se o cliente parece frustrado ou com problema não resolvido, ofereça alternativas.

REGRAS DE FORMATO:
- Respostas curtas: máximo 2-3 frases. Nunca mais que 4 linhas.
- Use 1-2 emojis por mensagem, de forma natural.
- NUNCA use bullet points, listas ou formatação de email. É WhatsApp.
- Português brasileiro natural. Pode usar "vc", "tá", "pra".
- Quando der info de rastreio, resuma: status + onde tá + previsão.
- Se não souber, diga "vou chamar alguém do time pra te ajudar, tá?" e pronto.`;
}

async function analyzeImageWithGemini(imageUrl: string, geminiKey: string): Promise<{ description: string; trackingCode: string | null }> {
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = base64Encode(imageBuffer);
  const mimeType = (imageResponse.headers.get("content-type") || "image/jpeg").split(";")[0].trim();

  const prompt = `Analise esta imagem detalhadamente em português. Faça o seguinte:

1. Descreva TODO o conteúdo visível da imagem (textos, logos, códigos de barras, QR codes, endereços, nomes, etc.)
2. Se for uma etiqueta de envio/postagem/correios, extraia TODOS os dados visíveis: remetente, destinatário, CEP, endereço, código de rastreio, serviço, peso, etc.
3. IMPORTANTE: Se houver um código de rastreio dos Correios (formato: 2 letras + 9 números + 2 letras, ex: AA123456789BR, SS987654321BR), extraia-o EXATAMENTE.

Responda no seguinte formato:
DESCRIÇÃO: [descrição completa da imagem]
CODIGO_RASTREIO: [código se encontrado, ou NENHUM se não houver]`;

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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini image error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Imagem não identificada";

  // Extrair código de rastreio da resposta do Gemini
  let trackingCode: string | null = null;
  
  // Tentar extrair do formato estruturado
  const codigoMatch = fullText.match(/CODIGO_RASTREIO:\s*([A-Z]{2}\d{9}[A-Z]{2})/i);
  if (codigoMatch) {
    trackingCode = codigoMatch[1].toUpperCase();
  }
  
  // Fallback: buscar padrão de código de rastreio em qualquer lugar do texto
  if (!trackingCode) {
    const genericMatch = fullText.match(/\b([A-Z]{2}\d{9}[A-Z]{2})\b/);
    if (genericMatch) {
      trackingCode = genericMatch[1].toUpperCase();
    }
  }

  // Extrair descrição limpa
  const descMatch = fullText.match(/DESCRI[CÇ][AÃ]O:\s*([\s\S]*?)(?=CODIGO_RASTREIO:|$)/i);
  const description = descMatch ? descMatch[1].trim() : fullText;

  return { description, trackingCode };
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

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs STT error: ${response.status} - ${errText}`);
  }

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
          { text: "Transcreva o conteúdo deste áudio em português. Retorne APENAS a transcrição:" },
          { inline_data: { mime_type: mimeType, data: base64Audio } },
        ] }],
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

async function generateTTSAudio(text: string, apiKey: string): Promise<string | null> {
  // Limitar texto para TTS (máximo ~500 chars para não ficar muito longo)
  const ttsText = text.length > 500 ? text.substring(0, 497) + "..." : text;
  
  // Usar voz feminina em português (Laura - FGY2WhTYpPnrIDTdsKH5)
  const voiceId = "FGY2WhTYpPnrIDTdsKH5";

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=opus_48000_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: ttsText,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs TTS error: ${response.status} - ${errText}`);
  }

  const audioBuffer = await response.arrayBuffer();
  const base64Audio = base64Encode(new Uint8Array(audioBuffer));
  
  // Salvar no Supabase Storage como OGG Opus para WhatsApp exibir como voice note
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const fileName = `tts-${Date.now()}.ogg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(`tts-audio/${fileName}`, new Uint8Array(audioBuffer), {
      contentType: "audio/ogg; codecs=opus",
      upsert: true,
    });

  if (uploadError) {
    console.warn("⚠️ Erro ao fazer upload do áudio TTS:", uploadError);
    return null;
  }

  const { data: publicUrl } = supabase.storage
    .from("avatars")
    .getPublicUrl(`tts-audio/${fileName}`);

  console.log("🔊 Áudio TTS gerado:", publicUrl.publicUrl);
  return publicUrl.publicUrl;
}

// === RASTREIO HELPERS ===

function detectTrackingCode(text: string): string | null {
  if (!text) return null;
  // Padrões de códigos de rastreio dos Correios: AA123456789BR, SS987654321BR etc.
  const correiosPattern = /\b([A-Z]{2}\d{9}[A-Z]{2})\b/i;
  const match = text.match(correiosPattern);
  if (match) return match[1].toUpperCase();
  
  // Também aceitar só o código se a mensagem inteira for basicamente o código
  const trimmed = text.trim().toUpperCase();
  if (/^[A-Z]{2}\d{9}[A-Z]{2}$/.test(trimmed)) return trimmed;
  
  return null;
}

async function fetchTrackingData(codigo: string): Promise<any> {
  const BASE_API_URL = Deno.env.get("BASE_API_URL") || "https://envios.brhubb.com.br";
  const adminEmail = Deno.env.get("API_ADMIN_EMAIL");
  const adminPassword = Deno.env.get("API_ADMIN_PASSWORD");

  if (!adminEmail || !adminPassword) {
    console.warn("⚠️ Credenciais admin não configuradas para rastreio");
    return null;
  }

  // Login
  const loginResponse = await fetch(`${BASE_API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  });

  if (!loginResponse.ok) {
    console.error("❌ Falha login admin para rastreio:", loginResponse.status);
    return null;
  }

  const loginData = await loginResponse.json();
  const token = loginData.token;

  // Consultar rastreio
  const rastreioResponse = await fetch(`${BASE_API_URL}/rastrear?codigo=${codigo}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!rastreioResponse.ok) {
    console.error("❌ Erro API rastreio:", rastreioResponse.status);
    return null;
  }

  const data = await rastreioResponse.json();
  console.log("📦 Rastreio obtido para", codigo);
  return data;
}

function formatTrackingForAI(rastreioData: any): string {
  const dados = rastreioData?.data || rastreioData;
  const eventos = dados?.eventos || [];
  
  let result = "";
  
  if (dados?.codigoObjeto) result += `Código: ${dados.codigoObjeto}\n`;
  if (dados?.servico) result += `Serviço: ${dados.servico}\n`;
  if (dados?.dataPrevisaoEntrega) result += `Previsão de entrega: ${dados.dataPrevisaoEntrega}\n`;
  
  if (eventos.length > 0) {
    result += `\nÚltimos eventos (${eventos.length} total):\n`;
    // Mostrar até 5 eventos mais recentes
    const recentEvents = eventos.slice(0, 5);
    for (const ev of recentEvents) {
      const local = ev.unidade?.cidadeUf || ev.unidade?.tipo || "";
      result += `- ${ev.dataCompleta || ev.date || ""} ${ev.horario || ""}: ${ev.descricao || ""}`;
      if (local) result += ` (${local})`;
      if (ev.unidadeDestino?.cidadeUf) result += ` → ${ev.unidadeDestino.cidadeUf}`;
      result += "\n";
    }
  } else {
    result += "\nNenhum evento de rastreio encontrado ainda.\n";
  }
  
  return result;
}
