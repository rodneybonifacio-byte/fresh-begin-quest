import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar JWT customizado do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Token não fornecido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decodificar JWT para verificar role
    const parts = token.split(".");
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(atob(parts[1]));
    if (payload.role !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Acesso restrito a administradores" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar expiração com grace period de 24h para sessões admin longas
    const gracePeriodMs = 24 * 60 * 60 * 1000;
    if (payload.exp && (payload.exp * 1000 + gracePeriodMs) < Date.now()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, table, select, data, id, filters, orderBy, limit } = await req.json();

    const allowedTables = [
      "ai_agents",
      "ai_tools",
      "ai_providers",
      "ai_interaction_logs",
      "ai_support_pipeline",
      "ai_tool_phone_rules",
      "whatsapp_notification_templates",
      "whatsapp_channels",
      "whatsapp_conversations",
      "whatsapp_messages",
      "whatsapp_tickets",
    ];

    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: "Tabela não permitida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result;

    switch (action) {
      case "select": {
        const buildQuery = () => {
          let q = supabase.from(table).select(select || "*");
          if (filters) {
            for (const f of filters) {
              if (f.op === "eq") q = q.eq(f.column, f.value);
              else if (f.op === "gte") q = q.gte(f.column, f.value);
              else if (f.op === "lte") q = q.lte(f.column, f.value);
              else if (f.op === "neq") q = q.neq(f.column, f.value);
              else if (f.op === "in") q = q.in(f.column, f.value);
              else if (f.op === "like") q = q.like(f.column, f.value);
              else if (f.op === "ilike") q = q.ilike(f.column, f.value);
              else if (f.op === "not") {
                const [operator, rawValue] = String(f.value).split(".");
                q = q.not(f.column, operator, rawValue === "null" ? null : rawValue);
              }
              else if (f.op === "is") q = q.is(f.column, f.value);
              else if (f.op === "or") q = q.or(String(f.value));
            }
          }
          if (orderBy) {
            q = q.order(orderBy.column, { ascending: orderBy.ascending ?? true });
          }
          return q;
        };

        if (limit) {
          result = await buildQuery().limit(limit);
        } else {
          // Auto-paginate to bypass Supabase 1000-row default limit
          const pageSize = 1000;
          const maxRows = 100000;
          const all: any[] = [];
          let from = 0;
          let pageErr: any = null;
          while (from < maxRows) {
            const { data: pageData, error } = await buildQuery().range(from, from + pageSize - 1);
            if (error) { pageErr = error; break; }
            if (!pageData || pageData.length === 0) break;
            all.push(...pageData);
            if (pageData.length < pageSize) break;
            from += pageSize;
          }
          result = pageErr ? { data: null, error: pageErr } as any : { data: all, error: null } as any;
        }
        break;
      }

      case "update": {
        if (!id) {
          return new Response(JSON.stringify({ error: "ID obrigatório para update" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await supabase.from(table).update(data).eq("id", id);
        break;
      }

      case "insert": {
        result = await supabase.from(table).insert(data).select();
        break;
      }

      case "delete": {
        if (!id) {
          return new Response(JSON.stringify({ error: "ID obrigatório para delete" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        result = await supabase.from(table).delete().eq("id", id);
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Ação inválida" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ data: result.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Erro ai-management:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
