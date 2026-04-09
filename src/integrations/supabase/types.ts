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
      contractors: {
        Row: {
          contact: string | null
          created_at: string
          id: string
          name: string
          specialization: string | null
          user_id: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          id?: string
          name: string
          specialization?: string | null
          user_id: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          id?: string
          name?: string
          specialization?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_plans: {
        Row: {
          completed_quantity: number | null
          confirmed_by_admin: boolean | null
          constraint_log: string | null
          constraint_text: string
          created_at: string
          date: string
          day_number: number
          engineer_note: string | null
          floor_units: string[]
          id: string
          is_done: boolean | null
          planned_quantity: number
          remaining_quantity: number | null
          rov: string | null
          status: string
          supervisor_note: string | null
          unit: string
          validated_by_engineer: boolean | null
          weekly_plan_id: string
        }
        Insert: {
          completed_quantity?: number | null
          confirmed_by_admin?: boolean | null
          constraint_log?: string | null
          constraint_text?: string
          created_at?: string
          date?: string
          day_number?: number
          engineer_note?: string | null
          floor_units?: string[]
          id?: string
          is_done?: boolean | null
          planned_quantity?: number
          remaining_quantity?: number | null
          rov?: string | null
          status?: string
          supervisor_note?: string | null
          unit?: string
          validated_by_engineer?: boolean | null
          weekly_plan_id: string
        }
        Update: {
          completed_quantity?: number | null
          confirmed_by_admin?: boolean | null
          constraint_log?: string | null
          constraint_text?: string
          created_at?: string
          date?: string
          day_number?: number
          engineer_note?: string | null
          floor_units?: string[]
          id?: string
          is_done?: boolean | null
          planned_quantity?: number
          remaining_quantity?: number | null
          rov?: string | null
          status?: string
          supervisor_note?: string | null
          unit?: string
          validated_by_engineer?: boolean | null
          weekly_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_plans_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_activities: {
        Row: {
          category: string
          contractor_id: string | null
          created_at: string
          estimated_quantity: number
          floor_units: string[]
          id: string
          remaining_quantity: number
          six_week_plan_id: string
          trade: string
          trade_activity: string
          unit: string
        }
        Insert: {
          category?: string
          contractor_id?: string | null
          created_at?: string
          estimated_quantity?: number
          floor_units?: string[]
          id?: string
          remaining_quantity?: number
          six_week_plan_id: string
          trade?: string
          trade_activity?: string
          unit?: string
        }
        Update: {
          category?: string
          contractor_id?: string | null
          created_at?: string
          estimated_quantity?: number
          floor_units?: string[]
          id?: string
          remaining_quantity?: number
          six_week_plan_id?: string
          trade?: string
          trade_activity?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_activities_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_activities_six_week_plan_id_fkey"
            columns: ["six_week_plan_id"]
            isOneToOne: false
            referencedRelation: "six_week_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      six_week_plans: {
        Row: {
          building_name: string
          created_at: string
          end_date: string
          id: string
          name: string
          project_id: string
          start_date: string
        }
        Insert: {
          building_name?: string
          created_at?: string
          end_date?: string
          id?: string
          name: string
          project_id: string
          start_date?: string
        }
        Update: {
          building_name?: string
          created_at?: string
          end_date?: string
          id?: string
          name?: string
          project_id?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "six_week_plans_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string
          completed_quantity: number
          constraint_text: string
          contractor_name: string
          contractor_statement: string | null
          created_at: string
          daily_plan_id: string | null
          date: string
          id: string
          project_id: string
          recovery_deadline: string | null
          recovery_id: string
          rov: string | null
          rov_comment: string | null
          shortfall_quantity: number
          six_week_plan_id: string | null
          status: string
          target_quantity: number
          task_id: string
          trade_name: string
          unit: string
          weekly_plan_id: string | null
        }
        Insert: {
          assigned_to?: string
          completed_quantity?: number
          constraint_text?: string
          contractor_name?: string
          contractor_statement?: string | null
          created_at?: string
          daily_plan_id?: string | null
          date?: string
          id?: string
          project_id: string
          recovery_deadline?: string | null
          recovery_id?: string
          rov?: string | null
          rov_comment?: string | null
          shortfall_quantity?: number
          six_week_plan_id?: string | null
          status?: string
          target_quantity?: number
          task_id?: string
          trade_name?: string
          unit?: string
          weekly_plan_id?: string | null
        }
        Update: {
          assigned_to?: string
          completed_quantity?: number
          constraint_text?: string
          contractor_name?: string
          contractor_statement?: string | null
          created_at?: string
          daily_plan_id?: string | null
          date?: string
          id?: string
          project_id?: string
          recovery_deadline?: string | null
          recovery_id?: string
          rov?: string | null
          rov_comment?: string | null
          shortfall_quantity?: number
          six_week_plan_id?: string | null
          status?: string
          target_quantity?: number
          task_id?: string
          trade_name?: string
          unit?: string
          weekly_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_daily_plan_id_fkey"
            columns: ["daily_plan_id"]
            isOneToOne: false
            referencedRelation: "daily_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_six_week_plan_id_fkey"
            columns: ["six_week_plan_id"]
            isOneToOne: false
            referencedRelation: "six_week_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_weekly_plan_id_fkey"
            columns: ["weekly_plan_id"]
            isOneToOne: false
            referencedRelation: "weekly_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_plans: {
        Row: {
          assigned_to_engineer: boolean
          category: string
          constraint_text: string
          contractor_id: string | null
          created_at: string
          estimated_quantity: number
          floor_units: string[]
          id: string
          remaining_quantity: number
          six_week_plan_id: string
          status: string
          task_id: string | null
          trade_activity: string
          unit: string
          week_number: number
        }
        Insert: {
          assigned_to_engineer?: boolean
          category?: string
          constraint_text?: string
          contractor_id?: string | null
          created_at?: string
          estimated_quantity?: number
          floor_units?: string[]
          id?: string
          remaining_quantity?: number
          six_week_plan_id: string
          status?: string
          task_id?: string | null
          trade_activity?: string
          unit?: string
          week_number?: number
        }
        Update: {
          assigned_to_engineer?: boolean
          category?: string
          constraint_text?: string
          contractor_id?: string | null
          created_at?: string
          estimated_quantity?: number
          floor_units?: string[]
          id?: string
          remaining_quantity?: number
          six_week_plan_id?: string
          status?: string
          task_id?: string | null
          trade_activity?: string
          unit?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_plans_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_six_week_plan_id_fkey"
            columns: ["six_week_plan_id"]
            isOneToOne: false
            referencedRelation: "six_week_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_plans_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "plan_activities"
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
