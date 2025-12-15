import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Cria um cliente Supabase com JWT customizado
 */
export function getSupabaseWithAuth(): SupabaseClient<Database> {
  // O app usa JWT customizado; em alguns fluxos ele é salvo como `token` e em outros como `accessToken`.
  // Se não enviarmos esse JWT, as policies/funções no backend enxergam role=anon e negam acesso.
  const token = localStorage.getItem('token') || localStorage.getItem('accessToken');

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
