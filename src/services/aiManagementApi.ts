import { supabase } from "@/integrations/supabase/client";

interface Filter {
  column: string;
  op: "eq" | "gte" | "neq";
  value: string | number | boolean;
}

interface OrderBy {
  column: string;
  ascending?: boolean;
}

interface AiManagementRequest {
  action: "select" | "update" | "insert" | "delete";
  table: string;
  data?: Record<string, any>;
  id?: string;
  filters?: Filter[];
  orderBy?: OrderBy;
  limit?: number;
}

export async function aiManagementQuery<T = any>(params: AiManagementRequest): Promise<T[]> {
  const token = localStorage.getItem("token");
  
  const { data, error } = await supabase.functions.invoke("ai-management", {
    body: params,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (error) throw new Error(error.message || "Erro na requisição");
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
