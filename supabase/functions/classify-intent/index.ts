import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * classify-intent: Classifica mensagens inbound como PASSIVE ou ACTIVE
 * usando Gemini Flash Lite para máxima velocidade e baixo custo.
 * 
 * PASSIVE = confirmações, agradecimentos, elogios, emojis, "ok", "obrigado", etc.
 * ACTIVE = perguntas, reclamações, pedidos de informação, novos assuntos.
 * 
 * Usado pelo messagebird-webhook para decidir se deve acionar a IA ou suprimir.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ intent: "PASSIVE", confidence: 1.0, reason: "empty_message" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fast-path: mensagens muito curtas e óbvias (emojis puros, single acks)
    const cleaned = message.trim();
    const withoutEmojis = cleaned
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, "")
      .replace(/[!.,;:?]/g, "")
      .trim();

    // Só emojis → passivo instantâneo (sem chamar IA)
    if (!withoutEmojis) {
      return new Response(
        JSON.stringify({ intent: "PASSIVE", confidence: 1.0, reason: "emoji_only" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mensagens de sistema do MessageBird → passivo instantâneo
    if (/received\s+unsupported\s+message/i.test(cleaned)) {
      return new Response(
        JSON.stringify({ intent: "PASSIVE", confidence: 1.0, reason: "system_noise" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Autoresponders → passivo instantâneo
    const autoresponderPatterns = [
      /seja bem-vind/i,
      /prazer ter voce conosco/i,
      /por ordem de chegada/i,
      /ja ja chego em voce/i,
      /me fala seu nome para iniciar/i,
      /iniciar o atendimento/i,
    ];
    if (autoresponderPatterns.some(p => p.test(cleaned))) {
      return new Response(
        JSON.stringify({ intent: "PASSIVE", confidence: 1.0, reason: "autoresponder" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("❌ LOVABLE_API_KEY não configurada — fallback para PASSIVE em mensagens curtas");
      // Fallback conservador: mensagens curtas (<30 chars) = PASSIVE
      if (withoutEmojis.length <= 30) {
        return new Response(
          JSON.stringify({ intent: "PASSIVE", confidence: 0.5, reason: "fallback_short" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ intent: "ACTIVE", confidence: 0.5, reason: "fallback_no_key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contextInfo = context || "Resposta a uma notificação automática de entrega/rastreio de encomenda";

    const systemPrompt = `Você é um classificador de intenção de mensagens de WhatsApp para um sistema de logística/entregas.

Classifique a mensagem do usuário em EXATAMENTE uma categoria:

**PASSIVE** — A mensagem NÃO requer resposta ou atendimento. Exemplos:
- Confirmações: "ok", "certo", "entendi", "tá", "blz"
- Agradecimentos: "obrigado", "muito obrigada", "valeu", "brigado"
- Elogios genéricos: "excelente parabéns", "ótimo serviço", "nota 10", "muito bom"
- Confirmação de recebimento: "recebi sim", "chegou", "recebido", "já recebi"
- Cumprimentos isolados: "bom dia", "boa tarde", "boa noite"
- Reações emocionais: "amém", "Deus abençoe", "que bom", "maravilha"
- Despedidas: "tchau", "até mais", "bjs"
- Mensagens que são apenas emojis, figurinhas, ou reações

**ACTIVE** — A mensagem REQUER atendimento ou resposta. Exemplos:
- Perguntas: "cadê meu pedido?", "quando chega?", "qual o prazo?"
- Reclamações: "está atrasado", "não recebi", "veio errado"
- Pedidos de ação: "quero cancelar", "preciso alterar endereço"
- Informação nova: compartilhar código de rastreio, endereço, dados
- Problemas: "pacote danificado", "falta item", "cobrança errada"

Contexto: ${contextInfo}

Responda APENAS com uma linha no formato:
INTENT: PASSIVE ou ACTIVE
CONFIDENCE: 0.0 a 1.0
REASON: explicação curta (máx 10 palavras)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        max_tokens: 50,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ AI Gateway error ${response.status}: ${errText.substring(0, 200)}`);
      // Fallback: mensagens curtas sem pergunta = PASSIVE
      const hasQuestion = /\?|cade|onde|quando|qual|como|porque|por que/i.test(cleaned);
      return new Response(
        JSON.stringify({
          intent: hasQuestion ? "ACTIVE" : "PASSIVE",
          confidence: 0.4,
          reason: "ai_fallback",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    const aiText = (aiResult.choices?.[0]?.message?.content || "").trim();
    
    console.log(`🧠 Classificação IA para "${message.substring(0, 50)}": ${aiText}`);

    // Parse da resposta
    const intentMatch = aiText.match(/INTENT:\s*(PASSIVE|ACTIVE)/i);
    const confidenceMatch = aiText.match(/CONFIDENCE:\s*([\d.]+)/i);
    const reasonMatch = aiText.match(/REASON:\s*(.+)/i);

    const intent = intentMatch ? intentMatch[1].toUpperCase() : "ACTIVE";
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.7;
    const reason = reasonMatch ? reasonMatch[1].trim() : "ai_classified";

    return new Response(
      JSON.stringify({ intent, confidence, reason }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ classify-intent error:", err);
    // Fallback seguro: tratar como ACTIVE para não suprimir erroneamente
    return new Response(
      JSON.stringify({ intent: "ACTIVE", confidence: 0.3, reason: "error_fallback" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
