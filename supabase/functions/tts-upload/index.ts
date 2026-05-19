// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { text, voiceId = "FGY2WhTYpPnrIDTdsKH5" } = await req.json();
    const apiKey = Deno.env.get("ELEVENLABS_API_KEY")!;
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=opus_48000_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.75, use_speaker_boost: true, speed: 1.0 } }),
    });
    if (!r.ok) throw new Error(`TTS ${r.status}: ${await r.text()}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const fileName = `tts-audio/manual-${Date.now()}.ogg`;
    const { error } = await sb.storage.from("avatars").upload(fileName, buf, { contentType: "audio/ogg; codecs=opus", upsert: true });
    if (error) throw error;
    const { data } = sb.storage.from("avatars").getPublicUrl(fileName);
    return new Response(JSON.stringify({ url: data.publicUrl }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
