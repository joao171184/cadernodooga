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
      categorias: {
        Row: {
          created_at: string
          emoji: string
          id: string
          mostrar_filtros_classificacao: boolean
          nome: string
          ordem: number
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          mostrar_filtros_classificacao?: boolean
          nome: string
          ordem?: number
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          mostrar_filtros_classificacao?: boolean
          nome?: string
          ordem?: number
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categorias_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          created_at: string
          ponto_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ponto_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          ponto_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_classificacoes: {
        Row: {
          classificacao: Database["public"]["Enums"]["classificacao_tipo"]
          ponto_id: string
        }
        Insert: {
          classificacao: Database["public"]["Enums"]["classificacao_tipo"]
          ponto_id: string
        }
        Update: {
          classificacao?: Database["public"]["Enums"]["classificacao_tipo"]
          ponto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_classificacoes_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_subcategorias: {
        Row: {
          ponto_id: string
          subcategoria: string
        }
        Insert: {
          ponto_id: string
          subcategoria: string
        }
        Update: {
          ponto_id?: string
          subcategoria?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_subcategorias_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      ponto_toque_ordem: {
        Row: {
          ordem: number
          ponto_id: string
          toque: Database["public"]["Enums"]["toque_tipo"]
          updated_at: string
        }
        Insert: {
          ordem?: number
          ponto_id: string
          toque: Database["public"]["Enums"]["toque_tipo"]
          updated_at?: string
        }
        Update: {
          ordem?: number
          ponto_id?: string
          toque?: Database["public"]["Enums"]["toque_tipo"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ponto_toque_ordem_ponto_id_fkey"
            columns: ["ponto_id"]
            isOneToOne: false
            referencedRelation: "pontos"
            referencedColumns: ["id"]
          },
        ]
      }
      pontos: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          audio: string
          categoria: string
          created_at: string
          created_by: string
          id: string
          letra: string
          nome: string
          ordem: number
          puxador: string
          status: Database["public"]["Enums"]["ponto_status"]
          toque: Database["public"]["Enums"]["toque_tipo"] | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          audio?: string
          categoria: string
          created_at?: string
          created_by: string
          id?: string
          letra: string
          nome: string
          ordem?: number
          puxador?: string
          status?: Database["public"]["Enums"]["ponto_status"]
          toque?: Database["public"]["Enums"]["toque_tipo"] | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          audio?: string
          categoria?: string
          created_at?: string
          created_by?: string
          id?: string
          letra?: string
          nome?: string
          ordem?: number
          puxador?: string
          status?: Database["public"]["Enums"]["ponto_status"]
          toque?: Database["public"]["Enums"]["toque_tipo"] | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          allowed: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          permission: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "oga" | "visitante"
      classificacao_tipo: "chamada" | "elevacao" | "sustentacao"
      ponto_status: "pending" | "approved" | "rejected"
      toque_tipo: "ijexa" | "nago" | "congo" | "barravento" | "samba"
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
      app_role: ["admin", "oga", "visitante"],
      classificacao_tipo: ["chamada", "elevacao", "sustentacao"],
      ponto_status: ["pending", "approved", "rejected"],
      toque_tipo: ["ijexa", "nago", "congo", "barravento", "samba"],
    },
  },
} as const
