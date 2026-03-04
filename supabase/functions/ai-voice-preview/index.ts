import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave de áudio não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const voiceId = typeof body.voiceId === "string" ? body.voiceId : "";
    const text = typeof body.text === "string" && body.text.trim().length > 0
      ? body.text.trim().slice(0, 400)
      : "Olá! Este é um teste da voz configurada para este agente.";
    const model = typeof body.model === "string" ? body.model : "eleven_multilingual_v2";

    if (!voiceId) {
      return new Response(JSON.stringify({ error: "voiceId é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: model,
          voice_settings: {
            stability: Number(body?.voiceSettings?.stability ?? 0.5),
            similarity_boost: Number(body?.voiceSettings?.similarity_boost ?? 0.75),
            style: Number(body?.voiceSettings?.style ?? 0),
            use_speaker_boost: true,
            speed: Number(body?.voiceSettings?.speed ?? 1),
          },
        }),
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ai-voice-preview] ElevenLabs error", {
        status: response.status,
        body: errorText,
      });

      return new Response(
        JSON.stringify({ error: `Falha no provedor de voz (${response.status})` }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    const audioContent = encodeBase64(new Uint8Array(audioBuffer));

    return new Response(
      JSON.stringify({ audioContent, mimeType: "audio/mpeg" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === "AbortError";
    const message = isTimeout ? "Tempo limite ao gerar áudio de preview" : (error instanceof Error ? error.message : "Erro inesperado");

    console.error("[ai-voice-preview] Error", error);

    return new Response(JSON.stringify({ error: message }), {
      status: isTimeout ? 504 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
