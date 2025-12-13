import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const { nome, email, cpf_cnpj, telefone, senha, chave_pix } = body;

    // Validações
    if (!nome || !email || !cpf_cnpj || !telefone || !senha) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios não preenchidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se email já existe
    const { data: existingEmail } = await supabase
      .from('parceiros')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email já cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se CPF/CNPJ já existe
    const cleanCpfCnpj = cpf_cnpj.replace(/\D/g, '');
    const { data: existingCpf } = await supabase
      .from('parceiros')
      .select('id')
      .eq('cpf_cnpj', cleanCpfCnpj)
      .maybeSingle();

    if (existingCpf) {
      return new Response(
        JSON.stringify({ success: false, error: 'CPF/CNPJ já cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar código do parceiro único
    const slugNome = nome
      .toUpperCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join('-');
    
    let codigoParceiro = `BRHUB-${slugNome}`;
    
    // Verificar se código já existe e adicionar sufixo se necessário
    const { data: existingCode } = await supabase
      .from('parceiros')
      .select('id')
      .eq('codigo_parceiro', codigoParceiro)
      .maybeSingle();

    if (existingCode) {
      // Adicionar sufixo aleatório para tornar único
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      codigoParceiro = `BRHUB-${slugNome}-${randomSuffix}`;
    }
    
    // Hash da senha (simples para parceiros - SHA256)
    const encoder = new TextEncoder();
    const data = encoder.encode(senha + 'brhub_salt_2024');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const senhaHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Link de indicação
    const baseUrl = 'https://www.brhubenvios.com.br';
    const linkIndicacao = `${baseUrl}/cadastro-cliente?ref=${codigoParceiro.toLowerCase()}`;

    // Inserir parceiro
    const { data: parceiro, error: insertError } = await supabase
      .from('parceiros')
      .insert({
        nome: nome.toUpperCase(),
        email: email.toLowerCase(),
        cpf_cnpj: cleanCpfCnpj,
        telefone: telefone.replace(/\D/g, ''),
        senha_hash: senhaHash,
        codigo_parceiro: codigoParceiro,
        link_indicacao: linkIndicacao,
        chave_pix: chave_pix || null,
        status: 'pendente'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir parceiro:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao criar cadastro. Tente novamente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parceiro cadastrado com sucesso:', parceiro.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Cadastro realizado com sucesso!',
        parceiro: {
          id: parceiro.id,
          nome: parceiro.nome,
          email: parceiro.email,
          codigo_parceiro: parceiro.codigo_parceiro
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no registro:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
