// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Token não fornecido");
      return new Response(
        JSON.stringify({ error: "Token de autenticação não fornecido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    
    // Decodifica o JWT sem verificar assinatura (a assinatura foi feita pelo sistema externo)
    let payload: any;
    try {
      const [, payloadBase64] = token.split(".");
      const payloadJson = atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"));
      payload = JSON.parse(payloadJson);
      console.log("JWT payload decodificado:", JSON.stringify(payload));
    } catch (e) {
      console.error("Erro ao decodificar JWT:", e);
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extrai cliente_id do payload
    const clienteId = payload.clienteId || payload.sub || payload.id;
    if (!clienteId) {
      console.error("cliente_id não encontrado no token");
      return new Response(
        JSON.stringify({ error: "Cliente ID não encontrado no token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cliente ID extraído:", clienteId);

    // Criar cliente Supabase com service_role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...body } = await req.json();
    console.log("Ação solicitada:", action, "Body:", JSON.stringify(body));

    let result;

    switch (action) {
      case "create": {
        const { plataforma, credenciais, remetenteId } = body;
        const webhookUrl = `${supabaseUrl}/functions/v1/nuvemshop-webhook`;

        const { data, error } = await supabase
          .from("integracoes")
          .insert({
            cliente_id: clienteId,
            plataforma,
            credenciais,
            remetente_id: remetenteId || null,
            ativo: true,
            webhook_url: webhookUrl,
          })
          .select()
          .single();

        if (error) {
          console.error("Erro ao criar integração:", error);
          throw error;
        }

        console.log("Integração criada:", data.id);
        result = { message: "Integração criada com sucesso!", data };
        break;
      }

      case "update": {
        const { id, credenciais, remetenteId, ativo } = body;

        const updateData: any = {};
        if (credenciais !== undefined) updateData.credenciais = credenciais;
        if (remetenteId !== undefined) updateData.remetente_id = remetenteId;
        if (ativo !== undefined) updateData.ativo = ativo;

        const { data, error } = await supabase
          .from("integracoes")
          .update(updateData)
          .eq("id", id)
          .eq("cliente_id", clienteId) // Garante que só atualiza do próprio cliente
          .select()
          .single();

        if (error) {
          console.error("Erro ao atualizar integração:", error);
          throw error;
        }

        console.log("Integração atualizada:", id);
        result = { message: "Integração atualizada com sucesso!", data };
        break;
      }

      case "delete": {
        const { id } = body;

        const { error } = await supabase
          .from("integracoes")
          .delete()
          .eq("id", id)
          .eq("cliente_id", clienteId); // Garante que só deleta do próprio cliente

        if (error) {
          console.error("Erro ao deletar integração:", error);
          throw error;
        }

        console.log("Integração deletada:", id);
        result = { message: "Integração removida com sucesso!" };
        break;
      }

      case "list": {
        const { plataforma } = body;

        let query = supabase
          .from("integracoes")
          .select("*")
          .eq("cliente_id", clienteId)
          .order("criado_em", { ascending: false });

        if (plataforma) {
          query = query.eq("plataforma", plataforma);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Erro ao listar integrações:", error);
          throw error;
        }

        console.log("Integrações encontradas:", data?.length || 0);
        result = { message: "Integrações carregadas", data: data || [] };
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro na função gerenciar-integracoes:", error);
    return new Response(
      JSON.stringify({ error: error?.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
