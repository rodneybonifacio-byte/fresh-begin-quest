export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      recargas_pix: {
        Row: {
          cliente_id: string
          data_criacao: string
          data_expiracao: string | null
          data_pagamento: string | null
          id: string
          pix_copia_cola: string | null
          qr_code: string | null
          qr_code_image: string | null
          status: string
          txid: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          cliente_id: string
          data_criacao?: string
          data_expiracao?: string | null
          data_pagamento?: string | null
          id?: string
          pix_copia_cola?: string | null
          qr_code?: string | null
          qr_code_image?: string | null
          status?: string
          txid: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string
          data_criacao?: string
          data_expiracao?: string | null
          data_pagamento?: string | null
          id?: string
          pix_copia_cola?: string | null
          qr_code?: string | null
          qr_code_image?: string | null
          status?: string
          txid?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
      remetentes: {
        Row: {
          atualizado_em: string | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cliente_id: string
          complemento: string | null
          cpf_cnpj: string
          criado_em: string | null
          documento_estrangeiro: string | null
          email: string | null
          id: string
          localidade: string | null
          logradouro: string | null
          nome: string
          numero: string | null
          sincronizado_em: string | null
          telefone: string | null
          uf: string | null
        }
        Insert: {
          atualizado_em?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cliente_id: string
          complemento?: string | null
          cpf_cnpj: string
          criado_em?: string | null
          documento_estrangeiro?: string | null
          email?: string | null
          id: string
          localidade?: string | null
          logradouro?: string | null
          nome: string
          numero?: string | null
          sincronizado_em?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Update: {
          atualizado_em?: string | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cliente_id?: string
          complemento?: string | null
          cpf_cnpj?: string
          criado_em?: string | null
          documento_estrangeiro?: string | null
          email?: string | null
          id?: string
          localidade?: string | null
          logradouro?: string | null
          nome?: string
          numero?: string | null
          sincronizado_em?: string | null
          telefone?: string | null
          uf?: string | null
        }
        Relationships: []
      }
      transacoes_credito: {
        Row: {
          blocked_until: string | null
          cliente_id: string
          cobrada: boolean | null
          created_at: string | null
          descricao: string | null
          emissao_id: string | null
          id: string
          liberado_em: string | null
          status: string | null
          tipo: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          blocked_until?: string | null
          cliente_id: string
          cobrada?: boolean | null
          created_at?: string | null
          descricao?: string | null
          emissao_id?: string | null
          id?: string
          liberado_em?: string | null
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          blocked_until?: string | null
          cliente_id?: string
          cobrada?: boolean | null
          created_at?: string | null
          descricao?: string | null
          emissao_id?: string | null
          id?: string
          liberado_em?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_recarga: {
        Args: {
          p_data_pagamento?: string
          p_novo_status: string
          p_recarga_id: string
        }
        Returns: boolean
      }
      bloquear_credito_etiqueta: {
        Args: {
          p_cliente_id: string
          p_codigo_objeto?: string
          p_emissao_id: string
          p_valor: number
        }
        Returns: string
      }
      buscar_etiquetas_bloqueadas: {
        Args: never
        Returns: {
          blocked_until: string
          cliente_id: string
          descricao: string
          emissao_id: string
          valor: number
        }[]
      }
      buscar_resumo_transacoes: {
        Args: {
          p_cliente_id: string
          p_data_fim?: string
          p_data_inicio?: string
        }
        Returns: {
          created_at: string
          tipo: string
          valor: number
        }[]
      }
      buscar_transacoes_cliente: {
        Args: { p_cliente_id: string; p_limit?: number }
        Returns: {
          cliente_id: string
          cobrada: boolean
          created_at: string
          descricao: string
          emissao_id: string
          id: string
          tipo: string
          updated_at: string
          valor: number
        }[]
      }
      calcular_creditos_bloqueados: {
        Args: { p_cliente_id: string }
        Returns: number
      }
      calcular_creditos_consumidos: {
        Args: { p_cliente_id: string }
        Returns: number
      }
      calcular_saldo_cliente: {
        Args: { p_cliente_id: string }
        Returns: number
      }
      calcular_saldo_disponivel: {
        Args: { p_cliente_id: string }
        Returns: number
      }
      consumir_credito_bloqueado: {
        Args: { p_codigo_objeto?: string; p_emissao_id: string }
        Returns: boolean
      }
      consumir_creditos_etiqueta: {
        Args: { p_cliente_id: string; p_emissao_id: string; p_valor: number }
        Returns: boolean
      }
      get_cliente_id_from_jwt: { Args: never; Returns: string }
      liberar_credito_bloqueado: {
        Args: { p_codigo_objeto?: string; p_emissao_id: string }
        Returns: boolean
      }
      registrar_recarga: {
        Args: { p_cliente_id: string; p_descricao?: string; p_valor: number }
        Returns: string
      }
      verificar_e_cobrar_etiqueta: {
        Args: {
          p_cliente_id: string
          p_emissao_id: string
          p_status_etiqueta: string
          p_valor: number
        }
        Returns: boolean
      }
      verificar_saldo_suficiente: {
        Args: { p_cliente_id: string; p_valor: number }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
