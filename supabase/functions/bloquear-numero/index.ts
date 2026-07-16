import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * bloquear-numero: Ferramenta IA para bloquear números de telefone
 * que são incorretos (destinatário não reconhece o cadastro).
 * 
 * Adiciona na whatsapp_phone_blocklist para impedir futuros HSMs.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone_number, reason, contact_name, conversation_id } = await req.json();

    if (!phone_number || typeof phone_number !== "string") {
      return new Response(
        JSON.stringify({ error: "phone_number é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalizar telefone - apenas dígitos
    const digits = phone_number.replace(/\D/g, "");
    const normalized = digits.startsWith("55") ? digits : `55${digits}`;

    if (normalized.length < 12 || normalized.length > 13) {
      return new Response(
        JSON.stringify({ error: "Número de telefone inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar se já está bloqueado
    const { data: existing } = await supabase
      .from("whatsapp_phone_blocklist")
      .select("id, is_active")
      .eq("phone_number", normalized)
      .maybeSingle();

    if (existing) {
      if (existing.is_active) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Número ${normalized} já estava bloqueado.`,
            already_blocked: true 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Reativar bloqueio
      await supabase
        .from("whatsapp_phone_blocklist")
        .update({ is_active: true, reason: reason || "Número errado - reativado pela IA", blocked_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      // Inserir novo bloqueio
      const { error: insertError } = await supabase
        .from("whatsapp_phone_blocklist")
        .insert({
          phone_number: normalized,
          reason: reason || "Número errado / destinatário não reconhecido",
          contact_name: contact_name || null,
          blocked_by: "sergio-ai",
        });

      if (insertError) {
        console.error("Erro ao bloquear:", insertError);
        return new Response(
          JSON.stringify({ error: "Falha ao bloquear número: " + insertError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Se tiver conversation_id, desativar IA e fechar conversa
    if (conversation_id) {
      await supabase
        .from("whatsapp_conversations")
        .update({ ai_enabled: false, status: "closed" })
        .eq("id", conversation_id);
    }

    console.log(`🚫 Número ${normalized} bloqueado pela IA. Motivo: ${reason || "número errado"}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Número ${normalized} bloqueado com sucesso. Não receberá mais mensagens automáticas.`,
        phone_blocked: normalized,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("❌ bloquear-numero error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
