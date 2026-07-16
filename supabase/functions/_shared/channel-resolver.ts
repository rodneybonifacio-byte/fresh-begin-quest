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

/** Resolve canal pelo channel_id da Bird/MessageBird (usado no webhook) */
export async function resolveChannelByMessageBirdId(channelId: string): Promise<WhatsAppChannel | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("channel_id", channelId)
    .maybeSingle();

  if (!error && data) return data as WhatsAppChannel;

  // Se o channel_id do webhook bate com o env atual, retorna o default
  const envChannelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
  if (envChannelId && channelId === envChannelId) {
    return resolveDefaultChannel();
  }

  console.error("Canal não encontrado pelo channel_id:", channelId, error);
  return null;
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

/** Fallback: env MessageBird > canal default no DB */
export async function resolveDefaultChannel(): Promise<WhatsAppChannel | null> {
  // 1) Env MessageBird clássico tem prioridade — é a fonte de verdade após a troca de canal
  const envChannelId = Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
  const envAccessKey = Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
  const envPhone = Deno.env.get("MESSAGEBIRD_WHATSAPP_NUMBER") || "";

  if (envChannelId && envAccessKey) {
    return {
      id: "env-messagebird",
      name: "MessageBird (env)",
      phone_number: envPhone,
      channel_id: envChannelId,
      access_key: envAccessKey,
      bird_workspace_id: null,
      is_default: true,
      ai_enabled: true,
      ai_agent: "veronica",
    };
  }

  // 2) Fallback: canal marcado como default no DB
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("whatsapp_channels")
    .select("*")
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (!error && data) return data as WhatsAppChannel;

  console.error("Nenhum canal configurado (env MESSAGEBIRD_* ausentes e nenhum canal default)");
  return null;
}
