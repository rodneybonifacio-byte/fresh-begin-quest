// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const baseUrl = Deno.env.get('BASE_API_URL');
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    const adminPassword = Deno.env.get('API_ADMIN_PASSWORD');

    const loginRes = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    });
    const loginData = await loginRes.json();
    const token = loginData?.token || loginData?.data?.token;

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch just 2 items to inspect raw structure
    const resp = await fetch(`${baseUrl}/emissoes/admin?limit=2&offset=0&status=ENTREGUE`, { headers });
    const data = await resp.json();
    const items = data?.data || [];

    return new Response(JSON.stringify({ rawItems: items }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
