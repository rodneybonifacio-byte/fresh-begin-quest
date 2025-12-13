// @ts-nocheck
/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Salt fixo para hash de senhas - deve ser o mesmo do parceiro-auth
const PASSWORD_SALT = 'BRHUB_SALT_2024';

// Hash de senha usando SHA-256 (mesmo algoritmo do parceiro-auth)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + PASSWORD_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return encode(new Uint8Array(hashBuffer));
}

// Verificar se já é um hash (base64 de 44 caracteres)
function isAlreadyHashed(value: string): boolean {
  // Hash SHA-256 em base64 tem exatamente 44 caracteres e termina com =
  return value.length === 44 && /^[A-Za-z0-9+/]+=*$/.test(value);
}

// 🔒 Função para validar se o usuário é admin
async function validateAdminAccess(req: Request): Promise<{ isAdmin: boolean; error?: string }> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    return { isAdmin: false, error: 'Token de autorização não fornecido' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  try {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(atob(payloadBase64));
    
    console.log('🔐 Validando acesso admin...');
    
    const isAdmin = payload.role === 'admin' || 
                    payload.role === 'ADMIN' ||
                    payload.isAdmin === true || 
                    payload.user_metadata?.role === 'admin' ||
                    payload.app_metadata?.role === 'admin';
    
    if (isAdmin) {
      console.log('✅ Usuário é admin (via JWT claims)');
      return { isAdmin: true };
    }
    
    const adminEmail = Deno.env.get('API_ADMIN_EMAIL');
    if (payload.email === adminEmail) {
      console.log('✅ Usuário é admin (via email)');
      return { isAdmin: true };
    }
    
    console.log('❌ Usuário não tem permissão de admin');
    return { isAdmin: false, error: 'Acesso negado: permissão de administrador necessária' };
    
  } catch (error) {
    console.error('❌ Erro ao validar token:', error);
    return { isAdmin: false, error: 'Token inválido' };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 🔒 Validar acesso admin
    const { isAdmin, error: authError } = await validateAdminAccess(req);
    
    if (!isAdmin) {
      console.error('🚫 Acesso negado:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError || 'Acesso negado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔐 Iniciando migração de senhas para hash SHA-256 com salt fixo...');

    // Buscar todos os parceiros
    const { data: parceiros, error: fetchError } = await supabase
      .from('parceiros')
      .select('id, email, senha_hash');

    if (fetchError) {
      console.error('❌ Erro ao buscar parceiros:', fetchError);
      throw new Error('Erro ao buscar parceiros');
    }

    if (!parceiros || parceiros.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum parceiro encontrado', migrated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Total de parceiros: ${parceiros.length}`);

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const parceiro of parceiros) {
      try {
        // Verificar se já é hash
        if (isAlreadyHashed(parceiro.senha_hash)) {
          console.log(`⏭️ Parceiro ${parceiro.email} já tem senha hasheada`);
          skipped++;
          continue;
        }

        // Fazer hash da senha plaintext
        const hashedPassword = await hashPassword(parceiro.senha_hash);

        // Atualizar no banco
        const { error: updateError } = await supabase
          .from('parceiros')
          .update({ senha_hash: hashedPassword })
          .eq('id', parceiro.id);

        if (updateError) {
          console.error(`❌ Erro ao atualizar parceiro ${parceiro.email}:`, updateError);
          errors.push(`${parceiro.email}: ${updateError.message}`);
          continue;
        }

        console.log(`✅ Senha migrada: ${parceiro.email}`);
        migrated++;
      } catch (err) {
        console.error(`❌ Erro ao processar parceiro ${parceiro.email}:`, err);
        errors.push(`${parceiro.email}: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    }

    console.log(`🎉 Migração concluída: ${migrated} migradas, ${skipped} já hasheadas, ${errors.length} erros`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Migração de senhas concluída',
        total: parceiros.length,
        migrated,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});