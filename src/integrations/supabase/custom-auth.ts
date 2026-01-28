import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Obtém o token JWT do usuário autenticado
 */
function getAuthToken(): string | null {
  // Tenta obter do localStorage (várias possíveis chaves)
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
  
  if (token) {
    return token;
  }
  
  // Fallback: tentar obter do sessionStorage
  const sessionToken = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
  
  return sessionToken || null;
}

/**
 * Cria um cliente Supabase com JWT customizado
 */
export function getSupabaseWithAuth(): SupabaseClient<Database> {
  const token = getAuthToken();

  if (!token) {
    console.warn('[getSupabaseWithAuth] Nenhum token de autenticação encontrado');
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    },
  });
}
