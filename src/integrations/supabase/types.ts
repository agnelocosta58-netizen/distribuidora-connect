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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts_payable: {
        Row: {
          categoria: string | null
          company_id: string
          created_at: string
          descricao: string
          id: string
          pago_em: string | null
          status: Database["public"]["Enums"]["ap_status"]
          supplier_id: string | null
          updated_at: string
          valor: number
          valor_pago: number
          vencimento: string
        }
        Insert: {
          categoria?: string | null
          company_id: string
          created_at?: string
          descricao: string
          id?: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["ap_status"]
          supplier_id?: string | null
          updated_at?: string
          valor: number
          valor_pago?: number
          vencimento: string
        }
        Update: {
          categoria?: string | null
          company_id?: string
          created_at?: string
          descricao?: string
          id?: string
          pago_em?: string | null
          status?: Database["public"]["Enums"]["ap_status"]
          supplier_id?: string | null
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          descricao: string
          id: string
          pago_em: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["ar_status"]
          updated_at: string
          valor: number
          valor_pago: number
          vencimento: string
        }
        Insert: {
          company_id: string
          created_at?: string
          customer_id?: string | null
          descricao: string
          id?: string
          pago_em?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["ar_status"]
          updated_at?: string
          valor: number
          valor_pago?: number
          vencimento: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          descricao?: string
          id?: string
          pago_em?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["ar_status"]
          updated_at?: string
          valor?: number
          valor_pago?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_receivable_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          company_id: string
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_movements: {
        Row: {
          cash_register_id: string
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          tipo: Database["public"]["Enums"]["cash_move_type"]
          user_id: string | null
          valor: number
        }
        Insert: {
          cash_register_id: string
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: Database["public"]["Enums"]["cash_move_type"]
          user_id?: string | null
          valor: number
        }
        Update: {
          cash_register_id?: string
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: Database["public"]["Enums"]["cash_move_type"]
          user_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "cash_movements_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_registers: {
        Row: {
          aberto_em: string
          company_id: string
          fechado_em: string | null
          id: string
          observacao: string | null
          status: Database["public"]["Enums"]["cash_status"]
          user_id: string
          valor_abertura: number
          valor_fechamento: number | null
        }
        Insert: {
          aberto_em?: string
          company_id: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["cash_status"]
          user_id: string
          valor_abertura?: number
          valor_fechamento?: number | null
        }
        Update: {
          aberto_em?: string
          company_id?: string
          fechado_em?: string | null
          id?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["cash_status"]
          user_id?: string
          valor_abertura?: number
          valor_fechamento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_registers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          company_id: string
          cor: string | null
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          company_id: string
          cor?: string | null
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          cor?: string | null
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cep: string | null
          cidade: string | null
          cnpj: string | null
          cor_primaria: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          logo_url: string | null
          nome: string
          pix_chave: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          pix_chave?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          cor_primaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          pix_chave?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          bairro: string | null
          cidade: string | null
          company_id: string
          cpf_cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          limite_credito: number
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cidade?: string | null
          company_id: string
          cpf_cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cidade?: string | null
          company_id?: string
          cpf_cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          limite_credito?: number
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          ativo: boolean
          brand_id: string | null
          category_id: string | null
          codigo_barras: string | null
          company_id: string
          created_at: string
          descricao: string | null
          estoque: number
          estoque_minimo: number
          id: string
          imagem_url: string | null
          nome: string
          preco_custo: number
          preco_venda: number
          supplier_id: string | null
          tamanho: string | null
          unidade: string | null
          updated_at: string
          validade: string | null
          volume: string | null
        }
        Insert: {
          ativo?: boolean
          brand_id?: string | null
          category_id?: string | null
          codigo_barras?: string | null
          company_id: string
          created_at?: string
          descricao?: string | null
          estoque?: number
          estoque_minimo?: number
          id?: string
          imagem_url?: string | null
          nome: string
          preco_custo?: number
          preco_venda?: number
          supplier_id?: string | null
          tamanho?: string | null
          unidade?: string | null
          updated_at?: string
          validade?: string | null
          volume?: string | null
        }
        Update: {
          ativo?: boolean
          brand_id?: string | null
          category_id?: string | null
          codigo_barras?: string | null
          company_id?: string
          created_at?: string
          descricao?: string | null
          estoque?: number
          estoque_minimo?: number
          id?: string
          imagem_url?: string | null
          nome?: string
          preco_custo?: number
          preco_venda?: number
          supplier_id?: string | null
          tamanho?: string | null
          unidade?: string | null
          updated_at?: string
          validade?: string | null
          volume?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean
          company_id: string | null
          cpf: string | null
          created_at: string
          email: string
          id: string
          nome: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          fim: string
          id: string
          inicio: string
          preco_promocional: number
          product_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          fim: string
          id?: string
          inicio: string
          preco_promocional: number
          product_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          fim?: string
          id?: string
          inicio?: string
          preco_promocional?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          company_id: string
          created_at: string
          desconto: number
          id: string
          nome_produto: string
          preco_unitario: number
          product_id: string
          quantidade: number
          sale_id: string
          total: number
        }
        Insert: {
          company_id: string
          created_at?: string
          desconto?: number
          id?: string
          nome_produto: string
          preco_unitario: number
          product_id: string
          quantidade: number
          sale_id: string
          total: number
        }
        Update: {
          company_id?: string
          created_at?: string
          desconto?: number
          id?: string
          nome_produto?: string
          preco_unitario?: number
          product_id?: string
          quantidade?: number
          sale_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["payment_method"]
          sale_id: string
          troco: number | null
          valor: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metodo: Database["public"]["Enums"]["payment_method"]
          sale_id: string
          troco?: number | null
          valor: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["payment_method"]
          sale_id?: string
          troco?: number | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          acrescimo: number
          cash_register_id: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          desconto: number
          id: string
          numero: number
          observacao: string | null
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          acrescimo?: number
          cash_register_id?: string | null
          company_id: string
          created_at?: string
          customer_id?: string | null
          desconto?: number
          id?: string
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          acrescimo?: number
          cash_register_id?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          desconto?: number
          id?: string
          numero?: number
          observacao?: string | null
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_register_id_fkey"
            columns: ["cash_register_id"]
            isOneToOne: false
            referencedRelation: "cash_registers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          company_id: string
          created_at: string
          id: string
          observacao: string | null
          preco_unitario: number | null
          product_id: string
          quantidade: number
          sale_id: string | null
          tipo: Database["public"]["Enums"]["stock_move_type"]
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          preco_unitario?: number | null
          product_id: string
          quantidade: number
          sale_id?: string | null
          tipo: Database["public"]["Enums"]["stock_move_type"]
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          preco_unitario?: number | null
          product_id?: string
          quantidade?: number
          sale_id?: string | null
          tipo?: Database["public"]["Enums"]["stock_move_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cnpj: string | null
          company_id: string
          created_at: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cnpj?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cnpj?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_company_id: { Args: never; Returns: string }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      ap_status: "pendente" | "parcial" | "pago" | "cancelado"
      app_role: "admin" | "gerente" | "vendedor"
      ar_status: "pendente" | "parcial" | "pago" | "cancelado"
      cash_move_type:
        | "abertura"
        | "suprimento"
        | "sangria"
        | "venda"
        | "recebimento"
        | "despesa"
        | "fechamento"
      cash_status: "aberto" | "fechado"
      payment_method: "dinheiro" | "pix" | "debito" | "credito" | "fiado"
      sale_status: "aberta" | "concluida" | "cancelada"
      stock_move_type: "entrada" | "saida" | "ajuste" | "venda" | "devolucao"
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
      ap_status: ["pendente", "parcial", "pago", "cancelado"],
      app_role: ["admin", "gerente", "vendedor"],
      ar_status: ["pendente", "parcial", "pago", "cancelado"],
      cash_move_type: [
        "abertura",
        "suprimento",
        "sangria",
        "venda",
        "recebimento",
        "despesa",
        "fechamento",
      ],
      cash_status: ["aberto", "fechado"],
      payment_method: ["dinheiro", "pix", "debito", "credito", "fiado"],
      sale_status: ["aberta", "concluida", "cancelada"],
      stock_move_type: ["entrada", "saida", "ajuste", "venda", "devolucao"],
    },
  },
} as const
