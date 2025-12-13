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
      audit_integracoes_access: {
        Row: {
          accessed_at: string | null
          action: string
          cliente_id: string
          id: string
          integracao_id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          cliente_id: string
          id?: string
          integracao_id: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          cliente_id?: string
          id?: string
          integracao_id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      cadastros_origem: {
        Row: {
          cliente_id: string
          created_at: string
          email_cliente: string | null
          id: string
          nome_cliente: string | null
          origem: string
          telefone_cliente: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          email_cliente?: string | null
          id?: string
          nome_cliente?: string | null
          origem?: string
          telefone_cliente?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          email_cliente?: string | null
          id?: string
          nome_cliente?: string | null
          origem?: string
          telefone_cliente?: string | null
        }
        Relationships: []
      }
      clientes_indicados: {
        Row: {
          cliente_email: string | null
          cliente_id: string
          cliente_nome: string | null
          comissao_gerada: number | null
          consumo_total: number | null
          data_associacao: string
          id: string
          parceiro_id: string
          status: string | null
          ultima_atividade: string | null
        }
        Insert: {
          cliente_email?: string | null
          cliente_id: string
          cliente_nome?: string | null
          comissao_gerada?: number | null
          consumo_total?: number | null
          data_associacao?: string
          id?: string
          parceiro_id: string
          status?: string | null
          ultima_atividade?: string | null
        }
        Update: {
          cliente_email?: string | null
          cliente_id?: string
          cliente_nome?: string | null
          comissao_gerada?: number | null
          consumo_total?: number | null
          data_associacao?: string
          id?: string
          parceiro_id?: string
          status?: string | null
          ultima_atividade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_indicados_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      comissoes_conecta: {
        Row: {
          cliente_id: string
          codigo_objeto: string | null
          comissao_calculada: number
          created_at: string
          etiqueta_id: string | null
          id: string
          margem_liquida: number
          mes_referencia: string | null
          parceiro_id: string
          percentual_comissao: number | null
          status: string | null
          valor_custo_frete: number
          valor_total_frete: number
        }
        Insert: {
          cliente_id: string
          codigo_objeto?: string | null
          comissao_calculada: number
          created_at?: string
          etiqueta_id?: string | null
          id?: string
          margem_liquida: number
          mes_referencia?: string | null
          parceiro_id: string
          percentual_comissao?: number | null
          status?: string | null
          valor_custo_frete: number
          valor_total_frete: number
        }
        Update: {
          cliente_id?: string
          codigo_objeto?: string | null
          comissao_calculada?: number
          created_at?: string
          etiqueta_id?: string | null
          id?: string
          margem_liquida?: number
          mes_referencia?: string | null
          parceiro_id?: string
          percentual_comissao?: number | null
          status?: string | null
          valor_custo_frete?: number
          valor_total_frete?: number
        }
        Relationships: [
          {
            foreignKeyName: "comissoes_conecta_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      contador_cadastros: {
        Row: {
          ativo: boolean
          contador: number
          created_at: string
          id: string
          limite: number
          tipo: string
          updated_at: string
          valor_premio: number
        }
        Insert: {
          ativo?: boolean
          contador?: number
          created_at?: string
          id?: string
          limite?: number
          tipo?: string
          updated_at?: string
          valor_premio?: number
        }
        Update: {
          ativo?: boolean
          contador?: number
          created_at?: string
          id?: string
          limite?: number
          tipo?: string
          updated_at?: string
          valor_premio?: number
        }
        Relationships: []
      }
      emissoes_em_atraso: {
        Row: {
          cliente_id: string | null
          codigo_objeto: string
          data_previsao_entrega: string | null
          destinatario_nome: string | null
          detectado_em: string
          emissao_id: string
          id: string
          remetente_nome: string | null
          servico: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo_objeto: string
          data_previsao_entrega?: string | null
          destinatario_nome?: string | null
          detectado_em?: string
          emissao_id: string
          id?: string
          remetente_nome?: string | null
          servico?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo_objeto?: string
          data_previsao_entrega?: string | null
          destinatario_nome?: string | null
          detectado_em?: string
          emissao_id?: string
          id?: string
          remetente_nome?: string | null
          servico?: string | null
        }
        Relationships: []
      }
      etiquetas_pendentes_correcao: {
        Row: {
          altura: number | null
          atualizado_em: string | null
          cliente_id: string
          comprimento: number | null
          criado_em: string | null
          destinatario_bairro: string | null
          destinatario_celular: string | null
          destinatario_cep: string
          destinatario_cidade: string | null
          destinatario_complemento: string | null
          destinatario_cpf_cnpj: string | null
          destinatario_estado: string | null
          destinatario_logradouro: string | null
          destinatario_nome: string
          destinatario_numero: string | null
          id: string
          largura: number | null
          linha_original: number | null
          motivo_erro: string
          observacao: string | null
          peso: number | null
          remetente_cpf_cnpj: string
          remetente_nome: string | null
          servico_frete: string | null
          tentativas_correcao: number | null
          valor_declarado: number | null
          valor_frete: number | null
        }
        Insert: {
          altura?: number | null
          atualizado_em?: string | null
          cliente_id: string
          comprimento?: number | null
          criado_em?: string | null
          destinatario_bairro?: string | null
          destinatario_celular?: string | null
          destinatario_cep: string
          destinatario_cidade?: string | null
          destinatario_complemento?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_estado?: string | null
          destinatario_logradouro?: string | null
          destinatario_nome: string
          destinatario_numero?: string | null
          id?: string
          largura?: number | null
          linha_original?: number | null
          motivo_erro: string
          observacao?: string | null
          peso?: number | null
          remetente_cpf_cnpj: string
          remetente_nome?: string | null
          servico_frete?: string | null
          tentativas_correcao?: number | null
          valor_declarado?: number | null
          valor_frete?: number | null
        }
        Update: {
          altura?: number | null
          atualizado_em?: string | null
          cliente_id?: string
          comprimento?: number | null
          criado_em?: string | null
          destinatario_bairro?: string | null
          destinatario_celular?: string | null
          destinatario_cep?: string
          destinatario_cidade?: string | null
          destinatario_complemento?: string | null
          destinatario_cpf_cnpj?: string | null
          destinatario_estado?: string | null
          destinatario_logradouro?: string | null
          destinatario_nome?: string
          destinatario_numero?: string | null
          id?: string
          largura?: number | null
          linha_original?: number | null
          motivo_erro?: string
          observacao?: string | null
          peso?: number | null
          remetente_cpf_cnpj?: string
          remetente_nome?: string | null
          servico_frete?: string | null
          tentativas_correcao?: number | null
          valor_declarado?: number | null
          valor_frete?: number | null
        }
        Relationships: []
      }
      fechamentos_fatura: {
        Row: {
          boleto_id: string | null
          boleto_pdf: string | null
          codigo_fatura: string
          cpf_cnpj: string | null
          created_at: string
          data_pagamento: string | null
          fatura_id: string
          fatura_pdf: string | null
          id: string
          nome_cliente: string
          nosso_numero: string | null
          pdf_url: string | null
          status_pagamento: string | null
          subfatura_id: string | null
          valor_pago: number | null
        }
        Insert: {
          boleto_id?: string | null
          boleto_pdf?: string | null
          codigo_fatura: string
          cpf_cnpj?: string | null
          created_at?: string
          data_pagamento?: string | null
          fatura_id: string
          fatura_pdf?: string | null
          id?: string
          nome_cliente: string
          nosso_numero?: string | null
          pdf_url?: string | null
          status_pagamento?: string | null
          subfatura_id?: string | null
          valor_pago?: number | null
        }
        Update: {
          boleto_id?: string | null
          boleto_pdf?: string | null
          codigo_fatura?: string
          cpf_cnpj?: string | null
          created_at?: string
          data_pagamento?: string | null
          fatura_id?: string
          fatura_pdf?: string | null
          id?: string
          nome_cliente?: string
          nosso_numero?: string | null
          pdf_url?: string | null
          status_pagamento?: string | null
          subfatura_id?: string | null
          valor_pago?: number | null
        }
        Relationships: []
      }
      integracoes: {
        Row: {
          ativo: boolean | null
          atualizado_em: string
          cliente_id: string
          credenciais: Json
          criado_em: string
          id: string
          plataforma: string
          remetente_id: string | null
          store_id: string | null
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string
          cliente_id: string
          credenciais: Json
          criado_em?: string
          id?: string
          plataforma: string
          remetente_id?: string | null
          store_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string
          cliente_id?: string
          credenciais?: Json
          criado_em?: string
          id?: string
          plataforma?: string
          remetente_id?: string | null
          store_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      logs_acesso: {
        Row: {
          action: string
          cliente_id: string
          created_at: string
          id: string
          ip_address: string | null
          user_agent: string | null
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          action?: string
          cliente_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          cliente_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_name?: string | null
        }
        Relationships: []
      }
      notificacoes_aguardando_retirada: {
        Row: {
          codigo_objeto: string
          created_at: string
          destinatario_celular: string | null
          destinatario_nome: string | null
          id: string
          notificado_em: string
          remetente_nome: string | null
          webhook_response: string | null
        }
        Insert: {
          codigo_objeto: string
          created_at?: string
          destinatario_celular?: string | null
          destinatario_nome?: string | null
          id?: string
          notificado_em?: string
          remetente_nome?: string | null
          webhook_response?: string | null
        }
        Update: {
          codigo_objeto?: string
          created_at?: string
          destinatario_celular?: string | null
          destinatario_nome?: string | null
          id?: string
          notificado_em?: string
          remetente_nome?: string | null
          webhook_response?: string | null
        }
        Relationships: []
      }
      pagamentos_parceiros: {
        Row: {
          comprovante_url: string | null
          created_at: string
          data_pagamento: string | null
          id: string
          mes_referencia: string
          observacao: string | null
          parceiro_id: string
          status: string | null
          valor_pago: number
        }
        Insert: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia: string
          observacao?: string | null
          parceiro_id: string
          status?: string | null
          valor_pago: number
        }
        Update: {
          comprovante_url?: string | null
          created_at?: string
          data_pagamento?: string | null
          id?: string
          mes_referencia?: string
          observacao?: string | null
          parceiro_id?: string
          status?: string | null
          valor_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_parceiros_parceiro_id_fkey"
            columns: ["parceiro_id"]
            isOneToOne: false
            referencedRelation: "parceiros"
            referencedColumns: ["id"]
          },
        ]
      }
      parceiros: {
        Row: {
          agencia: string | null
          banco: string | null
          chave_pix: string | null
          codigo_parceiro: string
          conta: string | null
          cpf_cnpj: string
          created_at: string
          email: string
          id: string
          link_indicacao: string
          nome: string
          senha_hash: string
          status: Database["public"]["Enums"]["parceiro_status"]
          telefone: string
          total_clientes_ativos: number | null
          total_comissao_acumulada: number | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          codigo_parceiro: string
          conta?: string | null
          cpf_cnpj: string
          created_at?: string
          email: string
          id?: string
          link_indicacao: string
          nome: string
          senha_hash: string
          status?: Database["public"]["Enums"]["parceiro_status"]
          telefone: string
          total_clientes_ativos?: number | null
          total_comissao_acumulada?: number | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          codigo_parceiro?: string
          conta?: string | null
          cpf_cnpj?: string
          created_at?: string
          email?: string
          id?: string
          link_indicacao?: string
          nome?: string
          senha_hash?: string
          status?: Database["public"]["Enums"]["parceiro_status"]
          telefone?: string
          total_clientes_ativos?: number | null
          total_comissao_acumulada?: number | null
          updated_at?: string
        }
        Relationships: []
      }
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
      sessoes_ativas: {
        Row: {
          cliente_id: string
          created_at: string
          id: string
          is_online: boolean | null
          last_seen: string
          user_email: string | null
          user_name: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          id?: string
          is_online?: boolean | null
          last_seen?: string
          user_email?: string | null
          user_name?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          id?: string
          is_online?: boolean | null
          last_seen?: string
          user_email?: string | null
          user_name?: string | null
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
      user_avatars: {
        Row: {
          avatar_url: string | null
          cliente_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          cliente_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          cliente_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      integracoes_safe: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          cliente_id: string | null
          credenciais_masked: Json | null
          criado_em: string | null
          id: string | null
          plataforma: string | null
          remetente_id: string | null
          store_id: string | null
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cliente_id?: string | null
          credenciais_masked?: never
          criado_em?: string | null
          id?: string | null
          plataforma?: string | null
          remetente_id?: string | null
          store_id?: string | null
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          cliente_id?: string | null
          credenciais_masked?: never
          criado_em?: string | null
          id?: string | null
          plataforma?: string | null
          remetente_id?: string | null
          store_id?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
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
      get_integracao_credenciais: {
        Args: { p_integracao_id: string }
        Returns: Json
      }
      get_parceiro_id_from_jwt: { Args: never; Returns: string }
      incrementar_contador_cadastro: { Args: never; Returns: number }
      is_admin_from_jwt: { Args: never; Returns: boolean }
      liberar_credito_bloqueado: {
        Args: { p_codigo_objeto?: string; p_emissao_id: string }
        Returns: boolean
      }
      mask_sensitive_credenciais: { Args: { creds: Json }; Returns: Json }
      registrar_recarga: {
        Args: { p_cliente_id: string; p_descricao?: string; p_valor: number }
        Returns: string
      }
      update_integracao_credenciais: {
        Args: { p_credenciais: Json; p_integracao_id: string }
        Returns: boolean
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
      verificar_elegibilidade_premio: {
        Args: never
        Returns: {
          elegivel: boolean
          limite: number
          posicao: number
          valor: number
        }[]
      }
      verificar_saldo_suficiente: {
        Args: { p_cliente_id: string; p_valor: number }
        Returns: boolean
      }
    }
    Enums: {
      parceiro_status: "pendente" | "aprovado" | "suspenso" | "cancelado"
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
    Enums: {
      parceiro_status: ["pendente", "aprovado", "suspenso", "cancelado"],
    },
  },
} as const
