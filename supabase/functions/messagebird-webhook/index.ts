// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelByMessageBirdId } from "../_shared/channel-resolver.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-messagebird-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: verificar se é um nome válido (não genérico/teste)
function isValidName(name: string | null | undefined): boolean {
  if (!name || name.trim().length < 2) return false;
  const lower = name.toLowerCase().trim();
  const invalidPatterns = [
    /^cadastro\s*\d*/i,
    /nolastnameentered/i,
    /^teste?\s*\d*/i,
    /^cliente\s*\d*/i,
    /^user\s*\d*/i,
    /^[0-9]+$/,
    /^[a-f0-9-]{36}$/i, // UUID
    /^a@/i,
    /^financeiro\s/i,
  ];
  return !invalidPatterns.some(p => p.test(lower));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("📩 Webhook recebido:", JSON.stringify(body).substring(0, 500));

    const eventType = body.type || body.event;
    
    if (!eventType || (!eventType.includes("message.created") && !eventType.includes("message.updated"))) {
      console.log("⏭️ Evento ignorado:", eventType);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = body.message || body.data || body;
    const channelId = message.channelId || message.channel_id || body.channelId;
    const rawPhone = message.from || body.contact?.msisdn || message.contact?.msisdn || message.originator;
    const contactPhone = rawPhone ? String(rawPhone) : null;
    const whatsappDisplayName = body.contact?.displayName || body.contact?.firstName || message.contact?.displayName || message.contact?.firstName || null;
    const messageContent = message.content?.text || message.body || message.content?.html || "";
    const messageBirdId = message.id || body.id;
    const direction = message.direction === "received" || message.direction === "incoming" ? "inbound" : "outbound";
    const rawContentType = message.content?.type || message.type || "text";
    const contentType = (message.content?.audio || rawContentType === "audio" || rawContentType === "voice") ? "audio" : rawContentType;
    const mediaUrl = message.content?.media?.url || message.content?.image?.url || message.content?.audio?.url || null;
    const mediaType = message.content?.media?.contentType || message.content?.audio?.contentType || null;

    if (!contactPhone) {
      console.error("❌ Telefone do contato não encontrado no payload");
      return new Response(JSON.stringify({ error: "Missing contact phone" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === RESOLVER NOME REAL DO CLIENTE ===
    const normalizedPhoneForLookup = contactPhone.replace(/\D/g, "");

    // Limpar displayName do WhatsApp (remover "NoLastNameEntered" etc)
    let cleanDisplayName = whatsappDisplayName;
    if (cleanDisplayName) {
      cleanDisplayName = cleanDisplayName.replace(/\s*NoLastNameEntered\s*/gi, '').trim();
      if (!isValidName(cleanDisplayName)) cleanDisplayName = null;
    }

    let contactName = cleanDisplayName || normalizedPhoneForLookup;

    // 1. Buscar conversa existente
    const { data: existingConv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name, cliente_id")
      .eq("contact_phone", normalizedPhoneForLookup)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Se já tem um nome válido salvo, usar ele
    if (existingConv?.contact_name && isValidName(existingConv.contact_name)) {
      contactName = existingConv.contact_name;
      console.log("✅ Nome da conversa existente:", contactName);
    }

    // 2. Buscar nos remetentes por cliente_id
    if ((!isValidName(contactName) || contactName === cleanDisplayName) && existingConv?.cliente_id) {
      const { data: remetentes } = await supabase
        .from("remetentes")
        .select("nome")
        .eq("cliente_id", existingConv.cliente_id);
      
      if (remetentes) {
        const valid = remetentes.find(r => isValidName(r.nome));
        if (valid) {
          contactName = valid.nome;
          console.log("✅ Nome via remetente (cliente_id):", contactName);
        }
      }
    }

    // 3. Buscar nos remetentes por telefone
    if (!isValidName(contactName) || contactName === cleanDisplayName || contactName === normalizedPhoneForLookup) {
      const phoneVariants = [
        normalizedPhoneForLookup,
        normalizedPhoneForLookup.startsWith("55") ? normalizedPhoneForLookup.substring(2) : `55${normalizedPhoneForLookup}`,
      ];
      
      for (const pv of phoneVariants) {
        const { data: rems } = await supabase
          .from("remetentes")
          .select("nome")
          .or(`celular.ilike.%${pv}%,telefone.ilike.%${pv}%`);
        
        if (rems) {
          const valid = rems.find(r => isValidName(r.nome));
          if (valid) {
            contactName = valid.nome;
            console.log("✅ Nome via remetente (telefone):", contactName);
            break;
          }
        }
      }
    }

    // 4. Buscar em cadastros_origem
    if (!isValidName(contactName) || contactName === normalizedPhoneForLookup) {
      const { data: cadastro } = await supabase
        .from("cadastros_origem")
        .select("nome_cliente")
        .or(`telefone_cliente.ilike.%${normalizedPhoneForLookup}%`)
        .limit(1)
        .single();
      
      if (cadastro?.nome_cliente && isValidName(cadastro.nome_cliente)) {
        contactName = cadastro.nome_cliente;
        console.log("✅ Nome via cadastros_origem:", contactName);
      }
    }

    // 5. Buscar em pedidos_importados (destinatários)
    if (!isValidName(contactName) || contactName === normalizedPhoneForLookup) {
      const { data: pedido } = await supabase
        .from("pedidos_importados")
        .select("destinatario_nome")
        .or(`destinatario_telefone.ilike.%${normalizedPhoneForLookup}%`)
        .not("destinatario_nome", "is", null)
        .limit(1)
        .single();
      
      if (pedido?.destinatario_nome && isValidName(pedido.destinatario_nome)) {
        contactName = pedido.destinatario_nome;
        console.log("✅ Nome via destinatário pedido:", contactName);
      }
    }

    // 6. Buscar em etiquetas_pendentes_correcao (destinatários)
    if (!isValidName(contactName) || contactName === normalizedPhoneForLookup) {
      const { data: etiqueta } = await supabase
        .from("etiquetas_pendentes_correcao")
        .select("destinatario_nome")
        .or(`destinatario_celular.ilike.%${normalizedPhoneForLookup}%`)
        .not("destinatario_nome", "is", null)
        .limit(1)
        .single();
      
      if (etiqueta?.destinatario_nome && isValidName(etiqueta.destinatario_nome)) {
        contactName = etiqueta.destinatario_nome;
        console.log("✅ Nome via etiqueta destinatário:", contactName);
      }
    }

    // 7. Fallback final: displayName limpo do WhatsApp
    if (!isValidName(contactName)) {
      contactName = cleanDisplayName || normalizedPhoneForLookup;
    }

    console.log(`👤 Nome final do contato: ${contactName}`);

    // Resolver canal
    let channel = null;
    if (channelId) {
      channel = await resolveChannelByMessageBirdId(channelId);
    }
    console.log("📡 Canal resolvido:", channel?.name || "nenhum");

    // Buscar ou criar conversa
    const normalizedPhone = normalizedPhoneForLookup;
    let { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("contact_phone", normalizedPhone)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (convError || !conversation) {
      const { data: newConv, error: createError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          contact_phone: normalizedPhone,
          contact_name: contactName,
          whatsapp_channel_id: channel?.id || null,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          unread_count: direction === "inbound" ? 1 : 0,
          ai_enabled: channel?.ai_enabled ?? true,
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar conversa:", createError);
        throw createError;
      }
      conversation = newConv;
      console.log("✅ Nova conversa criada:", conversation.id);
    } else {
      const updateData: any = {
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 100),
        status: "open",
      };
      if (channel?.id) updateData.whatsapp_channel_id = channel.id;
      // Só atualizar nome se o novo for válido e melhor que o atual
      if (isValidName(contactName) && contactName !== normalizedPhone) {
        if (!isValidName(conversation.contact_name) || conversation.contact_name === normalizedPhone) {
          updateData.contact_name = contactName;
        }
      }
      if (direction === "inbound") {
        updateData.unread_count = (conversation.unread_count || 0) + 1;
      }

      await supabase
        .from("whatsapp_conversations")
        .update(updateData)
        .eq("id", conversation.id);
    }

    // Salvar mensagem (evitar duplicata)
    if (messageBirdId) {
      const { data: existing } = await supabase
        .from("whatsapp_messages")
        .select("id")
        .eq("messagebird_id", messageBirdId)
        .single();

      if (existing) {
        console.log("⏭️ Mensagem duplicada ignorada:", messageBirdId);
        return new Response(JSON.stringify({ ok: true, duplicate: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { error: msgError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      messagebird_id: messageBirdId,
      direction,
      content_type: contentType,
      content: messageContent,
      media_url: mediaUrl,
      media_type: mediaType,
      status: "delivered",
      sent_by: direction === "inbound" ? "contact" : "system",
      ai_generated: false,
      metadata: { raw_event: body },
    });

    if (msgError) {
      console.error("❌ Erro ao salvar mensagem:", msgError);
      throw msgError;
    }

    console.log("✅ Mensagem salva na conversa:", conversation.id);

    // Se mensagem inbound e IA habilitada, chamar chat-ai
    if (direction === "inbound" && conversation.ai_enabled && channel?.ai_enabled) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const response = await fetch(`${supabaseUrl}/functions/v1/chat-ai-whatsapp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            message: messageContent,
            contactPhone: normalizedPhone,
            channelId: channel?.id,
            agent: channel?.ai_agent || "maya",
            contentType,
            mediaUrl,
          }),
        });
        console.log("🤖 Chat AI response status:", response.status);
      } catch (aiError) {
        console.error("⚠️ Erro ao chamar chat-ai (não crítico):", aiError);
      }
    }

    return new Response(JSON.stringify({ ok: true, conversationId: conversation.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("❌ Erro no webhook:", error);
    return new Response(JSON.stringify({ error: error?.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});