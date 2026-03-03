import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const getSupabase = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
};

export interface WhatsAppChannel {
  id: string;
  name: string;
  phone_number: string;
  channel_id: string;
  access_key: string;
  is_default: boolean;
  ai_enabled: boolean;
  ai_agent: string;
}

/** Resolve canal pelo channel_id do MessageBird (usado no webhook) */
export async function resolveChannelByMessageBirdId(channelId: string): Promise<WhatsAppChannel | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("channel_id", channelId)
    .single();

  if (error || !data) {
    console.error("Canal não encontrado pelo channel_id:", channelId, error);
    return null;
  }
  return data as WhatsAppChannel;
}

/** Resolve canal vinculado a uma conversa */
export async function resolveChannelForConversation(conversationId: string): Promise<WhatsAppChannel | null> {
  const supabase = getSupabase();
  const { data: conv, error: convError } = await supabase
    .from("whatsapp_conversations")
    .select("whatsapp_channel_id")
    .eq("id", conversationId)
    .single();

  if (convError || !conv?.whatsapp_channel_id) {
    console.warn("Conversa sem canal vinculado:", conversationId);
    return resolveDefaultChannel();
  }

  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("id", conv.whatsapp_channel_id)
    .single();

  if (error || !data) {
    console.warn("Canal da conversa não encontrado, usando default");
    return resolveDefaultChannel();
  }
  return data as WhatsAppChannel;
}

/** Fallback: canal padrão ou env vars */
export async function resolveDefaultChannel(): Promise<WhatsAppChannel | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .single();

  if (!error && data) return data as WhatsAppChannel;

  // Fallback para env vars
  const channelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
  const accessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
  const phone = Deno.env.get("MESSAGEBIRD_WHATSAPP_NUMBER");

  if (channelId && accessKey && phone) {
    return {
      id: "env-fallback",
      name: "Fallback (env)",
      phone_number: phone,
      channel_id: channelId,
      access_key: accessKey,
      is_default: true,
      ai_enabled: true,
      ai_agent: "veronica",
    };
  }

  console.error("Nenhum canal encontrado e env vars não configuradas");
  return null;
}
