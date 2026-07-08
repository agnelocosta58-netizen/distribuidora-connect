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
      bank_integrations: {
        Row: {
          access_token: string | null
          ambiente: string
          api_key: string | null
          ativo: boolean
          client_id: string | null
          client_secret: string | null
          company_id: string
          created_at: string
          id: string
          nome: string
          provider: string
          public_key: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          access_token?: string | null
          ambiente?: string
          api_key?: string | null
          ativo?: boolean
          client_id?: string | null
          client_secret?: string | null
          company_id: string
          created_at?: string
          id?: string
          nome: string
          provider?: string
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          access_token?: string | null
          ambiente?: string
          api_key?: string | null
          ativo?: boolean
          client_id?: string | null
          client_secret?: string | null
          company_id?: string
          created_at?: string
          id?: string
          nome?: string
          provider?: string
          public_key?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_integrations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cor_primaria: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          inscricao_municipal: string | null
          logo_url: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          pix_chave: string | null
          razao_social: string | null
          regime_tributario: string | null
          responsavel: string | null
          site: string | null
          telefone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cor_primaria?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          inscricao_municipal?: string | null
          logo_url?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          pix_chave?: string | null
          razao_social?: string | null
          regime_tributario?: string | null
          responsavel?: string | null
          site?: string | null
          telefone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      cost_allocations: {
        Row: {
          company_id: string
          created_at: string
          id: string
          metodo: Database["public"]["Enums"]["allocation_method"]
          observacao: string | null
          periodo_fim: string
          periodo_inicio: string
          total_despesas: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["allocation_method"]
          observacao?: string | null
          periodo_fim: string
          periodo_inicio: string
          total_despesas?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          metodo?: Database["public"]["Enums"]["allocation_method"]
          observacao?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          total_despesas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cost_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
      expenses: {
        Row: {
          categoria: string
          company_id: string
          competencia: string
          created_at: string
          created_by: string | null
          descricao: string
          id: string
          observacao: string | null
          recorrente: boolean
          updated_at: string
          valor: number
        }
        Insert: {
          categoria: string
          company_id: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          descricao: string
          id?: string
          observacao?: string | null
          recorrente?: boolean
          updated_at?: string
          valor: number
        }
        Update: {
          categoria?: string
          company_id?: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          descricao?: string
          id?: string
          observacao?: string | null
          recorrente?: boolean
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_keys: {
        Row: {
          ativa: boolean
          banco: string | null
          chave: string
          company_id: string
          created_at: string
          id: string
          padrao: boolean
          tipo: Database["public"]["Enums"]["pix_key_type"]
          titular: string | null
          updated_at: string
        }
        Insert: {
          ativa?: boolean
          banco?: string | null
          chave: string
          company_id: string
          created_at?: string
          id?: string
          padrao?: boolean
          tipo: Database["public"]["Enums"]["pix_key_type"]
          titular?: string | null
          updated_at?: string
        }
        Update: {
          ativa?: boolean
          banco?: string | null
          chave?: string
          company_id?: string
          created_at?: string
          id?: string
          padrao?: boolean
          tipo?: Database["public"]["Enums"]["pix_key_type"]
          titular?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pix_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      pix_transactions: {
        Row: {
          company_id: string
          created_at: string
          expires_at: string | null
          id: string
          pago_em: string | null
          pix_key_id: string | null
          provider: string | null
          provider_payload: Json | null
          qr_code: string | null
          qr_code_base64: string | null
          qr_payload: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["pix_tx_status"]
          txid: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          company_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          pago_em?: string | null
          pix_key_id?: string | null
          provider?: string | null
          provider_payload?: Json | null
          qr_code?: string | null
          qr_code_base64?: string | null
          qr_payload?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pix_tx_status"]
          txid?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          company_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          pago_em?: string | null
          pix_key_id?: string | null
          provider?: string | null
          provider_payload?: Json | null
          qr_code?: string | null
          qr_code_base64?: string | null
          qr_payload?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["pix_tx_status"]
          txid?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "pix_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pix_transactions_pix_key_id_fkey"
            columns: ["pix_key_id"]
            isOneToOne: false
            referencedRelation: "pix_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_allocations: {
        Row: {
          allocation_id: string
          company_id: string
          created_at: string
          custo_real: number
          faturamento: number
          id: string
          lucro_liquido: number
          margem_real: number
          percentual: number
          product_id: string
          quantidade_vendida: number
          valor_rateado: number
        }
        Insert: {
          allocation_id: string
          company_id: string
          created_at?: string
          custo_real?: number
          faturamento?: number
          id?: string
          lucro_liquido?: number
          margem_real?: number
          percentual?: number
          product_id: string
          quantidade_vendida?: number
          valor_rateado?: number
        }
        Update: {
          allocation_id?: string
          company_id?: string
          created_at?: string
          custo_real?: number
          faturamento?: number
          id?: string
          lucro_liquido?: number
          margem_real?: number
          percentual?: number
          product_id?: string
          quantidade_vendida?: number
          valor_rateado?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_allocations_allocation_id_fkey"
            columns: ["allocation_id"]
            isOneToOne: false
            referencedRelation: "cost_allocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_allocations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_cost_allocations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          ativo: boolean
          codigo_barras: string | null
          company_id: string
          created_at: string
          estoque: number
          estoque_minimo: number
          id: string
          preco_custo: number
          preco_venda: number
          product_id: string
          temperatura: Database["public"]["Enums"]["variant_temp"]
          tipo: Database["public"]["Enums"]["variant_pack"]
          unidades_por_pacote: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo_barras?: string | null
          company_id: string
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          preco_custo?: number
          preco_venda?: number
          product_id: string
          temperatura: Database["public"]["Enums"]["variant_temp"]
          tipo: Database["public"]["Enums"]["variant_pack"]
          unidades_por_pacote?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo_barras?: string | null
          company_id?: string
          created_at?: string
          estoque?: number
          estoque_minimo?: number
          id?: string
          preco_custo?: number
          preco_venda?: number
          product_id?: string
          temperatura?: Database["public"]["Enums"]["variant_temp"]
          tipo?: Database["public"]["Enums"]["variant_pack"]
          unidades_por_pacote?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
          custo_real: number | null
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
          custo_real?: number | null
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
          custo_real?: number | null
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
          variant_id: string | null
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
          variant_id?: string | null
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
          variant_id?: string | null
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
          {
            foreignKeyName: "sale_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
          pago_em: string | null
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
          pago_em?: string | null
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
          pago_em?: string | null
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
          variant_id: string | null
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
          variant_id?: string | null
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
          variant_id?: string | null
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
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
      recompute_cost_allocation: {
        Args: { _allocation_id: string; _percent_map?: Json }
        Returns: undefined
      }
    }
    Enums: {
      allocation_method:
        | "quantidade"
        | "faturamento"
        | "categoria"
        | "percentual"
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
      pix_key_type: "cpf" | "cnpj" | "email" | "telefone" | "aleatoria"
      pix_tx_status:
        | "pendente"
        | "pago"
        | "cancelado"
        | "expirado"
        | "estornado"
      rateio_status: "aberto" | "fechado" | "cancelado"
      sale_status: "aberta" | "concluida" | "cancelada"
      stock_move_type: "entrada" | "saida" | "ajuste" | "venda" | "devolucao"
      variant_pack: "unidade" | "fardo" | "caixa"
      variant_temp: "quente" | "gelado"
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
      allocation_method: [
        "quantidade",
        "faturamento",
        "categoria",
        "percentual",
      ],
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
      pix_key_type: ["cpf", "cnpj", "email", "telefone", "aleatoria"],
      pix_tx_status: ["pendente", "pago", "cancelado", "expirado", "estornado"],
      rateio_status: ["aberto", "fechado", "cancelado"],
      sale_status: ["aberta", "concluida", "cancelada"],
      stock_move_type: ["entrada", "saida", "ajuste", "venda", "devolucao"],
      variant_pack: ["unidade", "fardo", "caixa"],
      variant_temp: ["quente", "gelado"],
    },
  },
} as const
