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
      ad_advertisers: {
        Row: {
          archived: boolean
          contact_email: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          name: string
          notes: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          name: string
          notes?: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          contact_email?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          name?: string
          notes?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_campaigns: {
        Row: {
          advertiser_id: string
          alt_text: string
          budget_cents: number | null
          clicks_total: number
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          image_mobile_path: string | null
          image_path: string
          impressions_total: number
          max_impressions: number | null
          name: string
          placement_key: string
          revenue_type: string
          starts_at: string
          status: string
          target_url: string
          updated_at: string
          weight: number
        }
        Insert: {
          advertiser_id: string
          alt_text: string
          budget_cents?: number | null
          clicks_total?: number
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          image_mobile_path?: string | null
          image_path: string
          impressions_total?: number
          max_impressions?: number | null
          name: string
          placement_key: string
          revenue_type?: string
          starts_at: string
          status?: string
          target_url: string
          updated_at?: string
          weight?: number
        }
        Update: {
          advertiser_id?: string
          alt_text?: string
          budget_cents?: number | null
          clicks_total?: number
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          image_mobile_path?: string | null
          image_path?: string
          impressions_total?: number
          max_impressions?: number | null
          name?: string
          placement_key?: string
          revenue_type?: string
          starts_at?: string
          status?: string
          target_url?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "ad_advertisers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_campaigns_placement_key_fkey"
            columns: ["placement_key"]
            isOneToOne: false
            referencedRelation: "ad_placements"
            referencedColumns: ["key"]
          },
        ]
      }
      ad_event_dedupe: {
        Row: {
          campaign_id: string
          kind: string
          visitor_hash: string
          window_start: string
        }
        Insert: {
          campaign_id: string
          kind: string
          visitor_hash: string
          window_start: string
        }
        Update: {
          campaign_id?: string
          kind?: string
          visitor_hash?: string
          window_start?: string
        }
        Relationships: []
      }
      ad_lead_recipients: {
        Row: {
          added_by: string | null
          created_at: string
          user_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          user_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ad_leads: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          interest: string
          message: string
          name: string
          phone: string
          status: string
        }
        Insert: {
          company?: string
          created_at?: string
          email: string
          id?: string
          interest?: string
          message: string
          name: string
          phone?: string
          status?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          interest?: string
          message?: string
          name?: string
          phone?: string
          status?: string
        }
        Relationships: []
      }
      ad_notify_log: {
        Row: {
          created_at: string
          error: string | null
          id: number
          kind: string
          request_id: number | null
          status_code: number | null
          timed_out: boolean | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: number
          kind: string
          request_id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: number
          kind?: string
          request_id?: number | null
          status_code?: number | null
          timed_out?: boolean | null
        }
        Relationships: []
      }
      ad_notify_settings: {
        Row: {
          enabled: boolean
          id: boolean
          sender_email: string | null
          sender_name: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: boolean
          sender_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: boolean
          sender_email?: string | null
          sender_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      ad_placements: {
        Row: {
          adsense_enabled: boolean
          adsense_slot: string | null
          description: string
          desktop_height: number
          desktop_width: number
          enabled: boolean
          key: string
          mobile_height: number
          mobile_width: number
          name: string
          sort: number
        }
        Insert: {
          adsense_enabled?: boolean
          adsense_slot?: string | null
          description?: string
          desktop_height: number
          desktop_width: number
          enabled?: boolean
          key: string
          mobile_height: number
          mobile_width: number
          name: string
          sort?: number
        }
        Update: {
          adsense_enabled?: boolean
          adsense_slot?: string | null
          description?: string
          desktop_height?: number
          desktop_width?: number
          enabled?: boolean
          key?: string
          mobile_height?: number
          mobile_width?: number
          name?: string
          sort?: number
        }
        Relationships: []
      }
      ad_settings: {
        Row: {
          adsense_client: string | null
          adsense_enabled: boolean
          id: boolean
          in_feed_interval: number
          updated_at: string
        }
        Insert: {
          adsense_client?: string | null
          adsense_enabled?: boolean
          id?: boolean
          in_feed_interval?: number
          updated_at?: string
        }
        Update: {
          adsense_client?: string | null
          adsense_enabled?: boolean
          id?: boolean
          in_feed_interval?: number
          updated_at?: string
        }
        Relationships: []
      }
      ad_stats_daily: {
        Row: {
          campaign_id: string
          clicks: number
          day: string
          impressions: number
          placement_key: string
        }
        Insert: {
          campaign_id: string
          clicks?: number
          day: string
          impressions?: number
          placement_key: string
        }
        Update: {
          campaign_id?: string
          clicks?: number
          day?: string
          impressions?: number
          placement_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_stats_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          cor: string | null
          created_at: string
          emoji: string
          id: string
          mostrar_filtros_classificacao: boolean
          nome: string
          ordem: number
          parent_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string
          emoji?: string
          id?: string
          mostrar_filtros_classificacao?: boolean
          nome: string
          ordem?: number
          parent_id?: string | null
        }
        Update: {
          cor?: string | null
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
          slug: string
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
          slug?: string
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
          slug?: string
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
      super_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notas: {
        Row: {
          content: string
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          updated_at?: string
          user_id?: string
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
      admin_delete_user: { Args: { _user_id: string }; Returns: undefined }
      ads_html_escape: { Args: { _s: string }; Returns: string }
      ads_notify_delete: {
        Args: { _ids?: number[]; _kind?: string; _result?: string }
        Returns: number
      }
      ads_notify_history: {
        Args: { _kind?: string; _limit?: number; _result?: string }
        Returns: Json
      }
      ads_notify_log_matches: {
        Args: {
          _kind: string
          _result: string
          l: Database["public"]["Tables"]["ad_notify_log"]["Row"]
        }
        Returns: boolean
      }
      ads_notify_status: { Args: never; Returns: Json }
      ads_notify_sync_log: { Args: never; Returns: undefined }
      ads_response_message: {
        Args: { _content: string; _error: string }
        Returns: string
      }
      ads_send_lead_email: {
        Args: {
          _company: string
          _interest: string
          _kind: string
          _name: string
        }
        Returns: string
      }
      ads_send_test_notification: { Args: never; Returns: string }
      get_ads_for_placement: {
        Args: { _count?: number; _placement: string }
        Returns: {
          advertiser_name: string
          alt_text: string
          id: string
          image_mobile_path: string
          image_path: string
          revenue_type: string
          target_url: string
        }[]
      }
      get_my_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_parceiro_config: { Args: never; Returns: Json }
      get_parceiros_for_slot: {
        Args: { _count?: number; _slot: string }
        Returns: {
          advertiser_name: string
          alt_text: string
          id: string
          image_mobile_path: string
          image_path: string
          revenue_type: string
          target_url: string
        }[]
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
      is_ads_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      record_ad_event: {
        Args: {
          _campaign_id: string
          _kind: string
          _placement: string
          _session: string
        }
        Returns: boolean
      }
      record_parceiro_event: {
        Args: {
          _campaign_id: string
          _kind: string
          _placement: string
          _session: string
        }
        Returns: boolean
      }
      slugify: { Args: { _text: string }; Returns: string }
      submit_ad_lead: {
        Args: {
          _company: string
          _consent: boolean
          _elapsed_ms: number
          _email: string
          _honeypot: string
          _interest: string
          _message: string
          _name: string
          _phone: string
        }
        Returns: string
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
