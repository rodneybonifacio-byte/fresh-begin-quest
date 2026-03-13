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

        // === DETECÇÃO DE "NÚMERO ERRADO / NÃO SOU EU" ===
        const wrongPersonPatterns = [
          /n[aã]o\s+sou\s+(eu|ess[ae]?\s+pessoa|esse?\s+(cara|nome|contato))/i,
          /n[aã]o\s+sou\s+\w+/i, // "não sou Jacson"
          /n[aã]o\s+conhe[çc]o\s+ess[ae]/i,
          /n[uú]mero\s+errado/i,
          /meu\s+n[uú]mero\s+n[aã]o\s+[eé]/i,
          /esse?\s+n[uú]mero\s+n[aã]o\s+[eé]\s+meu/i,
          /n[aã]o\s+[eé]\s+pra\s+mim/i,
          /n[aã]o\s+fiz\s+nenhuma?\s+(compra|pedido|envio)/i,
          /quem\s+[eé]\s+ess[ae]\s+pessoa/i,
          /parem\s+de\s+(enviar|mandar)\s+mensag/i,
          /n[aã]o\s+quero\s+(receber|mais)\s+mensag/i,
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
        
        // === VERIFICAÇÃO DE SUPRESSÃO PÓS-HSM E PÓS-DESPEDIDA ===
        // Buscar últimas 2 mensagens outbound para checar contexto
        const { data: lastOutbounds } = await supabase
          .from("whatsapp_messages")
          .select("content_type, sent_by, ai_generated, content")
          .eq("conversation_id", conversation.id)
          .eq("direction", "outbound")
          .order("created_at", { ascending: false })
          .limit(2);

        const lastOutbound = lastOutbounds?.[0] || null;
        const isLastMsgPassiveHSM = lastOutbound?.content_type === "hsm" && lastOutbound?.sent_by === "system";
        
        // === CLASSIFICAÇÃO DE INTENÇÃO VIA IA ===
        const intentResult = await classifyMessageIntent(messageContent, 
          isLastMsgPassiveHSM ? "Resposta a notificação HSM automática de logística" : "Mensagem após atendimento da IA");
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
        const isLastMsgFarewell = lastOutbound?.ai_generated && lastOutbound?.content
          && farewellPatterns.some(p => p.test(lastOutbound.content));

        if ((isLastMsgPassiveHSM || isLastMsgFarewell) && shouldSuppress) {
          console.log("⏭️ Inbound passivo após", isLastMsgPassiveHSM ? "HSM" : "despedida IA", "— suprimindo:", conversation.id, "msg:", messageContent);
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
        } else if (!conversation.ai_enabled && channel?.ai_enabled && !isWrongPerson) {
          // Reativar IA apenas se:
          // 1. Estava desativada
          // 2. A mensagem NÃO é passiva
          // 3. NÃO é wrong person
          // 4. A mensagem tem conteúdo substancial (não é ruído)
          const hasSubstantialContent = (messageContent || "").trim().length > 2
            && !intentResult.isPassive;
          if (hasSubstantialContent) {
            updateData.ai_enabled = true;
            console.log("🔄 IA reativada para conversa (mensagem substancial recebida):", conversation.id);
          } else {
            console.log("⏭️ IA NÃO reativada — mensagem passiva/ruído:", conversation.id, "msg:", (messageContent || "").substring(0, 50));
          }
        }
        // Se ai_enabled já é true e mensagem não é passiva, manter como está
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
      const intentForAI = typeof intentResult !== "undefined" 
        ? intentResult 
        : await classifyMessageIntent(messageContent, "Resposta a HSM automático");
      const shouldSuppressForAI = intentForAI.isPassive;

      if (isPassiveHSM && shouldSuppressForAI) {
        shouldCallAI = false;
        console.log("⏭️ Inbound passivo após HSM — verificando se é confirmação de entrega:", conversation.id);

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

        if (isDeliveryRelated || isNPSRelated) {
          const accessKey = channel?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY");
          const mbChannelId = channel?.channel_id || Deno.env.get("MESSAGEBIRD_CHANNEL_ID");
          const firstName = (contactName || "").split(" ")[0] || "amigo";

          if (isNPSRelated) {
            // === RESPOSTA AO TEMPLATE DE AVALIAÇÃO ===
            console.log(`⭐ Feedback de avaliação recebido de ${contactName}: "${messageContent}"`);
            const thankYouMsg = `Muito obrigada pelo seu feedback, ${firstName}! 💛 Sua opinião é muito importante pra gente. Conte sempre com a gente!`;

            try {
              const mbResp = await fetch("https://conversations.messagebird.com/v1/send", {
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

            // Atualizar pipeline card com sentimento positivo se elogio
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

          } else {
            // === CONFIRMAÇÃO DE ENTREGA (saiu_para_entrega, entregue, aguardando_retirada) ===
            console.log(`🎉 Confirmação de entrega detectada! Trigger: ${hsmTriggerKey}, Contato: ${contactName}`);
            const positiveMsg = `Que bom que chegou, ${firstName}! 😊 Ficamos felizes! Se precisar de algo, é só chamar.`;

            try {
              const mbResp = await fetch("https://conversations.messagebird.com/v1/send", {
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

            // DISPARAR TEMPLATE DE AVALIAÇÃO
            const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
            const nomeRemetente = hsmVars.nome_remetente || "";
            fetch(`${supabaseUrl}/functions/v1/send-whatsapp-template`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
              },
              body: JSON.stringify({
                trigger_key: "avaliacao",
                phone: normalizedPhone,
                variables: {
                  nome_destinatario: contactName,
                  codigo_rastreio: trackingCode,
                  nome_remetente: nomeRemetente,
                },
              }),
            }).then(r => r.text()).catch(e => console.warn("⚠️ Erro ao disparar avaliação:", e));
            console.log(`📊 Avaliação agendada para ${normalizedPhone} (${trackingCode})`);
          }
        }

        // Fechar conversa
        await supabase
          .from("whatsapp_conversations")
          .update({ ai_enabled: false, status: "closed" })
          .eq("id", conversation.id);
        conversation.ai_enabled = false;
        // Fechar tickets e pipeline (non-rastreio)
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

    if (shouldCallAI) {
      try {
        // === DEBOUNCE: esperar 3s e verificar se chegaram msgs mais novas ===
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data: newerMsgs } = await supabase
          .from("whatsapp_messages")
          .select("id")
          .eq("conversation_id", conversation.id)
          .eq("direction", "inbound")
          .gt("created_at", new Date(Date.now() - 2500).toISOString())
          .neq("messagebird_id", messageBirdId || "")
          .limit(1);
        
        if (newerMsgs && newerMsgs.length > 0) {
          console.log("⏭️ DEBOUNCE: mensagem mais nova detectada, pulando AI para esta:", messageBirdId);
        } else {
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