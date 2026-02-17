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
      attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string | null
          date: string
          hours_worked: number | null
          id: string
          shift: string | null
          type: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date: string
          hours_worked?: number | null
          id: string
          shift?: string | null
          type?: string
          worker_id: string
          worker_name: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string | null
          date?: string
          hours_worked?: number | null
          id?: string
          shift?: string | null
          type?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      backups: {
        Row: {
          backup_data: Json
          created_at: string
          created_by: string
          id: string
        }
        Insert: {
          backup_data: Json
          created_at?: string
          created_by: string
          id: string
        }
        Update: {
          backup_data?: Json
          created_at?: string
          created_by?: string
          id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          date: string
          id: string
          name: string
          note: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          date: string
          id: string
          name: string
          note?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          id?: string
          name?: string
          note?: string | null
        }
        Relationships: []
      }
      inventory: {
        Row: {
          category: string | null
          cost_per_unit: number
          created_at: string | null
          id: string
          name: string
          quantity: number
          sell_price: number | null
          unit: string
        }
        Insert: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string | null
          id: string
          name: string
          quantity?: number
          sell_price?: number | null
          unit: string
        }
        Update: {
          category?: string | null
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          name?: string
          quantity?: number
          sell_price?: number | null
          unit?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          cost_price: number
          created_at: string | null
          id: string
          ingredients: Json | null
          name: string
          sell_price: number
        }
        Insert: {
          category?: string | null
          cost_price?: number
          created_at?: string | null
          id: string
          ingredients?: Json | null
          name: string
          sell_price?: number
        }
        Update: {
          category?: string | null
          cost_price?: number
          created_at?: string | null
          id?: string
          ingredients?: Json | null
          name?: string
          sell_price?: number
        }
        Relationships: []
      }
      returns: {
        Row: {
          created_at: string | null
          date: string
          exchange_items: Json | null
          id: string
          items: Json
          reason: string | null
          refund_amount: number
          sale_id: string
          time: string
          type: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          exchange_items?: Json | null
          id: string
          items?: Json
          reason?: string | null
          refund_amount?: number
          sale_id: string
          time: string
          type?: string
          worker_id: string
          worker_name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          exchange_items?: Json | null
          id?: string
          items?: Json
          reason?: string | null
          refund_amount?: number
          sale_id?: string
          time?: string
          type?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      returns_log: {
        Row: {
          action: string
          action_by: string
          action_date: string
          action_time: string
          created_at: string | null
          id: string
          return_record: Json
        }
        Insert: {
          action: string
          action_by: string
          action_date: string
          action_time: string
          created_at?: string | null
          id: string
          return_record: Json
        }
        Update: {
          action?: string
          action_by?: string
          action_date?: string
          action_time?: string
          created_at?: string | null
          id?: string
          return_record?: Json
        }
        Relationships: []
      }
      sales: {
        Row: {
          created_at: string | null
          date: string
          discount: Json | null
          id: string
          items: Json
          time: string
          total: number
          worker_id: string
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          date: string
          discount?: Json | null
          id: string
          items?: Json
          time: string
          total?: number
          worker_id: string
          worker_name: string
        }
        Update: {
          created_at?: string | null
          date?: string
          discount?: Json | null
          id?: string
          items?: Json
          time?: string
          total?: number
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      shift_resets: {
        Row: {
          created_at: string | null
          id: string
          report_summary: string | null
          reset_date: string
          reset_time: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          report_summary?: string | null
          reset_date: string
          reset_time: string
          worker_id: string
          worker_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_summary?: string | null
          reset_date?: string
          reset_time?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          note: string | null
          type: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          date: string
          id: string
          note?: string | null
          type: string
          worker_id: string
          worker_name: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          note?: string | null
          type?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      worker_expenses: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          id: string
          reason: string
          time: string
          worker_id: string
          worker_name: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          date: string
          id: string
          reason?: string
          time: string
          worker_id: string
          worker_name: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          id?: string
          reason?: string
          time?: string
          worker_id?: string
          worker_name?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          password: string
          role: string
          salary: number
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
          password: string
          role?: string
          salary?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          password?: string
          role?: string
          salary?: number
        }
        Relationships: []
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
