import { supabase } from './client';

/**
 * Configura o token JWT customizado no Supabase client
 * Isso permite que as políticas RLS funcionem corretamente com JWT customizado
 */
export const setSupabaseCustomToken = async () => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.warn('⚠️ Token customizado não encontrado');
    return;
  }

  try {
    // Define o token customizado como uma "sessão" do Supabase
    // Isso permite que as políticas RLS extraiam o clienteId do JWT
    await supabase.auth.setSession({
      access_token: token,
      refresh_token: '' // Não usado no sistema customizado
    });
    
    console.log('✅ Token customizado configurado no Supabase');
  } catch (error) {
    console.error('❌ Erro ao configurar token no Supabase:', error);
  }
};

/**
 * Remove o token do Supabase
 */
export const clearSupabaseToken = async () => {
  try {
    await supabase.auth.signOut();
    console.log('✅ Token removido do Supabase');
  } catch (error) {
    console.error('❌ Erro ao remover token do Supabase:', error);
  }
};
