

interface Filter {
  column: string;
  op: "eq" | "gte" | "lte" | "neq" | "in" | "like" | "ilike" | "not" | "is" | "or";
  value: string | number | boolean | null | Array<string | number | boolean>;
}

interface OrderBy {
  column: string;
  ascending?: boolean;
}

interface AiManagementRequest {
  action: "select" | "update" | "insert" | "delete";
  table: string;
  select?: string;
  data?: Record<string, any>;
  id?: string;
  filters?: Filter[];
  orderBy?: OrderBy;
  limit?: number;
}

export async function aiManagementQuery<T = any>(params: AiManagementRequest): Promise<T[]> {
  const token = localStorage.getItem("token");

  if (!token || token.split(".").length !== 3) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  // Chamada direta via fetch para evitar que o supabase-js injete o Authorization
  // da sessão GoTrue (anon key) sobre o nosso JWT BRHUB.
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-management`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  if (data?.error) throw new Error(data.error);
  return data?.data ?? [];
}

export async function aiManagementUpdate(
  table: string,
  id: string,
  updates: Record<string, any>
): Promise<void> {
  await aiManagementQuery({
    action: "update",
    table,
    id,
    data: updates,
  });
}
