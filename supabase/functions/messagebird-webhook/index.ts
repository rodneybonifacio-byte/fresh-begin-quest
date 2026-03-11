// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveChannelByMessageBirdId } from "../_shared/channel-resolver.ts";
import { normalizeBrazilianPhone, phoneVariants } from "../_shared/normalize-phone.ts";

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

function normalizeMessageStatus(status: string | null | undefined): "sent" | "delivered" | "read" | "failed" | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes("read") || s.includes("seen")) return "read";
  if (s.includes("delivered")) return "delivered";
  if (s.includes("failed") || s.includes("undeliverable") || s.includes("rejected")) return "failed";
  if (s.includes("sent") || s.includes("accepted") || s.includes("queued")) return "sent";
  return null;
}

function hasTrackingIntent(text: string | null | undefined): boolean {
  const normalized = (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const trackingHints = [
    "rastreio", "codigo", "entrega", "encomenda", "pedido", "objeto", "status",
    "atras", "quando chega", "onde esta", "nao chegou", "correios", "frete",
  ];

  return trackingHints.some((hint) => normalized.includes(hint));
}

function isLikelyAutoReply(text: string | null | undefined): boolean {
  const normalized = (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const autoReplySignals = [
    "seja bem-vind",
    "prazer ter voce conosco",
    "responderemos as mensagens por ordem de chegada",
    "ja ja chego em voce",
    "me fala seu nome para iniciar",
    "iniciar o atendimento",
    "nossa equipe",
    "por ordem de chegada",
  ];

  return autoReplySignals.some((signal) => normalized.includes(signal));
}

function shouldSuppressAIAfterPassiveHSM(text: string | null | undefined): boolean {
  const cleaned = (text || "").trim();
  if (!cleaned) return true;

  const simpleAckRegex = /^(ok|okay|obrigad[oa]|valeu|beleza|blz|top|👍|👌|🙏|certo|entendi|show|boa|massa|legal|ta|tá)\s*[!.]*$/i;

  if (hasTrackingIntent(cleaned)) return false;
  return simpleAckRegex.test(cleaned) || isLikelyAutoReply(cleaned);
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
    const bodyStr = JSON.stringify(body);
    console.log("📩 Webhook recebido:", bodyStr.substring(0, 500));

    // Log extra para mídia — payload completo (até 2000 chars)
    const hasMediaHint = bodyStr.includes("audio") || bodyStr.includes("voice") || bodyStr.includes("ptt") || bodyStr.includes("video") || bodyStr.includes("image") || bodyStr.includes("document") || bodyStr.includes("sticker");
    if (hasMediaHint) {
      console.log("🎵 PAYLOAD MÍDIA COMPLETO:", bodyStr.substring(0, 2000));
      if (bodyStr.length > 2000) console.log("🎵 PAYLOAD MÍDIA (cont):", bodyStr.substring(2000, 4000));
    }

    const eventType = body.type || body.event;
    const isMessageCreated = !!eventType && eventType.includes("message.created");
    const isMessageUpdated = !!eventType && eventType.includes("message.updated");

    if (!isMessageCreated && !isMessageUpdated) {
      console.log("⏭️ Evento ignorado:", eventType);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = body.message || body.data || body;
    const messageBirdId = message.id || body.id || message.messageId || body.messageId;

    // message.updated geralmente vem sem telefone; tratamos apenas atualização de status
    if (isMessageUpdated) {
      const rawStatus = String(message.status || body.status || message.message?.status || "");
      const normalizedStatus = normalizeMessageStatus(rawStatus);

      if (!messageBirdId || !normalizedStatus) {
        console.log("⏭️ update sem id/status utilizável", { messageBirdId, rawStatus });
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from("whatsapp_messages")
        .update({ status: normalizedStatus })
        .eq("messagebird_id", messageBirdId)
        .select("id");

      if (updateError) {
        console.error("⚠️ Falha ao atualizar status da mensagem:", updateError);
      }

      console.log("✅ Status atualizado", {
        messageBirdId,
        status: normalizedStatus,
        updated: updatedRows?.length ?? 0,
      });

      return new Response(JSON.stringify({ ok: true, updated: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const channelId = message.channelId || message.channel_id || body.channelId;
    const direction = message.direction === "received" || message.direction === "incoming" ? "inbound" : "outbound";
    const rawPhone = direction === "inbound"
      ? (message.from || body.contact?.msisdn || message.contact?.msisdn || message.originator)
      : (message.to || body.contact?.msisdn || message.contact?.msisdn || message.destination || message.originator);
    const contactPhone = rawPhone ? String(rawPhone) : null;
    const whatsappDisplayName = body.contact?.displayName || body.contact?.firstName || message.contact?.displayName || message.contact?.firstName || null;
    let messageContent = message.content?.text || message.body || message.content?.html || message.content?.caption || "";

    // === DETECÇÃO ROBUSTA DE CONTENT TYPE ===
    const rawContentType = message.content?.type || message.type || "text";
    // Detecção por presença de campos no content
    let contentType = rawContentType;

    // === IGNORAR REAÇÕES silenciosamente ===
    if (rawContentType === "reaction" || message.type === "reaction") {
      console.log("⏭️ Mensagem de reação ignorada silenciosamente");
      return new Response(JSON.stringify({ ok: true, skipped: "reaction" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HSM (template) messages
    if (message.content?.hsm || rawContentType === "hsm" || message.type === "hsm") {
      contentType = "hsm";
      // Preencher content para HSM se vazio
      if (!messageContent) {
        const templateName = message.content?.hsm?.templateName || "template";
        messageContent = `📋 Template: ${templateName}`;
      }
    } else if (message.content?.audio || rawContentType === "audio" || rawContentType === "voice" || rawContentType === "ptt") {
      contentType = "audio";
    } else if (message.content?.image || rawContentType === "image") {
      contentType = "image";
    } else if (message.content?.video || rawContentType === "video") {
      contentType = "video";
    } else if (message.content?.document || rawContentType === "document" || rawContentType === "file") {
      contentType = "document";
    }

    // === EXTRAÇÃO ROBUSTA DE MEDIA URL ===
    const mediaUrl = message.content?.audio?.url
      || message.content?.voice?.url
      || message.content?.image?.url
      || message.content?.video?.url
      || message.content?.document?.url
      || message.content?.media?.url
      || message.content?.file?.url
      || message.content?.url
      || null;
    const mediaType = message.content?.audio?.contentType
      || message.content?.voice?.contentType
      || message.content?.media?.contentType
      || message.content?.image?.contentType
      || message.content?.video?.contentType
      || message.content?.document?.contentType
      || null;

    console.log("📋 Parsed:", { direction, contentType, rawContentType, hasMedia: !!mediaUrl, mediaUrl: mediaUrl?.substring(0, 80) || "null" });

    if (!contactPhone) {
      console.warn("⚠️ Evento sem telefone do contato, ignorando sem falhar");
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: "missing_contact_phone" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // === RESOLVER NOME REAL DO CLIENTE ===
    const normalizedPhoneForLookup = normalizeBrazilianPhone(contactPhone);

    // Limpar displayName do WhatsApp (remover "NoLastNameEntered" etc)
    let cleanDisplayName = whatsappDisplayName;
    if (cleanDisplayName) {
      cleanDisplayName = cleanDisplayName.replace(/\s*NoLastNameEntered\s*/gi, '').trim();
      if (!isValidName(cleanDisplayName)) cleanDisplayName = null;
    }

    let contactName = cleanDisplayName || normalizedPhoneForLookup;

    // 1. Buscar conversa existente (todas as variantes do telefone)
    const lookupVariants = phoneVariants(normalizedPhoneForLookup);
    const { data: existingConv } = await supabase
      .from("whatsapp_conversations")
      .select("contact_name, cliente_id")
      .in("contact_phone", lookupVariants)
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

    // Buscar ou criar conversa — buscar por todas as variantes do telefone
    const normalizedPhone = normalizedPhoneForLookup;
    const variants = phoneVariants(normalizedPhone);
    let { data: conversation, error: convError } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .in("contact_phone", variants)
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
        // Reativar IA se canal permite e conversa estava desativada
        if (!conversation.ai_enabled && channel?.ai_enabled) {
          // Verificar se a última mensagem outbound foi um HSM passivo do sistema
          // Se sim, só reativar se o cliente enviar algo substancial (não apenas "ok", "obrigado", etc.)
          const { data: lastOutbound } = await supabase
            .from("whatsapp_messages")
            .select("content_type, sent_by")
            .eq("conversation_id", conversation.id)
            .eq("direction", "outbound")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const isLastMsgPassiveHSM = lastOutbound?.content_type === "hsm" && lastOutbound?.sent_by === "system";
          const respostaSimples = /^(ok|okay|obrigad[oa]|valeu|beleza|blz|top|👍|👌|🙏|certo|entendi|show|boa|massa|legal|tá|ta)\s*[!.]*$/i;
          const isRespostaSimples = respostaSimples.test((messageContent || "").trim());

          if (isLastMsgPassiveHSM && isRespostaSimples) {
            console.log("⏭️ Resposta simples a HSM passivo, IA permanece desativada:", conversation.id);
          } else {
            updateData.ai_enabled = true;
            console.log("🔄 IA reativada para conversa (mensagem inbound recebida):", conversation.id);
          }
        }
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

    // Se for áudio/mídia inbound, baixar do MessageBird (requer auth) e re-upload para Storage
    let finalMediaUrl = mediaUrl;
    if (direction === "inbound" && mediaUrl && (contentType === "audio" || contentType === "voice" || contentType === "ptt" || contentType === "image")) {
      try {
        const accessKey = channel?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
        if (accessKey) {
          console.log("📥 Baixando mídia do MessageBird:", mediaUrl.substring(0, 80));
          const mediaResponse = await fetch(mediaUrl, {
            headers: { Authorization: `AccessKey ${accessKey}` },
          });
          if (mediaResponse.ok) {
            const mediaBuffer = await mediaResponse.arrayBuffer();
            const mimeType = mediaResponse.headers.get("content-type") || (contentType === "image" ? "image/jpeg" : "audio/ogg");
            const ext = mimeType.includes("mp3") ? "mp3" : mimeType.includes("mp4") ? "mp4" : mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : mimeType.includes("png") ? "png" : mimeType.includes("ogg") ? "ogg" : "bin";
            const fileName = `whatsapp-media/${contentType}-${Date.now()}-${crypto.randomUUID().substring(0, 8)}.${ext}`;
            
            const { error: uploadError } = await supabase.storage
              .from("avatars")
              .upload(fileName, new Uint8Array(mediaBuffer), {
                contentType: mimeType,
                upsert: true,
              });
            
            if (!uploadError) {
              const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
              finalMediaUrl = publicUrlData.publicUrl;
              console.log("✅ Mídia re-uploaded para Storage:", finalMediaUrl.substring(0, 80));
            } else {
              console.warn("⚠️ Erro upload mídia para Storage:", uploadError);
            }
          } else {
            console.warn("⚠️ Erro ao baixar mídia do MessageBird:", mediaResponse.status);
          }
        }
      } catch (mediaError) {
        console.warn("⚠️ Erro ao processar mídia:", mediaError);
      }
    }

    const initialStatus = direction === "inbound" ? "delivered" : "sent";

    const { error: msgError } = await supabase.from("whatsapp_messages").insert({
      conversation_id: conversation.id,
      messagebird_id: messageBirdId,
      direction,
      content_type: contentType,
      content: messageContent,
      media_url: finalMediaUrl,
      media_type: mediaType,
      status: initialStatus,
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
    // Mas verificar se é resposta simples a HSM passivo para não responder fora de contexto
    let shouldCallAI = direction === "inbound" && conversation.ai_enabled && channel?.ai_enabled;
    
    if (shouldCallAI) {
      // Verificar se a última mensagem outbound foi HSM passivo e a resposta é simples
      const { data: lastOutMsg } = await supabase
        .from("whatsapp_messages")
        .select("content_type, sent_by, metadata")
        .eq("conversation_id", conversation.id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isPassiveHSM = lastOutMsg?.content_type === "hsm" && lastOutMsg?.sent_by === "system";
      
      if (isPassiveHSM) {
        const respostaSimples = /^(ok|okay|obrigad[oa]|valeu|beleza|blz|top|👍|👌|🙏|certo|entendi|show|boa|massa|legal|tá|ta)\s*[!.]*$/i;
        if (respostaSimples.test((messageContent || "").trim())) {
          shouldCallAI = false;
          console.log("⏭️ Resposta simples a HSM passivo, IA não será chamada:", conversation.id);
          // Desativar IA e fechar conversa silenciosamente
          await supabase
            .from("whatsapp_conversations")
            .update({ ai_enabled: false })
            .eq("id", conversation.id);
        }
      }
    }

    if (shouldCallAI) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const isMediaMsg = contentType === "audio" || contentType === "voice" || contentType === "ptt" || contentType === "image" || contentType === "video";
        console.log("🤖 Chamando chat-ai:", { contentType, isMediaMsg, hasMediaUrl: !!finalMediaUrl, messageLen: messageContent?.length || 0 });
        
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
            agent: conversation.active_agent || channel?.ai_agent || "veronica",
            contentType,
            mediaUrl: finalMediaUrl,
          }),
        });
        console.log("🤖 Chat AI response status:", response.status);
      } catch (aiError) {
        console.error("⚠️ Erro ao chamar chat-ai (não crítico):", aiError);
      }
    } else if (direction === "inbound") {
      console.log("⏭️ Não chamou chat-ai:", { direction, ai_enabled: conversation.ai_enabled, channel_ai: channel?.ai_enabled });
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