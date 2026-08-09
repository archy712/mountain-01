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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          anon_id: string | null
          created_at: string
          event: string
          id: string
          mountain_id: string | null
          props: Json | null
        }
        Insert: {
          anon_id?: string | null
          created_at?: string
          event: string
          id?: string
          mountain_id?: string | null
          props?: Json | null
        }
        Update: {
          anon_id?: string | null
          created_at?: string
          event?: string
          id?: string
          mountain_id?: string | null
          props?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      api_logs: {
        Row: {
          created_at: string
          error_kind: string | null
          id: string
          latency_ms: number | null
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_kind?: string | null
          id?: string
          latency_ms?: number | null
          source: string
          status: string
        }
        Update: {
          created_at?: string
          error_kind?: string | null
          id?: string
          latency_ms?: number | null
          source?: string
          status?: string
        }
        Relationships: []
      }
      condition_scores: {
        Row: {
          breakdown: Json
          calc_version: string
          computed_at: string
          grade: string
          id: string
          mountain_id: string
          score: number
        }
        Insert: {
          breakdown?: Json
          calc_version: string
          computed_at?: string
          grade: string
          id?: string
          mountain_id: string
          score: number
        }
        Update: {
          breakdown?: Json
          calc_version?: string
          computed_at?: string
          grade?: string
          id?: string
          mountain_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "condition_scores_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          mountain_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mountain_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mountain_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      mountains: {
        Row: {
          altitude: number | null
          created_at: string
          grid_nx: number
          grid_ny: number
          id: string
          lat: number
          lng: number
          name: string
          region: string
        }
        Insert: {
          altitude?: number | null
          created_at?: string
          grid_nx: number
          grid_ny: number
          id?: string
          lat: number
          lng: number
          name: string
          region: string
        }
        Update: {
          altitude?: number | null
          created_at?: string
          grid_nx?: number
          grid_ny?: number
          id?: string
          lat?: number
          lng?: number
          name?: string
          region?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      search_logs: {
        Row: {
          created_at: string
          id: string
          mountain_id: string | null
          query: string
        }
        Insert: {
          created_at?: string
          id?: string
          mountain_id?: string | null
          query: string
        }
        Update: {
          created_at?: string
          id?: string
          mountain_id?: string | null
          query?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
      trails: {
        Row: {
          closed_period: string | null
          closed_reason: string | null
          come_minutes: number | null
          created_at: string
          difficulty: number | null
          distance_m: number | null
          go_minutes: number | null
          id: string
          mountain_id: string
          name: string
          path_geojson: Json | null
          segment: string | null
          status: string
        }
        Insert: {
          closed_period?: string | null
          closed_reason?: string | null
          come_minutes?: number | null
          created_at?: string
          difficulty?: number | null
          distance_m?: number | null
          go_minutes?: number | null
          id?: string
          mountain_id: string
          name: string
          path_geojson?: Json | null
          segment?: string | null
          status?: string
        }
        Update: {
          closed_period?: string | null
          closed_reason?: string | null
          come_minutes?: number | null
          created_at?: string
          difficulty?: number | null
          distance_m?: number | null
          go_minutes?: number | null
          id?: string
          mountain_id?: string
          name?: string
          path_geojson?: Json | null
          segment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trails_mountain_id_fkey"
            columns: ["mountain_id"]
            isOneToOne: false
            referencedRelation: "mountains"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
