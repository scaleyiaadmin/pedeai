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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      Pedidos: {
        Row: {
          created_at: string
          id: number
          itens: string | null
          mesa: string | null
          quantidade: string | null
          restaurante_id: string | null
          status: string | null
          Subtotal: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          itens?: string | null
          mesa?: string | null
          quantidade?: string | null
          restaurante_id?: string | null
          status?: string | null
          Subtotal?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          itens?: string | null
          mesa?: string | null
          quantidade?: string | null
          restaurante_id?: string | null
          status?: string | null
          Subtotal?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Pedidos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "Restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      Produtos: {
        Row: {
          created_at: string
          id: number
          nome: string | null
          preco: string | null
          restaurante_id: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          nome?: string | null
          preco?: string | null
          restaurante_id?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          nome?: string | null
          preco?: string | null
          restaurante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Produtos_restaurante_id_fkey"
            columns: ["restaurante_id"]
            isOneToOne: false
            referencedRelation: "Restaurantes"
            referencedColumns: ["id"]
          },
        ]
      }
      Restaurantes: {
        Row: {
          created_at: string
          email: string | null
          horario_fecha_cozinha: string | null
          id: string
          nome: string | null
          quantidade_max_mesas: string | null
          quantidade_mesas: string | null
          senha: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          horario_fecha_cozinha?: string | null
          id?: string
          nome?: string | null
          quantidade_max_mesas?: string | null
          quantidade_mesas?: string | null
          senha?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          horario_fecha_cozinha?: string | null
          id?: string
          nome?: string | null
          quantidade_max_mesas?: string | null
          quantidade_mesas?: string | null
          senha?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      Usuários: {
        Row: {
          created_at: string
          id: number
          id_restaurante: string | null
          mesa_atual: string | null
          nome: string | null
          quantas_vezes_foi: string | null
          telefone: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          id_restaurante?: string | null
          mesa_atual?: string | null
          nome?: string | null
          quantas_vezes_foi?: string | null
          telefone?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          id_restaurante?: string | null
          mesa_atual?: string | null
          nome?: string | null
          quantas_vezes_foi?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_restaurant_owner: {
        Args: { restaurant_uuid: string }
        Returns: boolean
      }
      owns_order_restaurant: {
        Args: { order_restaurante_id: string }
        Returns: boolean
      }
      owns_product_restaurant: {
        Args: { product_restaurante_id: string }
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
