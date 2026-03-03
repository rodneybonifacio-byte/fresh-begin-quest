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

    // Verificar expiração
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return new Response(JSON.stringify({ error: "Token expirado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, table, data, id, filters, orderBy, limit } = await req.json();

    const allowedTables = [
      "ai_agents",
      "ai_tools",
      "ai_providers",
      "ai_interaction_logs",
      "ai_support_pipeline",
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
        let query = supabase.from(table).select("*");
        
        if (filters) {
          for (const f of filters) {
            if (f.op === "eq") query = query.eq(f.column, f.value);
            else if (f.op === "gte") query = query.gte(f.column, f.value);
            else if (f.op === "neq") query = query.neq(f.column, f.value);
          }
        }
        
        if (orderBy) {
          query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
        }
        
        if (limit) {
          query = query.limit(limit);
        }

        result = await query;
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
