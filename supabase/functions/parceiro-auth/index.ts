// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Salt fixo para hash de senhas - deve ser o mesmo usado na migração SQL
const PASSWORD_SALT = 'BRHUB_SALT_2024';

// Hash de senha usando SHA-256 (alternativa a bcrypt no Deno)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encode(new Uint8Array(hashBuffer));
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const hash = await hashPassword(password);
  return hash === storedHash;
}

// Gerar JWT para parceiro
function generateParceiroToken(parceiro: any): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    parceiroId: parceiro.id,
    email: parceiro.email,
    nome: parceiro.nome,
    role: 'parceiro',
    iat: now,
    exp: now + (24 * 60 * 60) // 24 horas
  };
  
  const base64Header = btoa(JSON.stringify(header));
  const base64Payload = btoa(JSON.stringify(payload));
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  
  // Signature simplificada (em produção usar library JWT)
  const signature = btoa(secret.slice(0, 32) + base64Payload);
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email, senha, dadosCadastro } = await req.json();
    console.log('📋 Ação de auth parceiro:', action);

    // ========== LOGIN ==========
    if (action === 'login') {
      if (!email || !senha) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email e senha são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar parceiro
      const { data: parceiro, error: findError } = await supabase
        .from('parceiros')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (findError || !parceiro) {
        console.log('❌ Parceiro não encontrado:', email);
        return new Response(
          JSON.stringify({ success: false, error: 'Email ou senha incorretos' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar senha
      const senhaCorreta = await verifyPassword(senha, parceiro.senha_hash);
      
      if (!senhaCorreta) {
        console.log('❌ Senha incorreta para:', email);
        return new Response(
          JSON.stringify({ success: false, error: 'Email ou senha incorretos' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar status
      if (parceiro.status !== 'aprovado') {
        console.log('❌ Parceiro não aprovado:', email, parceiro.status);
        return new Response(
          JSON.stringify({ success: false, error: 'Sua conta ainda não foi aprovada. Aguarde a validação.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Gerar token
      const token = generateParceiroToken(parceiro);
      
      console.log('✅ Login de parceiro bem-sucedido:', email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          token,
          parceiro: {
            id: parceiro.id,
            nome: parceiro.nome,
            email: parceiro.email,
            codigo_parceiro: parceiro.codigo_parceiro,
            link_indicacao: parceiro.link_indicacao,
            status: parceiro.status
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== REGISTRO ==========
    if (action === 'registro') {
      if (!dadosCadastro) {
        return new Response(
          JSON.stringify({ success: false, error: 'Dados de cadastro são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { nome, email, cpfCnpj, telefone, senha, chavePix } = dadosCadastro;

      // Validar campos obrigatórios
      if (!nome || !email || !cpfCnpj || !telefone || !senha) {
        return new Response(
          JSON.stringify({ success: false, error: 'Todos os campos são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se email já existe
      const { data: existingEmail } = await supabase
        .from('parceiros')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (existingEmail) {
        return new Response(
          JSON.stringify({ success: false, error: 'Email já cadastrado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar se CPF/CNPJ já existe
      const { data: existingCpf } = await supabase
        .from('parceiros')
        .select('id')
        .eq('cpf_cnpj', cpfCnpj.replace(/\D/g, ''))
        .single();

      if (existingCpf) {
        return new Response(
          JSON.stringify({ success: false, error: 'CPF/CNPJ já cadastrado' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Gerar código de parceiro único
      const codigoParceiro = nome
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10) + Math.random().toString(36).slice(2, 6);

      // Hash da senha
      const senhaHash = await hashPassword(senha);

      // Inserir parceiro
      const { data: novoParceiro, error: insertError } = await supabase
        .from('parceiros')
        .insert({
          nome,
          email: email.toLowerCase().trim(),
          cpf_cnpj: cpfCnpj.replace(/\D/g, ''),
          telefone: telefone.replace(/\D/g, ''),
          senha_hash: senhaHash,
          chave_pix: chavePix || null,
          codigo_parceiro: codigoParceiro,
          link_indicacao: `https://brhubenvios.com.br/cadastro?ref=${codigoParceiro}`,
          status: 'pendente'
        })
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao cadastrar parceiro:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao cadastrar parceiro' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('✅ Parceiro cadastrado com sucesso:', email);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Cadastro realizado com sucesso! Aguarde a aprovação.' 
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Ação não reconhecida: ' + action);

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});