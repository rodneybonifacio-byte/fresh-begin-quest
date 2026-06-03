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
  /** Bird channel UUID (api.bird.com). Reaproveita coluna legada `channel_id`. */
  channel_id: string;
  /** Bird API Access Key. Reaproveita coluna legada `access_key`. */
  access_key: string;
  /** Bird Workspace UUID. */
  bird_workspace_id?: string | null;
  is_default: boolean;
  ai_enabled: boolean;
  ai_agent: string;
}

/** Resolve canal pelo channel_id da Bird (usado no webhook) */
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

/** Fallback: canal padrão do DB ou env vars Bird */
export async function resolveDefaultChannel(): Promise<WhatsAppChannel | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .single();

  if (!error && data) return data as WhatsAppChannel;

  // Fallback para env vars Bird
  const channelId = Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");
  const accessKey = Deno.env.get("BIRD_API_KEY");
  const workspaceId = Deno.env.get("BIRD_WORKSPACE_ID");
  const phone = Deno.env.get("MESSAGEBIRD_WHATSAPP_NUMBER") || "";

  if (channelId && accessKey) {
    return {
      id: "env-fallback",
      name: "Fallback (env Bird)",
      phone_number: phone,
      channel_id: channelId,
      access_key: accessKey,
      bird_workspace_id: workspaceId,
      is_default: true,
      ai_enabled: true,
      ai_agent: "veronica",
    };
  }

  console.error("Nenhum canal encontrado e BIRD_* env vars não configuradas");
  return null;
}
