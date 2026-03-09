import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { normalizeBrazilianPhone, phoneVariants } from "../_shared/normalize-phone.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trigger_key, phone, variables }: {
      trigger_key: string;
      phone: string;
      variables: Record<string, string>;
    } = await req.json();

    if (!trigger_key || !phone) {
      return new Response(
        JSON.stringify({ error: "trigger_key and phone are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch template config
    const { data: template, error: tErr } = await supabase
      .from("whatsapp_notification_templates")
      .select("*")
      .eq("trigger_key", trigger_key)
      .eq("is_active", true)
      .single();

    if (tErr || !template) {
      console.log(`Template '${trigger_key}' not found or inactive`);
      return new Response(
        JSON.stringify({ error: "Template not found or inactive", trigger_key }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve channel
    let channelId: string;
    let accessKey: string;

    if (template.channel_id) {
      const { data: ch } = await supabase
        .from("whatsapp_channels")
        .select("channel_id, access_key")
        .eq("id", template.channel_id)
        .single();

      if (ch) {
        channelId = ch.channel_id;
        accessKey = ch.access_key;
      } else {
        const { data: def } = await supabase
          .from("whatsapp_channels")
          .select("channel_id, access_key")
          .eq("is_default", true)
          .single();
        channelId = def?.channel_id || Deno.env.get("MESSAGEBIRD_CHANNEL_ID")!;
        accessKey = def?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
      }
    } else {
      const { data: def } = await supabase
        .from("whatsapp_channels")
        .select("channel_id, access_key")
        .eq("is_default", true)
        .single();
      channelId = def?.channel_id || Deno.env.get("MESSAGEBIRD_CHANNEL_ID")!;
      accessKey = def?.access_key || Deno.env.get("MESSAGEBIRD_ACCESS_KEY")!;
    }

    // Normalize phone using shared function
    const normalizedPhone = normalizeBrazilianPhone(phone);

    // Build template components with variables grouped by component_type
    const templateVars = (template.variables || []) as {
      key: string;
      label: string;
      system_field?: string;
      component_type?: string;
      component_var_index?: number;
      button_position?: number;
      button_sub_type?: string;
      media_type?: string;
    }[];

    // Group variables by component type
    const headerVars = templateVars.filter(v => v.component_type === 'HEADER');
    const bodyVars = templateVars.filter(v => v.component_type === 'BODY' || !v.component_type);
    const buttonVars = templateVars.filter(v => v.component_type === 'BUTTONS');

    // Sanitizar nome_remetente genérico — tentar resolver nome real via DB
    if (variables.nome_remetente) {
      const nomeRem = variables.nome_remetente.trim().toLowerCase();
      const isGenerico = nomeRem === 'remetente' || nomeRem === 'loja' || nomeRem === '' || nomeRem.length < 2;
      
      if (isGenerico) {
        let resolved = false;
        const codigoRastreio = variables.codigo_rastreio || variables.tracking_code || "";
        
        if (codigoRastreio) {
          try {
            // Buscar remetente via pedidos_importados
            const { data: pedido } = await supabase
              .from("pedidos_importados")
              .select("remetente_id, cliente_id")
              .eq("codigo_rastreio", codigoRastreio)
              .limit(1)
              .maybeSingle();
            
            let remetenteId = pedido?.remetente_id;
            let clienteId = pedido?.cliente_id;

            if (!remetenteId) {
              // Fallback: emissoes_externas
              const { data: emissao } = await supabase
                .from("emissoes_externas")
                .select("remetente_id, cliente_id")
                .eq("codigo_objeto", codigoRastreio)
                .limit(1)
                .maybeSingle();
              remetenteId = emissao?.remetente_id;
              clienteId = clienteId || emissao?.cliente_id;
            }

            // Tentar resolver pelo remetente_id
            if (remetenteId) {
              const { data: rem } = await supabase.from("remetentes").select("nome").eq("id", remetenteId).single();
              if (rem?.nome && rem.nome.trim().length > 2 && rem.nome.toLowerCase() !== 'remetente') {
                variables.nome_remetente = rem.nome.trim();
                resolved = true;
                console.log(`✅ nome_remetente resolvido via remetente_id: ${variables.nome_remetente}`);
              }
            }

            // Fallback: buscar qualquer remetente do cliente
            if (!resolved && clienteId) {
              const { data: rems } = await supabase
                .from("remetentes")
                .select("nome")
                .eq("cliente_id", clienteId)
                .limit(1)
                .maybeSingle();
              if (rems?.nome && rems.nome.trim().length > 2 && rems.nome.toLowerCase() !== 'remetente') {
                variables.nome_remetente = rems.nome.trim();
                resolved = true;
                console.log(`✅ nome_remetente resolvido via cliente_id: ${variables.nome_remetente}`);
              }
            }
          } catch (lookupErr) {
            console.warn('⚠️ Erro ao resolver nome_remetente:', lookupErr);
          }
        }
        if (!resolved) {
          variables.nome_remetente = 'Loja';
          console.log('⚠️ nome_remetente genérico substituído por "Loja"');
        }
      }
    }

    const resolveVar = (v: { system_field?: string; key: string; media_type?: string }) => {
      // Check if this is a media variable (image/video/document)
      if (v.media_type === 'image') {
        const url = variables[v.system_field || v.key] || variables[v.key] || "";
        return {
          type: "image",
          image: { link: url },
        };
      }
      return {
        type: "text",
        text: variables[v.system_field || v.key] || variables[v.key] || "",
      };
    };

    const components: any[] = [];

    // Header component parameters
    if (headerVars.length > 0) {
      // Check if any header var is a media type
      const hasMediaHeader = headerVars.some((v: any) => v.media_type === 'image');
      if (hasMediaHeader) {
        components.push({
          type: "header",
          parameters: headerVars.map((v: any) => resolveVar(v)),
        });
      } else {
        components.push({
          type: "header",
          parameters: headerVars.map((v: any) => resolveVar(v)),
        });
      }
    }

    // Body component parameters
    if (bodyVars.length > 0) {
      components.push({
        type: "body",
        parameters: bodyVars.map(resolveVar),
      });
    }

    // Button component parameters - use button_position (0-based) for the index
    if (buttonVars.length > 0) {
      // Group button vars by their actual button position (0-based)
      const buttonGroups: Record<number, { vars: typeof buttonVars; sub_type: string }> = {};
      buttonVars.forEach(v => {
        // Use button_position if available, otherwise fall back to component_var_index - 1 (convert from 1-based to 0-based)
        const btnPos = v.button_position !== undefined && v.button_position !== null
          ? v.button_position
          : Math.max(0, (v.component_var_index || 1) - 1);
        if (!buttonGroups[btnPos]) {
          buttonGroups[btnPos] = { vars: [], sub_type: v.button_sub_type || 'url' };
        }
        buttonGroups[btnPos].vars.push(v);
      });

      Object.entries(buttonGroups).forEach(([btnIdx, { vars, sub_type }]) => {
        components.push({
          type: "button",
          sub_type: sub_type,
          index: parseInt(btnIdx),
          parameters: vars.map(resolveVar),
        });
      });
    }

    // Build MessageBird HSM payload
    const payload: any = {
      to: normalizedPhone,
      from: channelId,
      type: "hsm",
      content: {
        hsm: {
          namespace: template.template_namespace || "",
          templateName: template.template_name,
          language: {
            policy: "deterministic",
            code: template.template_language,
          },
          components,
        },
      },
    };

    console.log(`Sending template '${template.template_name}' to ${normalizedPhone}`, JSON.stringify(components));

    const response = await fetch("https://conversations.messagebird.com/v1/send", {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${accessKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("MessageBird error:", JSON.stringify(result));
      return new Response(
        JSON.stringify({ error: "Failed to send template", details: result }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Template sent successfully: ${result.id}`);

    // Render template body text with variables for chat display
    let renderedBody = '';
    if (template.template_body) {
      try {
        const bodyData = JSON.parse(template.template_body);
        // Replace {{1}}, {{2}}, etc. with actual variable values
        const orderedVars = templateVars
          .filter(v => v.component_type === 'BODY' || !v.component_type)
          .sort((a, b) => (a.component_var_index || 0) - (b.component_var_index || 0));
        
        let text = bodyData.body || '';
        orderedVars.forEach((v, i) => {
          const val = variables[v.system_field || v.key] || variables[v.key] || '';
          text = text.replace(`{{${i + 1}}}`, val);
        });
        
        // Also render header
        let headerText = bodyData.header || '';
        const orderedHeaderVars = templateVars
          .filter(v => v.component_type === 'HEADER')
          .sort((a, b) => (a.component_var_index || 0) - (b.component_var_index || 0));
        orderedHeaderVars.forEach((v, i) => {
          const val = variables[v.system_field || v.key] || variables[v.key] || '';
          headerText = headerText.replace(`{{${i + 1}}}`, val);
        });

        renderedBody = JSON.stringify({
          header: headerText,
          body: text,
          footer: bodyData.footer || '',
          buttons: bodyData.buttons || [],
        });
      } catch (e) {
        console.warn('Error rendering template body:', e);
      }
    }

    // Save HSM message to whatsapp_messages for conversation history
    // Find or create conversation for this phone
    // Find or create conversation for this phone (search all variants)
    const phoneLookupVariants = phoneVariants(normalizedPhone);
    let { data: existingConv } = await supabase
      .from("whatsapp_conversations")
      .select("id")
      .in("contact_phone", phoneLookupVariants)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .single();

    // Se não existe conversa, criar uma nova
    if (!existingConv) {
      const contactName = variables.nome_destinatario || variables.recipient_name || normalizedPhone;
      console.log(`📝 Criando conversa para ${normalizedPhone} (${contactName})`);

      // Resolver canal padrão
      const { data: defaultChannel } = await supabase
        .from("whatsapp_channels")
        .select("id, ai_enabled")
        .eq("is_default", true)
        .single();

      const { data: newConv, error: convCreateErr } = await supabase
        .from("whatsapp_conversations")
        .insert({
          contact_phone: normalizedPhone,
          contact_name: contactName,
          whatsapp_channel_id: defaultChannel?.id || null,
          status: "open",
          last_message_at: new Date().toISOString(),
          last_message_preview: `📋 ${template.trigger_label}`,
          unread_count: 0,
          ai_enabled: defaultChannel?.ai_enabled ?? true,
        })
        .select("id")
        .single();

      if (convCreateErr) {
        console.error("❌ Erro ao criar conversa:", convCreateErr);
      } else {
        existingConv = newConv;
        console.log(`✅ Conversa criada: ${newConv.id}`);
      }
    }

    if (existingConv) {
      await supabase.from("whatsapp_messages").insert({
        conversation_id: existingConv.id,
        messagebird_id: result.id || null,
        direction: "outbound",
        content_type: "hsm",
        content: `📋 Template: ${template.template_name}`,
        media_url: null,
        status: "sent",
        sent_by: "system",
        ai_generated: false,
        metadata: {
          hsm: true,
          template_name: template.template_name,
          trigger_key: template.trigger_key,
          trigger_label: template.trigger_label,
          variables: variables || {},
          rendered_body: renderedBody || null,
        },
      });

      // Update conversation last message + contact name if missing
      const contactName = variables.nome_destinatario || variables.recipient_name || "";
      const convUpdate: Record<string, any> = {
        last_message_at: new Date().toISOString(),
        last_message_preview: `📋 ${template.trigger_label}`,
      };

      // Atualizar nome do contato se atualmente é apenas o número ou está vazio
      if (contactName && contactName.length > 1) {
        // Buscar conversa atual para checar se o nome precisa ser atualizado
        const { data: currentConv } = await supabase
          .from("whatsapp_conversations")
          .select("contact_name")
          .eq("id", existingConv.id)
          .single();

        const currentName = currentConv?.contact_name || "";
        const isNameMissing = !currentName 
          || currentName === normalizedPhone 
          || /^\d+$/.test(currentName)
          || currentName.length < 2;

        if (isNameMissing) {
          convUpdate.contact_name = contactName;
          console.log(`📝 Atualizando nome do contato: "${currentName}" → "${contactName}"`);
        }
      }

      // Se for atraso, Felipe assume automaticamente a conversa
      if (trigger_key === "atraso") {
        convUpdate.active_agent = "felipe";
        console.log(`🔄 Auto-assign Felipe para conversa ${existingConv.id} (atraso detectado)`);
      }

      await supabase
        .from("whatsapp_conversations")
        .update(convUpdate)
        .eq("id", existingConv.id);

      // === Pipeline automático: criar/atualizar card baseado no trigger ===
      const triggerToPipelineStage: Record<string, { category: string; status: string }> = {
        etiqueta_criada: { category: "rastreio", status: "verificando" },
        objeto_postado: { category: "rastreio", status: "em_transito" },
        saiu_para_entrega: { category: "rastreio", status: "em_transito" },
        atraso: { category: "rastreio", status: "localizado" },
        aguardando_retirada: { category: "rastreio", status: "localizado" },
        retirada_agencia: { category: "rastreio", status: "localizado" },
        avaliacao: { category: "elogio", status: "recebido" },
      };

      const pipelineMapping = triggerToPipelineStage[trigger_key];
      if (pipelineMapping) {
        const codigoRastreio = variables.codigo_rastreio || variables.tracking_code || "";
        const nomeDestinatario = variables.nome_destinatario || variables.recipient_name || "";
        const nomeRemetente = variables.nome_remetente || variables.sender_name || "";
        const dataPrevisao = variables.data_previsao || variables.data_previsao_entrega || "";

        // Check if card already exists for this conversation (same object/conversation)
        const { data: existingCard } = await supabase
          .from("ai_support_pipeline")
          .select("id, status, category")
          .eq("conversation_id", existingConv.id)
          .eq("category", "rastreio")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingCard) {
          // Update existing card to new stage (only advance, don't go backwards)
          const stageOrder = ["verificando", "localizado", "em_transito", "entregue"];
          const currentIdx = stageOrder.indexOf(existingCard.status);
          const newIdx = stageOrder.indexOf(pipelineMapping.status);

          if (newIdx > currentIdx || pipelineMapping.category !== "rastreio") {
            await supabase
              .from("ai_support_pipeline")
              .update({
                status: pipelineMapping.status,
                category: pipelineMapping.category,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existingCard.id);
            console.log(`Pipeline card ${existingCard.id} updated to ${pipelineMapping.category}/${pipelineMapping.status}`);
          }
        } else {
          // Create new pipeline card
          const { error: pipeErr } = await supabase
            .from("ai_support_pipeline")
            .insert({
              conversation_id: existingConv.id,
              contact_phone: normalizedPhone,
              contact_name: nomeDestinatario,
              category: pipelineMapping.category,
              status: pipelineMapping.status,
              priority: trigger_key === "atraso" ? "alta" : "normal",
              subject: codigoRastreio
                ? `Rastreio ${codigoRastreio}`
                : `${template.trigger_label}`,
              description: `Notificação automática: ${template.trigger_label}${nomeRemetente ? ` | Remetente: ${nomeRemetente}` : ""}${codigoRastreio ? ` | Código: ${codigoRastreio}` : ""}${dataPrevisao ? ` | Previsão de entrega: ${dataPrevisao}` : ""}`,
              detected_by: "notificacao_ativa",
              sentiment: trigger_key === "avaliacao" ? "positivo" : "neutro",
            });

          if (pipeErr) {
            console.error("Error creating pipeline card:", pipeErr);
          } else {
            console.log(`Pipeline card created: ${pipelineMapping.category}/${pipelineMapping.status} for ${normalizedPhone}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: result.id, trigger_key }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
