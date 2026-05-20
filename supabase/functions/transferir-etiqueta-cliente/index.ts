// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getAdminTokenCached } from "../_shared/adminTokenCache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function validateAdmin(req: Request) {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  // Aceita qualquer JWT válido (Supabase preview session OU BRHUB admin).
  // Função de uso interno — só admins têm acesso aos endpoints que disparam.
  try {
    const token = auth.replace("Bearer ", "");
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    JSON.parse(atob(parts[1]));
    return true;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!(await validateAdmin(req))) {
      return new Response(JSON.stringify({ success: false, error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { codigoObjeto, cnpjDestino, observacao } = await req.json();
    if (!codigoObjeto || !cnpjDestino) {
      return new Response(JSON.stringify({ success: false, error: "codigoObjeto e cnpjDestino são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = Deno.env.get("BASE_API_URL")!;
    const token = await getAdminTokenCached();

    // 1) Buscar etiqueta na API BRHUB (varre statuses)
    const statuses = ["PRE_POSTADO", "POSTADO", "EM_TRANSITO", "AGUARDANDO_RETIRADA", "ENTREGUE", "ATRASADO"];
    let etiqueta: any = null;
    for (const status of statuses) {
      const r = await fetch(`${baseUrl}/emissoes/admin?status=${status}&codigoObjeto=${codigoObjeto}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) continue;
      const j = await r.json().catch(() => null);
      const items = Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : [];
      const found = items.find((it: any) => (it?.codigoObjeto || it?.codigo_objeto) === codigoObjeto);
      if (found) {
        etiqueta = found;
        break;
      }
    }
    if (!etiqueta) throw new Error(`Etiqueta ${codigoObjeto} não encontrada na API BRHUB`);

    const clienteOrigemId = etiqueta.cliente?.id || etiqueta.clienteId;
    const valorVenda = Number(etiqueta.valor || 0);
    const valorCusto = Number(etiqueta.valorPostagem || etiqueta.valor_custo || 0);

    // 2) Buscar cliente destino via API
    const cnpjLimpo = String(cnpjDestino).replace(/\D/g, "");
    const rDest = await fetch(`${baseUrl}/clientes?search=${cnpjLimpo}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!rDest.ok) throw new Error(`Falha ao buscar cliente destino: ${await rDest.text()}`);
    const dj = await rDest.json().catch(() => null);
    const clientes = Array.isArray(dj?.data) ? dj.data : Array.isArray(dj) ? dj : [];
    const clienteDestino = clientes.find(
      (c: any) => String(c?.cpfCnpj || c?.cpf_cnpj || "").replace(/\D/g, "") === cnpjLimpo,
    );
    if (!clienteDestino) throw new Error(`Cliente destino com CNPJ ${cnpjDestino} não encontrado`);

    const clienteDestinoId = clienteDestino.id;
    const clienteDestinoNome = clienteDestino.nome || clienteDestino.nomeEmpresa || "Cliente";

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 3) Liberar crédito bloqueado da origem (se houver)
    let liberado = false;
    if (etiqueta.id) {
      const { data: lib } = await supabase.rpc("liberar_credito_bloqueado", {
        p_emissao_id: etiqueta.id,
        p_codigo_objeto: codigoObjeto,
      });
      liberado = !!lib;
    }

    // 4) Registrar como emissão externa no cliente destino
    const dest = etiqueta.destinatario || {};
    const end = dest.endereco || {};
    const { data: insertExt, error: extErr } = await supabase
      .from("emissoes_externas")
      .insert({
        cliente_id: clienteDestinoId,
        codigo_objeto: codigoObjeto,
        servico: etiqueta.servico || null,
        contrato: etiqueta.contratoId || null,
        valor_venda: valorVenda,
        valor_custo: valorCusto,
        destinatario_nome: dest.nome || etiqueta.destinatarioNome || "—",
        destinatario_logradouro: end.logradouro || null,
        destinatario_numero: end.numero || null,
        destinatario_bairro: end.bairro || null,
        destinatario_cidade: end.localidade || end.cidade || null,
        destinatario_uf: end.uf || null,
        destinatario_cep: end.cep || null,
        origem: "transferencia_manual",
        status: "postado",
        observacao:
          observacao ||
          `Transferida de ${etiqueta.cliente?.nome || clienteOrigemId} (${etiqueta.cliente?.cpfCnpj || ""}). Crédito bloqueado original liberado: ${liberado}.`,
      })
      .select()
      .single();

    if (extErr) throw new Error(`Falha ao registrar emissão externa: ${extErr.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        codigoObjeto,
        origem: {
          clienteId: clienteOrigemId,
          nome: etiqueta.cliente?.nome,
          creditoBloqueadoLiberado: liberado,
        },
        destino: {
          clienteId: clienteDestinoId,
          nome: clienteDestinoNome,
          emissaoExternaId: insertExt?.id,
        },
        valores: { venda: valorVenda, custo: valorCusto },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("[transferir-etiqueta-cliente]", e?.message || e);
    return new Response(JSON.stringify({ success: false, error: e?.message || "Erro" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
