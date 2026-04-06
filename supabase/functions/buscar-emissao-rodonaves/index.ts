// deno-lint-ignore-file
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response>) => void;
  env: { get: (key: string) => string | undefined };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { codigoObjeto } = await req.json();
    
    const baseApiUrl = Deno.env.get('BASE_API_URL') || 'https://envios.brhubb.com.br/api';
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    // Login admin
    const loginResp = await fetch(`${baseApiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    
    const loginData = await loginResp.json();
    const token = loginData.token || loginData.data?.token || loginData.accessToken;
    
    if (!token) {
      throw new Error('Falha no login admin');
    }

    // Buscar emissão pelo código
    const emissaoResp = await fetch(`${baseApiUrl}/emissoes/admin?codigoObjeto=${codigoObjeto}&size=5`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const emissaoData = await emissaoResp.json();
    
    // Buscar faturas do cliente NEXX
    const faturaResp = await fetch(`${baseApiUrl}/faturas/admin?clienteId=c620629a-0f6f-4cfc-9bef-3a8bdbd122eb&status=PENDENTE&size=10`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    const faturaData = await faturaResp.json();

    return new Response(JSON.stringify({
      emissao: emissaoData,
      faturas: faturaData,
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
