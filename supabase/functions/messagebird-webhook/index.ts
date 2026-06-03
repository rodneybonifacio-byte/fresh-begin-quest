// @ts-nocheck
import { birdSend } from "../_shared/bird-compat.ts";
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

function isGreetingOnlyMessage(text: string | null | undefined): boolean {
  const normalized = (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[!.,;:?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return false;

  return /^(?:(?:oi+|ola+|oie+|opa+|ei|hey|e ai|eai|bom dia|boa tarde|boa noite)\s*){1,3}$/.test(normalized);
}

/**
 * Classifica intenção da mensagem usando IA (Gemini Flash Lite).
 * Retorna true se a mensagem é PASSIVE (não requer atendimento).
 * Fallback local rápido para emojis puros e mensagens vazias.
 */
async function classifyMessageIntent(
  text: string | null | undefined,
  context?: string
): Promise<{ isPassive: boolean; confidence: number; reason: string }> {
  const cleaned = (text || "").trim();
  
  // Fast-path: vazio ou só espaços
  if (!cleaned) {
    return { isPassive: true, confidence: 1.0, reason: "empty" };
  }

  // Fast-path: só emojis
  const withoutEmojis = cleaned
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, "")
    .replace(/[!.,;:?]/g, "")
    .trim();
  if (!withoutEmojis) {
    return { isPassive: true, confidence: 1.0, reason: "emoji_only" };
  }

  // Chamar a edge function classify-intent
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/classify-intent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ message: cleaned, context }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(`🧠 Intent: ${result.intent} (${result.confidence}) — ${result.reason} — msg: "${cleaned.substring(0, 40)}"`);
      return {
        isPassive: result.intent === "PASSIVE",
        confidence: result.confidence || 0.7,
        reason: result.reason || "ai_classified",
      };
    } else {
      console.warn(`⚠️ classify-intent retornou ${response.status}, usando fallback`);
    }
  } catch (err) {
    console.warn("⚠️ Erro ao chamar classify-intent, usando fallback:", err);
  }

  // Fallback local: se a IA falhar, usar heurística simples
  const normalized = cleaned.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const hasQuestion = /\?|cade|onde|quando|qual|como|porque|por que|quero|preciso|nao\s+recebi|atras|cancel/i.test(normalized);
  return {
    isPassive: !hasQuestion && withoutEmojis.length <= 40,
    confidence: 0.4,
    reason: "local_fallback",
  };
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

    // === NORMALIZAÇÃO Bird API → formato legado MessageBird ===
    // Bird envia: { service, event: "whatsapp.inbound"|"whatsapp.outbound", payload: {...} }
    const birdEvent: string = body.event || body.type || "";
    const isBirdInbound = birdEvent === "whatsapp.inbound" || birdEvent === "channel.message.created" || birdEvent.endsWith(".inbound");
    const isBirdOutbound = birdEvent === "whatsapp.outbound" || birdEvent.endsWith(".outbound") || birdEvent === "channel.message.updated";

    if ((isBirdInbound || isBirdOutbound) && body.payload) {
      const p = body.payload;
      const senderPhone = p.sender?.contact?.identifierValue || p.sender?.identifierValue || p.from;
      const receiverPhone = p.receiver?.connector?.identifierValue || p.receiver?.identifierValue || p.to;
      const contactName = p.sender?.contact?.annotations?.name || p.sender?.contact?.displayName || null;

      const bodyType = p.body?.type || "text";
      let textContent = "";
      let mediaUrlBird: string | null = null;

      if (bodyType === "text") {
        textContent = p.body?.text?.text || p.body?.text || "";
      } else if (bodyType === "image") {
        mediaUrlBird = p.body?.image?.images?.[0]?.url || p.body?.image?.url || null;
        textContent = p.body?.image?.caption?.text || p.body?.image?.caption || "";
      } else if (bodyType === "video") {
        mediaUrlBird = p.body?.video?.videos?.[0]?.url || p.body?.video?.url || null;
        textContent = p.body?.video?.caption?.text || "";
      } else if (bodyType === "audio" || bodyType === "voice") {
        mediaUrlBird = p.body?.audio?.audios?.[0]?.url || p.body?.audio?.url || null;
      } else if (bodyType === "file" || bodyType === "document") {
        mediaUrlBird = p.body?.file?.files?.[0]?.url || p.body?.file?.url || p.body?.document?.url || null;
        textContent = p.body?.file?.caption?.text || "";
      }

      const normalizedType = bodyType === "voice" ? "audio" : (bodyType === "file" ? "document" : bodyType);

      body.type = isBirdInbound ? "message.created" : "message.updated";
      body.message = {
        id: p.id,
        channelId: p.channelId,
        direction: isBirdInbound ? "received" : "sent",
        from: isBirdInbound ? senderPhone : receiverPhone,
        to: isBirdInbound ? receiverPhone : senderPhone,
        type: normalizedType,
        status: p.status || null,
        content: {
          type: normalizedType,
          text: textContent,
          ...(mediaUrlBird ? { [normalizedType]: { url: mediaUrlBird } } : {}),
        },
      };
      body.contact = { msisdn: senderPhone, displayName: contactName };
      console.log(`🐦 Bird ${birdEvent} normalizado: dir=${body.message.direction} from=${body.message.from} type=${normalizedType}`);
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

      // Capturar motivo de falha quando status é failed
      const updatePayload: Record<string, any> = { status: normalizedStatus };
      
      if (normalizedStatus === "failed") {
        const failureReason = message.error?.description 
          || message.error?.message 
          || message.failureReason 
          || message.reason 
          || body.error?.description 
          || body.error?.message 
          || body.reason
          || message.message?.error?.description
          || rawStatus;
        
        const failureCode = message.error?.code 
          || body.error?.code 
          || message.errorCode 
          || null;

        // Buscar metadata existente e adicionar info de falha
        const { data: existingMsg } = await supabase
          .from("whatsapp_messages")
          .select("metadata")
          .eq("messagebird_id", messageBirdId)
          .limit(1)
          .maybeSingle();

        const existingMetadata = (existingMsg?.metadata as Record<string, any>) || {};
        updatePayload.metadata = {
          ...existingMetadata,
          failure_reason: failureReason || "Motivo não informado pela API",
          failure_code: failureCode,
          failed_at: new Date().toISOString(),
          raw_error: message.error || body.error || null,
        };

        console.log(`❌ Mensagem falhou: ${messageBirdId} | Motivo: ${failureReason} | Code: ${failureCode}`);
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from("whatsapp_messages")
        .update(updatePayload)
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

    // === IGNORAR MENSAGENS "UNSUPPORTED" do MessageBird ===
    // MessageBird envia "Received Unsupported message type "unsupported"!" para stickers,
    // figurinhas, e tipos não reconhecidos. Não são mensagens humanas reais.
    const rawText = message.content?.text || message.body || "";
    const isUnsupportedMsg = /received\s+unsupported\s+message\s+type/i.test(rawText)
      || rawContentType === "unsupported"
      || message.type === "unsupported";
    if (isUnsupportedMsg) {
      console.log("⏭️ Mensagem unsupported ignorada silenciosamente:", rawText.substring(0, 80));
      return new Response(JSON.stringify({ ok: true, skipped: "unsupported" }), {
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
    const normalizeComparableName = (value: string | null | undefined) =>
      (value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    const getComparableFirstName = (value: string | null | undefined) =>
      normalizeComparableName(value).split(" ")[0] || "";
    const hasStrongNameConflict = (currentName: string | null | undefined, nextName: string | null | undefined) => {
      if (!isValidName(currentName) || !isValidName(nextName)) return false;
      const currentFirstName = getComparableFirstName(currentName);
      const nextFirstName = getComparableFirstName(nextName);
      return !!currentFirstName && !!nextFirstName && currentFirstName !== nextFirstName;
    };

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

    const [latestTicketResult, latestPipelineResult] = await Promise.all([
      supabase
        .from("whatsapp_tickets")
        .select("contact_name")
        .in("contact_phone", lookupVariants)
        .not("contact_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ai_support_pipeline")
        .select("contact_name")
        .in("contact_phone", lookupVariants)
        .not("contact_name", "is", null)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const trustedRecentName = [
      latestTicketResult.data?.contact_name,
      latestPipelineResult.data?.contact_name,
      cleanDisplayName,
    ].find((name) => isValidName(name)) || null;

    const shouldProtectExistingConversationName =
      !!existingConv?.contact_name &&
      isValidName(existingConv.contact_name) &&
      !hasStrongNameConflict(existingConv.contact_name, trustedRecentName);

    if (shouldProtectExistingConversationName) {
      contactName = existingConv.contact_name;
      console.log("✅ Nome da conversa existente (protegido):", contactName);
    } else {
      if (existingConv?.contact_name && trustedRecentName && hasStrongNameConflict(existingConv.contact_name, trustedRecentName)) {
        console.log("♻️ Nome legado divergente detectado, usando nome mais confiável:", {
          atual: existingConv.contact_name,
          trusted: trustedRecentName,
        });
      }

      if (trustedRecentName) {
        contactName = trustedRecentName;
        console.log("✅ Nome confiável via ticket/pipeline/displayName:", contactName);
      }

      // 2. Buscar nos remetentes por cliente_id
      if ((!isValidName(contactName) || contactName === cleanDisplayName) && existingConv?.cliente_id) {
        const { data: remetentes } = await supabase
          .from("remetentes")
          .select("nome")
          .eq("cliente_id", existingConv.cliente_id);
        
        if (remetentes) {
          let bestMatch = remetentes.find(r => isValidName(r.nome) && cleanDisplayName && r.nome.toLowerCase().includes(cleanDisplayName.toLowerCase().split(" ")[0]));
          if (!bestMatch) bestMatch = remetentes.find(r => isValidName(r.nome));
          if (bestMatch) {
            contactName = bestMatch.nome;
            console.log("✅ Nome via remetente (cliente_id):", contactName);
          }
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

    let intentResult: { isPassive: boolean; confidence: number; reason: string } | undefined;

    if (convError || !conversation) {
      const isOutbound = direction === "outbound";
      const { data: newConv, error: createError } = await supabase
        .from("whatsapp_conversations")
        .insert({
          contact_phone: normalizedPhone,
          contact_name: contactName,
          whatsapp_channel_id: channel?.id || null,
          status: isOutbound ? "closed" : "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: messageContent.substring(0, 100),
          unread_count: direction === "inbound" ? 1 : 0,
          ai_enabled: isOutbound ? false : (channel?.ai_enabled ?? true),
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar conversa:", createError);
        throw createError;
      }
      conversation = newConv;
      console.log(`✅ Nova conversa criada: ${conversation.id} (status: ${isOutbound ? 'closed' : 'open'})`);
    } else {
      const updateData: any = {
        last_message_at: new Date().toISOString(),
        last_message_preview: messageContent.substring(0, 100),
      };
      if (direction === "inbound") {
        updateData.status = "open";
      }
      if (channel?.id) updateData.whatsapp_channel_id = channel.id;
      if (isValidName(contactName) && contactName !== normalizedPhone) {
        const shouldUpdateConversationName =
          !isValidName(conversation.contact_name) ||
          conversation.contact_name === normalizedPhone ||
          hasStrongNameConflict(conversation.contact_name, contactName);

        if (shouldUpdateConversationName) {
          updateData.contact_name = contactName;
          if (hasStrongNameConflict(conversation.contact_name, contactName)) {
            console.log("♻️ Corrigindo nome legado da conversa:", {
              atual: conversation.contact_name,
              novo: contactName,
            });
          }
        }
      }
      if (direction === "inbound") {
        updateData.unread_count = (conversation.unread_count || 0) + 1;

        // === DETECÇÃO DE "NÚMERO ERRADO / NÃO SOU EU" ===
        const wrongPersonPatterns = [
          /n[aã]o\s+sou\s+(eu|ess[ae]?\s+pessoa|esse?\s+(cara|nome|contato))/i,
          /n[aã]o\s+sou\s+\w+/i, // "não sou Jacson"
          /n[aã]o\s+conhe[çc]o\s+ess[ae]/i,
          /n[uú]mero\s+errado/i,
          /meu\s+n[uú]mero\s+n[aã]o\s+[eé]/i,
          /esse?\s+n[uú]mero\s+n[aã]o\s+[eé]\s+(meu|d[aoe]\s+\w+)/i, // "esse número não é da Rita"
          /n[aã]o\s+[eé]\s+pra\s+mim/i,
          /n[aã]o\s+fiz\s+nenhuma?\s+(compra|pedido|envio)/i,
          /quem\s+[eé]\s+ess[ae]\s+pessoa/i,
          /parem\s+de\s+(enviar|mandar)\s+mensag/i,
          /n[aã]o\s+quero\s+(receber|mais)\s+mensag/i,
          /aqui\s+n[aã]o\s+(compra|vende|mora|conhec)/i, // "aqui não compra e nem vende roupa"
          /n[aã]o\s+[eé]\s+d[aoe]\s+\w+/i, // "não é da Rita", "não é do João"
        ];
        const isWrongPerson = wrongPersonPatterns.some(p => p.test(messageContent || ""));
        
        if (isWrongPerson) {
          console.log(`🚫 WRONG PERSON detectado: ${normalizedPhone} — "${messageContent}". Bloqueando número.`);
          // Add to blocklist
          await supabase
            .from("whatsapp_phone_blocklist")
            .upsert({
              phone_number: normalizedPhone,
              reason: `Auto-detectado: "${(messageContent || "").substring(0, 200)}"`,
              contact_name: conversation.contact_name,
              blocked_by: "auto-detection",
            }, { onConflict: "phone_number" });
          // Disable AI and close conversation
          updateData.ai_enabled = false;
          updateData.status = "closed";
          // Close tickets
          await supabase
            .from("whatsapp_tickets")
            .update({ status: "closed", closed_at: new Date().toISOString() })
            .eq("conversation_id", conversation.id)
            .in("status", ["open", "pending", "pending_close"]);
          // Close pipeline cards
          await supabase
            .from("ai_support_pipeline")
            .update({ status: "concluido", resolution: "Número errado - bloqueado automaticamente" })
            .eq("conversation_id", conversation.id)
            .not("status", "in", '("concluido","fechado","cancelado","entregue")');
        }

        // === DETECÇÃO DE AUTO-RESPOSTA DE NEGÓCIOS (WhatsApp Business) ===
        // Respostas automáticas de empresas como "Kumon agradece seu contato. Como podemos ajudar?"
        const autoReplyPatterns = [
          /agradece\s+(seu|o\s+seu)\s+contato/i,
          /obrigad[oa]\s+p(or|elo)\s+(seu\s+)?contato/i,
          /como\s+podemos\s+(te\s+)?ajudar\s*\?/i,
          /em\s+que\s+podemos\s+(te\s+)?ajudar/i,
          /bem[- ]?vind[oa]\s+(ao?|à)/i,
          /nosso\s+hor[aá]rio\s+de\s+(atendimento|funcionamento)/i,
          /atendimento\s+(das?\s+\d|de\s+segunda)/i,
          /mensagem\s+autom[aá]tica/i,
          /resposta\s+autom[aá]tica/i,
          /retornaremos\s+(em\s+breve|o\s+mais)/i,
          /entraremos\s+em\s+contato/i,
          /aguarde.*atendimento/i,
          /fora\s+do\s+hor[aá]rio/i,
          /no\s+momento\s+n[aã]o\s+estamos/i,
          /deixe\s+sua\s+mensagem/i,
        ];
        const isAutoReply = !isWrongPerson && autoReplyPatterns.some(p => p.test(messageContent || ""));
        
        if (isAutoReply) {
          console.log(`🤖 AUTO-REPLY detectado: ${normalizedPhone} — "${(messageContent || "").substring(0, 80)}". Suprimindo IA.`);
          updateData.ai_enabled = false;
          updateData.status = "closed";
          // Fechar tickets
          await supabase
            .from("whatsapp_tickets")
            .update({ status: "closed", closed_at: new Date().toISOString(), resolution: "Auto-resposta de negócio detectada" })
            .eq("conversation_id", conversation.id)
            .in("status", ["open", "pending", "pending_close"]);
          // Concluir pipeline
          await supabase
            .from("ai_support_pipeline")
            .update({ status: "concluido", resolution: "Auto-resposta de WhatsApp Business" })
            .eq("conversation_id", conversation.id)
            .not("status", "in", '("concluido","fechado","cancelado","entregue")');
        }

        // === DETECÇÃO DE PEDIDO DE ATENDENTE HUMANO ===
        const humanRequestPatterns = [
          /quero\s+falar\s+com\s+(um\s+)?(atendente|pessoa|humano|ser\s+humano|gente)/i,
          /falar\s+com\s+(um\s+)?(atendente|pessoa|humano|ser\s+humano)/i,
          /atendente\s+humano/i,
          /pessoa\s+real/i,
          /atendimento\s+humano/i,
          /falar\s+com\s+algu[eé]m/i,
          /posso\s+falar\s+com\s+(um\s+)?atendente/i,
          /cad[eê]\s+(o\s+)?atendente/i,
          /esperando\s+(o\s+)?atendimento/i,
          /esperando\s+(o\s+)?atendente/i,
          /t[oô]\s+aguardando/i,
          /vou\s+ficar\s+esperando/i,
          /aguardando\s+o?\s*atendente/i,
          /quero\s+(um\s+)?humano/i,
          /me\s+passe\s+(um\s+)?(atendente|humano)/i,
          /chama\s+(um\s+)?(atendente|humano|pessoa)/i,
        ];
        const wantsHuman = !isWrongPerson && !isAutoReply && humanRequestPatterns.some(p => p.test(messageContent || ""));
        
        if (wantsHuman) {
          console.log(`👤 HUMAN HANDOFF: Cliente ${normalizedPhone} pediu atendente humano. Desativando IA.`);
          updateData.ai_enabled = false;
          // Enviar mensagem de handoff
          const accessKey = channel?.access_key || Deno.env.get("BIRD_API_KEY");
          const mbChannelId = channel?.channel_id || Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");
          const firstName = (contactName || "").split(" ")[0] || "amigo";
          
          try {
            const handoffMsg = `Entendo, ${firstName}! Vou acionar um atendente humano pra falar com você. Aguarde um momento, por favor. 😊`;
            const mbResp = await birdSend("https://conversations.messagebird.com/v1/send", {
              method: "POST",
              headers: {
                Authorization: `AccessKey ${accessKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                to: normalizedPhone,
                from: mbChannelId,
                type: "text",
                content: { text: handoffMsg },
              }),
            });
            const mbResult = await mbResp.json();
            await supabase.from("whatsapp_messages").insert({
              conversation_id: conversation.id,
              messagebird_id: mbResult.id || null,
              direction: "outbound",
              content_type: "text",
              content: `*Veronica:*\n\n${handoffMsg}`,
              status: "sent",
              sent_by: "system",
              ai_generated: false,
            });
            console.log("✅ Mensagem de handoff humano enviada");
          } catch (handoffErr) {
            console.warn("⚠️ Erro ao enviar handoff:", handoffErr);
          }
        }
        
        // === VERIFICAÇÃO DE SUPRESSÃO PÓS-HSM E PÓS-DESPEDIDA ===
        // Buscar últimas 2 mensagens outbound para checar contexto
        const { data: lastOutbounds } = await supabase
          .from("whatsapp_messages")
          .select("content_type, sent_by, ai_generated, content, metadata")
          .eq("conversation_id", conversation.id)
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(2);

        const lastOutbound = lastOutbounds?.[0] || null;
        const isLastMsgPassiveHSM = lastOutbound?.content_type === "hsm" && lastOutbound?.sent_by === "system";
        const normalizedInbound = (messageContent || "")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[!.,;:?]/g, "")
          .trim();
        const isSimpleGreeting = isGreetingOnlyMessage(normalizedInbound);
        const conversationTags = Array.isArray(conversation.tags)
          ? conversation.tags.map((tag: any) => String(tag).toLowerCase())
          : [];
        const hasTrackingContext = conversationTags.some((tag: string) =>
          ["rastreio", "atraso", "em_transito", "saiu_para_entrega", "aguardando_retirada"].includes(tag)
        );
        const lastHsmTriggerKey = String((lastOutbound?.metadata as any)?.trigger_key || "").toLowerCase();
        const hasCriticalTrackingTrigger = ["atraso", "objeto_postado", "saiu_para_entrega", "aguardando_retirada"].includes(lastHsmTriggerKey);
        
        // === CLASSIFICAÇÃO DE INTENÇÃO VIA IA ===
        // Mídia (documentos, imagens, áudios, vídeos) são SEMPRE consideradas ACTIVE
        // pois o classificador de texto retornaria PASSIVE para conteúdo vazio
        const isMediaMessage = ["image", "video", "document", "audio", "location", "sticker"].includes(contentType);
        
        // Detectar sinais de urgência/cobrança: "?", "??", "responde", "alo", "cadê"
        // Quando a conversa está aberta ou teve IA recente, essas mensagens são ACTIVE
        const urgencySignals = /^(\?+|responde|alo+|cade|helo+|oi\?+|e ai\?*)$/i;
        const isUrgencyFollowUp = urgencySignals.test(normalizedInbound);
        const hadRecentAIResponse = !!lastOutbound?.ai_generated && lastOutbound?.created_at &&
          (Date.now() - new Date(lastOutbound.created_at).getTime()) < 10 * 60 * 1000; // 10 min
        
        // Detectar se a última mensagem da IA já foi uma despedida (pré-classificação)
        const preFarewellPatterns = [
          /se precisar.*s[oó] chamar/i,
          /estou.*pra ajudar/i,
          /qualquer (coisa|ajuda|d[uú]vida)/i,
          /encerrar.*atendimento/i,
          /\bé só chamar\b/i,
          /\bestou [àa] disposi[çc][ãa]o/i,
        ];
        const isAfterFarewell = lastOutbound?.ai_generated && lastOutbound?.content
          && preFarewellPatterns.some(p => p.test(lastOutbound.content));
        // Conversa estava fechada/inativa ou após despedida — saudação = novo atendimento
        const isConversationDormant = conversation.status === "closed" || !conversation.ai_enabled || isAfterFarewell;

        if (isSimpleGreeting && isConversationDormant) {
          intentResult = { isPassive: false, confidence: 0.95, reason: "greeting_reopens_dormant" };
          console.log("🎯 Saudação reabrindo conversa inativa/pós-despedida como ACTIVE:", conversation.id, messageContent);
        } else if (isSimpleGreeting && (hasTrackingContext || hasCriticalTrackingTrigger)) {
          intentResult = { isPassive: false, confidence: 0.95, reason: "greeting_with_tracking_context" };
          console.log("🎯 Saudação com contexto logístico tratada como ACTIVE:", conversation.id, messageContent);
        } else if (isUrgencyFollowUp && hadRecentAIResponse) {
          intentResult = { isPassive: false, confidence: 0.95, reason: "urgency_followup_after_ai" };
          console.log("🎯 Cobrança/urgência após IA recente tratada como ACTIVE:", conversation.id, messageContent);
        } else if (isMediaMessage) {
          intentResult = { isPassive: false, confidence: 1.0, reason: "media_always_active" };
          console.log(`🎯 Mídia (${contentType}) tratada como ACTIVE automaticamente`);
        } else {
          intentResult = await classifyMessageIntent(messageContent, 
            isLastMsgPassiveHSM ? "Resposta a notificação HSM automática de logística" : "Mensagem após atendimento da IA");
        }
        const shouldSuppress = intentResult.isPassive;

        // Detectar se a última mensagem da IA já foi uma despedida
        const farewellPatterns = [
          /se precisar.*s[oó] chamar/i,
          /estou.*pra ajudar/i,
          /qualquer (coisa|ajuda|d[uú]vida)/i,
          /encerrar.*atendimento/i,
          /\bé só chamar\b/i,
          /\bestou [àa] disposi[çc][ãa]o/i,
        ];
        const isLastMsgFarewell = isAfterFarewell; // reuse pre-computed value
        const isPassiveFollowUpAfterAI = !!lastOutbound?.ai_generated && shouldSuppress;

        // Só suprimir se a mensagem for MUITO curta (ack mínimo tipo "ok", "👍", "sim").
        // Mensagens maiores merecem resposta da IA mesmo classificadas como PASSIVE.
        const _contentNoEmoji = (messageContent || "").trim()
          .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, "")
          .replace(/[!.,;:?]/g, "")
          .trim();
        const isMinimalPassive = _contentNoEmoji.length <= 3;

        // Não suprimir saudações — já foram tratadas como ACTIVE acima
        // Só auto-fechar quando o ack for realmente mínimo ("ok", "sim", emoji). Caso contrário, deixar IA responder.
        if ((isLastMsgPassiveHSM || isLastMsgFarewell || isPassiveFollowUpAfterAI) && shouldSuppress && !isSimpleGreeting && isMinimalPassive) {
          console.log("⏭️ Inbound passivo MÍNIMO após", isLastMsgPassiveHSM ? "HSM" : isLastMsgFarewell ? "despedida IA" : "resposta IA", "— suprimindo:", conversation.id, "msg:", messageContent);
          updateData.ai_enabled = false;
          updateData.status = "closed";
          // Fechar tickets abertos dessa conversa
          await supabase
            .from("whatsapp_tickets")
            .update({ status: "closed", closed_at: new Date().toISOString() })
            .eq("conversation_id", conversation.id)
            .in("status", ["open", "pending", "pending_close"]);
          // Concluir cards do pipeline (exceto rastreio)
          await supabase
            .from("ai_support_pipeline")
            .update({ status: "concluido" })
            .eq("conversation_id", conversation.id)
            .neq("category", "rastreio")
            .not("status", "in", '("concluido","fechado","cancelado","entregue")');
        } else if (channel?.ai_enabled && !isWrongPerson && !isAutoReply) {
          // Garantir IA sempre ativa para qualquer inbound não-passivo
          const isMediaMessage = ["image", "video", "document", "audio", "location"].includes(contentType);
          const reopensDormantGreeting = intentResult.reason === "greeting_reopens_dormant" || intentResult.reason === "greeting_with_tracking_context";
          const hasSubstantialContent = isMediaMessage || reopensDormantGreeting || (messageContent || "").trim().length > 2;
          
          if (hasSubstantialContent && !intentResult.isPassive) {
            // Verificar cooldown de admin (30 min) — só respeitar se admin respondeu recentemente
            let adminRespondedRecently = false;
            const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
            const { data: recentAdminMsgs } = await supabase
              .from("whatsapp_messages")
              .select("id")
              .eq("conversation_id", conversation.id)
              .eq("direction", "outbound")
              .eq("sent_by", "admin")
              .gte("created_at", thirtyMinAgo)
              .limit(1);
            adminRespondedRecently = (recentAdminMsgs && recentAdminMsgs.length > 0);
            
            if (!adminRespondedRecently) {
              // Sempre ativar IA e abrir conversa
              updateData.ai_enabled = true;
              updateData.status = "open";
              
              if (conversation.status === "closed") {
                console.log("🔓 Reabrindo conversa fechada — cliente mandou mensagem ativa:", conversation.id);
                await supabase.from("whatsapp_tickets").insert({
                  conversation_id: conversation.id,
                  contact_phone: conversation.contact_phone,
                  contact_name: conversation.contact_name,
                  status: "open",
                  category: "geral",
                  subject: "Conversa reaberta pelo cliente",
                  opened_at: new Date().toISOString(),
                  first_message_at: new Date().toISOString(),
                });
              }
              
              console.log("🔄 IA ativada para conversa (inbound substancial):", conversation.id);
            } else {
              console.log("⏭️ IA não reativada — admin respondeu recentemente:", conversation.id);
            }
          } else if (!hasSubstantialContent || intentResult.isPassive) {
            console.log("⏭️ Mensagem passiva/vazia, mantendo estado atual:", conversation.id, "msg:", (messageContent || "").substring(0, 50));
          }
        }
      }

      await supabase
        .from("whatsapp_conversations")
        .update(updateData)
        .eq("id", conversation.id);

      if (typeof updateData.ai_enabled === "boolean") {
        conversation.ai_enabled = updateData.ai_enabled;
      }
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
        const accessKey = channel?.access_key || Deno.env.get("BIRD_API_KEY");
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
    // Mas ignorar respostas passivas/autoresponder após HSM de notificação
    let shouldCallAI = direction === "inbound" && conversation.ai_enabled && channel?.ai_enabled;

    if (shouldCallAI) {
      const { data: lastOutMsg } = await supabase
        .from("whatsapp_messages")
        .select("content_type, sent_by")
        .eq("conversation_id", conversation.id)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const isPassiveHSM = lastOutMsg?.content_type === "hsm" && lastOutMsg?.sent_by === "system";
      // Reusar classificação IA já feita acima, ou classificar novamente se necessário
      const isMediaForAI = ["image", "video", "document", "audio", "voice", "ptt", "location", "sticker"].includes(contentType);
      const intentForAI = typeof intentResult !== "undefined" 
        ? intentResult
        : isMediaForAI
          ? { isPassive: false, confidence: 1.0, reason: "media_always_active" }
          : await classifyMessageIntent(messageContent, "Resposta a HSM automático");
      const shouldSuppressForAI = intentForAI.isPassive;
      // Só suprimir quando o ack for realmente mínimo (≤3 chars sem emoji/pontuação)
      const _ackNoEmoji = (messageContent || "").trim()
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, "")
        .replace(/[!.,;:?]/g, "")
        .trim();
      const isMinimalAck = _ackNoEmoji.length <= 3;
      const isGreetingAck = isGreetingOnlyMessage(messageContent)
        || intentForAI.reason === "greeting_reopens_dormant"
        || intentForAI.reason === "greeting_with_tracking_context";

      if (isPassiveHSM && isGreetingAck) {
        shouldCallAI = true;
        console.log(`👋 Saudação após HSM — encaminhando para IA: ${conversation.id}`);
        await supabase
          .from("whatsapp_conversations")
          .update({ ai_enabled: true, status: "open" })
          .eq("id", conversation.id);
        conversation.ai_enabled = true;
      } else if (isPassiveHSM && shouldSuppressForAI && isMinimalAck && !isMediaForAI) {
        console.log("⏭️ Inbound passivo após HSM — verificando tipo:", conversation.id);

        // Buscar último HSM para saber o trigger_key
        const { data: lastHsmMsg } = await supabase
          .from("whatsapp_messages")
          .select("metadata")
          .eq("conversation_id", conversation.id)
          .eq("direction", "outbound")
          .eq("content_type", "hsm")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const hsmTriggerKey = (lastHsmMsg?.metadata as any)?.trigger_key || "";
        const hsmVars = (lastHsmMsg?.metadata as any)?.variables || {};
        const isDeliveryRelated = ["saiu_para_entrega", "entregue", "aguardando_retirada"].includes(hsmTriggerKey);
        const isNPSRelated = hsmTriggerKey === "avaliacao";
        const isDelayRelated = hsmTriggerKey === "atraso";

        // REGRA CRÍTICA: Respostas após HSM de ATRASO devem SEMPRE ir para a IA
        // O cliente provavelmente quer saber mais sobre o problema
        if (isDelayRelated) {
          shouldCallAI = true;
          console.log(`🚨 Resposta após HSM de ATRASO — encaminhando para IA: ${conversation.id}`);
          // Reabrir conversa e ativar IA
          await supabase
            .from("whatsapp_conversations")
            .update({ ai_enabled: true, status: "open" })
            .eq("id", conversation.id);
          conversation.ai_enabled = true;
        } else {
          // Verificar se é CONFIRMAÇÃO EXPLÍCITA de entrega vs SAUDAÇÃO
          const normalizedMsg = (messageContent || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          const deliveryConfirmationPatterns = [
            "recebi", "recebido", "recebi sim", "ja recebi", "chegou", "ja chegou",
            "chegou sim", "recebemos", "ja recebemos", "tudo certo", "tudo ok",
            "recebi tudo", "chegou tudo", "perfeito", "recebido com sucesso",
          ];
          const isExplicitDeliveryConfirmation = deliveryConfirmationPatterns.some(p => normalizedMsg.includes(p));
          const isGreeting = isGreetingOnlyMessage(normalizedMsg);

          if (isDeliveryRelated && isExplicitDeliveryConfirmation && !isGreeting) {
            // === CONFIRMAÇÃO EXPLÍCITA DE ENTREGA ===
            shouldCallAI = false;
            console.log(`🎉 Confirmação de entrega EXPLÍCITA detectada! Trigger: ${hsmTriggerKey}, Contato: ${contactName}`);
            const firstName = (contactName || "").split(" ")[0] || "amigo";
            const positiveMsg = `Que bom que chegou, ${firstName}! 😊 Ficamos felizes! Se precisar de algo, é só chamar.`;

            try {
              const accessKey = channel?.access_key || Deno.env.get("BIRD_API_KEY");
              const mbChannelId = channel?.channel_id || Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");
              const mbResp = await birdSend("https://conversations.messagebird.com/v1/send", {
                method: "POST",
                headers: {
                  Authorization: `AccessKey ${accessKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to: normalizedPhone,
                  from: mbChannelId,
                  type: "text",
                  content: { text: positiveMsg },
                }),
              });
              const mbResult = await mbResp.json();
              console.log("✅ Mensagem positiva enviada:", mbResult.id || "ok");

              await supabase.from("whatsapp_messages").insert({
                conversation_id: conversation.id,
                messagebird_id: mbResult.id || null,
                direction: "outbound",
                content_type: "text",
                content: positiveMsg,
                status: "sent",
                sent_by: "system",
                ai_generated: false,
              });
            } catch (posErr) {
              console.warn("⚠️ Erro ao enviar mensagem positiva:", posErr);
            }

            // SALVAR FOTO COMO COMPROVANTE DE ENTREGA
            const trackingCode = hsmVars.codigo_rastreio || "";
            if (trackingCode) {
              const { data: recentImage } = await supabase
                .from("whatsapp_messages")
                .select("media_url")
                .eq("conversation_id", conversation.id)
                .eq("direction", "inbound")
                .eq("content_type", "image")
                .gte("created_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (recentImage?.media_url) {
                console.log(`📸 Comprovante de entrega vinculado: ${trackingCode} → ${recentImage.media_url}`);
                await supabase
                  .from("ai_support_pipeline")
                  .update({
                    status: "entregue",
                    resolution: `Entrega confirmada pelo destinatário. Comprovante: ${recentImage.media_url}`,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("conversation_id", conversation.id)
                  .eq("category", "rastreio");
              }
            }

            console.log(`⏭️ Avaliação será enviada apenas pelo cron para ${normalizedPhone} (${trackingCode})`);

            // Fechar conversa após confirmação de entrega
            await supabase
              .from("whatsapp_conversations")
              .update({ ai_enabled: false, status: "closed" })
              .eq("id", conversation.id);
            conversation.ai_enabled = false;
            await supabase
              .from("whatsapp_tickets")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .eq("conversation_id", conversation.id)
              .in("status", ["open", "pending", "pending_close"]);
            await supabase
              .from("ai_support_pipeline")
              .update({ status: "concluido" })
              .eq("conversation_id", conversation.id)
              .neq("category", "rastreio")
              .not("status", "in", '("concluido","fechado","cancelado","entregue")');

          } else if (isDeliveryRelated && isGreeting) {
            // === SAUDAÇÃO após HSM de entrega — NÃO assumir que chegou, ativar IA ===
            shouldCallAI = true;
            console.log(`👋 Saudação após HSM de entrega — ativando IA (NÃO assumir confirmação): ${conversation.id}`);
            await supabase
              .from("whatsapp_conversations")
              .update({ ai_enabled: true, status: "open" })
              .eq("id", conversation.id);
            conversation.ai_enabled = true;

          } else if (isNPSRelated) {
            // === RESPOSTA AO TEMPLATE DE AVALIAÇÃO ===
            shouldCallAI = false;
            console.log(`⭐ Feedback de avaliação recebido de ${contactName}: "${messageContent}"`);
            const firstName = (contactName || "").split(" ")[0] || "amigo";
            const accessKey = channel?.access_key || Deno.env.get("BIRD_API_KEY");
            const mbChannelId = channel?.channel_id || Deno.env.get("BIRD_WHATSAPP_CHANNEL_ID");
            const thankYouMsg = `Muito obrigada pelo seu feedback, ${firstName}! 💛 Sua opinião é muito importante pra gente. Conte sempre com a gente!`;

            try {
              const mbResp = await birdSend("https://conversations.messagebird.com/v1/send", {
                method: "POST",
                headers: {
                  Authorization: `AccessKey ${accessKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  to: normalizedPhone,
                  from: mbChannelId,
                  type: "text",
                  content: { text: thankYouMsg },
                }),
              });
              const mbResult = await mbResp.json();
              console.log("✅ Agradecimento NPS enviado:", mbResult.id || "ok");

              await supabase.from("whatsapp_messages").insert({
                conversation_id: conversation.id,
                messagebird_id: mbResult.id || null,
                direction: "outbound",
                content_type: "text",
                content: thankYouMsg,
                status: "sent",
                sent_by: "system",
                ai_generated: false,
              });
            } catch (npsErr) {
              console.warn("⚠️ Erro ao enviar agradecimento NPS:", npsErr);
            }

            await supabase
              .from("ai_support_pipeline")
              .update({
                sentiment: "positivo",
                status: "agradecido",
                resolution: `Feedback positivo do cliente: "${(messageContent || "").substring(0, 200)}"`,
                updated_at: new Date().toISOString(),
              })
              .eq("conversation_id", conversation.id)
              .eq("category", "elogio");

            // Fechar conversa
            await supabase
              .from("whatsapp_conversations")
              .update({ ai_enabled: false, status: "closed" })
              .eq("id", conversation.id);
            conversation.ai_enabled = false;
            await supabase
              .from("whatsapp_tickets")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .eq("conversation_id", conversation.id)
              .in("status", ["open", "pending", "pending_close"]);

          } else if (isGreetingAck) {
            shouldCallAI = true;
            console.log(`👋 Saudação passiva após resposta IA — mantendo IA ativa: ${conversation.id}`);
            await supabase
              .from("whatsapp_conversations")
              .update({ ai_enabled: true, status: "open" })
              .eq("id", conversation.id);
            conversation.ai_enabled = true;
          } else {
            // Passivo genérico após HSM não-delivery — suprimir silenciosamente
            shouldCallAI = false;
            console.log(`⏭️ Inbound passivo após resposta IA — suprimindo: ${conversation.id} msg: ${messageContent}`);
            await supabase
              .from("whatsapp_conversations")
              .update({ ai_enabled: false, status: "closed" })
              .eq("id", conversation.id);
            conversation.ai_enabled = false;
            await supabase
              .from("whatsapp_tickets")
              .update({ status: "closed", closed_at: new Date().toISOString() })
              .eq("conversation_id", conversation.id)
              .in("status", ["open", "pending", "pending_close"]);
            await supabase
              .from("ai_support_pipeline")
              .update({ status: "concluido" })
              .eq("conversation_id", conversation.id)
              .neq("category", "rastreio")
              .not("status", "in", '("concluido","fechado","cancelado","entregue")');
          }
        }
      }
    }

    if (shouldCallAI) {
      try {
        // === DEBOUNCE: esperar 8s e verificar se esta é a mensagem mais recente ===
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Verificar se ESTA mensagem é a mais recente inbound da conversa
        const { data: latestInbound } = await supabase
          .from("whatsapp_messages")
          .select("id, messagebird_id")
          .eq("conversation_id", conversation.id)
          .eq("direction", "inbound")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        const isLatest = !latestInbound || latestInbound.messagebird_id === messageBirdId || latestInbound.id === messageBirdId;
        const newerMsgs = isLatest ? [] : [latestInbound];
        
        if (newerMsgs && newerMsgs.length > 0) {
          console.log("⏭️ DEBOUNCE: mensagem mais nova detectada, pulando AI para esta:", messageBirdId);
        } else {
          const { data: currentInboundMsg } = await supabase
            .from("whatsapp_messages")
            .select("created_at")
            .eq("messagebird_id", messageBirdId)
            .limit(1)
            .maybeSingle();

          const inboundCreatedAt = currentInboundMsg?.created_at || new Date(Date.now() - 1000).toISOString();
          const { data: recentAiReply } = await supabase
            .from("whatsapp_messages")
            .select("id, created_at")
            .eq("conversation_id", conversation.id)
            .eq("direction", "outbound")
            .eq("ai_generated", true)
            .gte("created_at", inboundCreatedAt)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (recentAiReply) {
            console.log("⏭️ Guard rail: já existe resposta da IA para este inbound, pulando chamada duplicada:", conversation.id, recentAiReply.id);
          } else {
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const isMediaMsg = contentType === "audio" || contentType === "voice" || contentType === "ptt" || contentType === "image" || contentType === "video" || contentType === "document" || contentType === "sticker" || contentType === "location";
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
          }
        }
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