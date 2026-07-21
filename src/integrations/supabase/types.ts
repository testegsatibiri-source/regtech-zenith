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
      api_keys: {
        Row: {
          allowed_origins: string[]
          company_id: string
          created_at: string
          hashed_key: string
          id: string
          label: string | null
          last_used_at: string | null
          monthly_quota: number
          prefix: string
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          allowed_origins?: string[]
          company_id: string
          created_at?: string
          hashed_key: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          monthly_quota?: number
          prefix: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          allowed_origins?: string[]
          company_id?: string
          created_at?: string
          hashed_key?: string
          id?: string
          label?: string | null
          last_used_at?: string | null
          monthly_quota?: number
          prefix?: string
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      api_usage: {
        Row: {
          endpoint: string
          id: number
          ip: unknown
          key_id: string | null
          latency_ms: number
          status_code: number
          ts: string
        }
        Insert: {
          endpoint: string
          id?: number
          ip?: unknown
          key_id?: string | null
          latency_ms: number
          status_code: number
          ts?: string
        }
        Update: {
          endpoint?: string
          id?: number
          ip?: unknown
          key_id?: string | null
          latency_ms?: number
          status_code?: number
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_usage_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          city: string | null
          company_id: string
          country_code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string | null
          company_id: string
          country_code?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string | null
          company_id?: string
          country_code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country_code: string
          created_at: string
          currency: string
          id: string
          legal_name: string | null
          name: string
          owner_id: string
          score_cache: Json | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name: string
          owner_id: string
          score_cache?: Json | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency?: string
          id?: string
          legal_name?: string | null
          name?: string
          owner_id?: string
          score_cache?: Json | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compliance_findings: {
        Row: {
          company_id: string
          created_at: string
          id: string
          message: string | null
          passed: boolean
          rule_code: string
          ruleset_version: string | null
          run_id: string | null
          severity: string
          title: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          message?: string | null
          passed?: boolean
          rule_code: string
          ruleset_version?: string | null
          run_id?: string | null
          severity?: string
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          message?: string | null
          passed?: boolean
          rule_code?: string
          ruleset_version?: string | null
          run_id?: string | null
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_obligations: {
        Row: {
          base_legal: string | null
          category: string
          code: string
          company_id: string
          completed_at: string | null
          country_code: string
          created_at: string
          due_date: string
          frequency: string
          id: string
          name: string
          notes: string | null
          period_label: string | null
          status: string
          updated_at: string
        }
        Insert: {
          base_legal?: string | null
          category?: string
          code: string
          company_id: string
          completed_at?: string | null
          country_code?: string
          created_at?: string
          due_date: string
          frequency?: string
          id?: string
          name: string
          notes?: string | null
          period_label?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_legal?: string | null
          category?: string
          code?: string
          company_id?: string
          completed_at?: string | null
          country_code?: string
          created_at?: string
          due_date?: string
          frequency?: string
          id?: string
          name?: string
          notes?: string | null
          period_label?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_obligations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      country_cto_scopes: {
        Row: {
          country_code: string
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          country_code: string
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          country_code?: string
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          base_salary: number
          branch_id: string | null
          company_id: string
          country_metadata: Json
          created_at: string
          department: string | null
          employment_type: string
          full_name: string
          id: string
          join_date: string | null
          marital_status: string
          position: string | null
          religion: string | null
          status: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          branch_id?: string | null
          company_id: string
          country_metadata?: Json
          created_at?: string
          department?: string | null
          employment_type?: string
          full_name: string
          id?: string
          join_date?: string | null
          marital_status?: string
          position?: string | null
          religion?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          branch_id?: string | null
          company_id?: string
          country_metadata?: Json
          created_at?: string
          department?: string | null
          employment_type?: string
          full_name?: string
          id?: string
          join_date?: string | null
          marital_status?: string
          position?: string | null
          religion?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_contracts: {
        Row: {
          base_salary: number
          clauses: Json
          company_id: string
          contract_type: string
          created_at: string
          employee_id: string | null
          end_date: string | null
          id: string
          notes: string | null
          position: string | null
          probation_end_date: string | null
          signed_at: string | null
          start_date: string
          status: string
          updated_at: string
          version: number
        }
        Insert: {
          base_salary?: number
          clauses?: Json
          company_id: string
          contract_type: string
          created_at?: string
          employee_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          probation_end_date?: string | null
          signed_at?: string | null
          start_date: string
          status?: string
          updated_at?: string
          version?: number
        }
        Update: {
          base_salary?: number
          clauses?: Json
          company_id?: string
          contract_type?: string
          created_at?: string
          employee_id?: string | null
          end_date?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          probation_end_date?: string | null
          signed_at?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "employment_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employment_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_events: {
        Row: {
          id: number
          name: string
          tags: Json
          trace_id: string | null
          ts: string
          value_ms: number | null
        }
        Insert: {
          id?: number
          name: string
          tags?: Json
          trace_id?: string | null
          ts?: string
          value_ms?: number | null
        }
        Update: {
          id?: number
          name?: string
          tags?: Json
          trace_id?: string | null
          ts?: string
          value_ms?: number | null
        }
        Relationships: []
      }
      pack_feature_flags: {
        Row: {
          country_code: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          enabled: boolean
          environment: Database["public"]["Enums"]["pack_flag_environment"]
          flag: string
          id: string
          rollout_percentage: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country_code: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          enabled?: boolean
          environment?: Database["public"]["Enums"]["pack_flag_environment"]
          flag: string
          id?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          enabled?: boolean
          environment?: Database["public"]["Enums"]["pack_flag_environment"]
          flag?: string
          id?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      pack_installations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          archived_by: string | null
          country_code: string
          created_at: string
          deprecated_at: string | null
          deprecated_by: string | null
          id: string
          installed_by: string | null
          installed_core_version: string | null
          installed_from: Database["public"]["Enums"]["pack_install_source"]
          installed_sdk_version: string | null
          manifest_checksum: string | null
          manifest_signature: string | null
          notes: string | null
          pack_version: string
          released_at: string | null
          released_by: string | null
          rollback_of: string | null
          runtime_version: string | null
          status: Database["public"]["Enums"]["pack_installation_status"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          country_code: string
          created_at?: string
          deprecated_at?: string | null
          deprecated_by?: string | null
          id?: string
          installed_by?: string | null
          installed_core_version?: string | null
          installed_from?: Database["public"]["Enums"]["pack_install_source"]
          installed_sdk_version?: string | null
          manifest_checksum?: string | null
          manifest_signature?: string | null
          notes?: string | null
          pack_version: string
          released_at?: string | null
          released_by?: string | null
          rollback_of?: string | null
          runtime_version?: string | null
          status?: Database["public"]["Enums"]["pack_installation_status"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          archived_by?: string | null
          country_code?: string
          created_at?: string
          deprecated_at?: string | null
          deprecated_by?: string | null
          id?: string
          installed_by?: string | null
          installed_core_version?: string | null
          installed_from?: Database["public"]["Enums"]["pack_install_source"]
          installed_sdk_version?: string | null
          manifest_checksum?: string | null
          manifest_signature?: string | null
          notes?: string | null
          pack_version?: string
          released_at?: string | null
          released_by?: string | null
          rollback_of?: string | null
          runtime_version?: string | null
          status?: Database["public"]["Enums"]["pack_installation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pack_installations_rollback_of_fkey"
            columns: ["rollback_of"]
            isOneToOne: false
            referencedRelation: "pack_installations"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          bpjs_employee: number
          bpjs_employer: number
          breakdown: Json
          company_id: string
          created_at: string
          employee_id: string | null
          employee_name: string
          gross: number
          id: string
          net: number
          run_id: string
          tax: number
        }
        Insert: {
          bpjs_employee?: number
          bpjs_employer?: number
          breakdown?: Json
          company_id: string
          created_at?: string
          employee_id?: string | null
          employee_name: string
          gross?: number
          id?: string
          net?: number
          run_id: string
          tax?: number
        }
        Update: {
          bpjs_employee?: number
          bpjs_employer?: number
          breakdown?: Json
          company_id?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          gross?: number
          id?: string
          net?: number
          run_id?: string
          tax?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          company_id: string
          compliance_score: number
          country_code: string
          created_at: string
          id: string
          period_month: number
          period_year: number
          ruleset_hash: string | null
          ruleset_version: string | null
          snapshot_hash: string | null
          status: string
          totals: Json
          updated_at: string
        }
        Insert: {
          company_id: string
          compliance_score?: number
          country_code?: string
          created_at?: string
          id?: string
          period_month: number
          period_year: number
          ruleset_hash?: string | null
          ruleset_version?: string | null
          snapshot_hash?: string | null
          status?: string
          totals?: Json
          updated_at?: string
        }
        Update: {
          company_id?: string
          compliance_score?: number
          country_code?: string
          created_at?: string
          id?: string
          period_month?: number
          period_year?: number
          ruleset_hash?: string | null
          ruleset_version?: string | null
          snapshot_hash?: string | null
          status?: string
          totals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_log: {
        Row: {
          action: string
          actor: string | null
          at: string
          component: string | null
          correlation_id: string | null
          country_code: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          payload: Json
          request_id: string | null
          target: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          at?: string
          component?: string | null
          correlation_id?: string | null
          country_code?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          payload?: Json
          request_id?: string | null
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          at?: string
          component?: string | null
          correlation_id?: string | null
          country_code?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          payload?: Json
          request_id?: string | null
          target?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      regulatory_parameters: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          approved_at: string | null
          approved_by: string | null
          author: string | null
          checksum: string | null
          country_code: string
          created_at: string
          effective_from: string | null
          effective_to: string | null
          id: string
          notes: string | null
          parameter_key: string
          payload: Json
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["regulatory_parameter_status"]
          updated_at: string
          version: number
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          author?: string | null
          checksum?: string | null
          country_code: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          parameter_key: string
          payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["regulatory_parameter_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          approved_at?: string | null
          approved_by?: string | null
          author?: string | null
          checksum?: string | null
          country_code?: string
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          parameter_key?: string
          payload?: Json
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["regulatory_parameter_status"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      check_api_quota: {
        Args: { _key_id: string; _monthly_quota: number }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_auditor: { Args: never; Returns: boolean }
      is_country_cto: { Args: { _code: string }; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      is_platform_auditor: { Args: never; Returns: boolean }
      is_platform_operator: { Args: never; Returns: boolean }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "viewer"
        | "auditor"
        | "platform_admin"
        | "country_cto"
        | "platform_operator"
        | "platform_auditor"
      pack_flag_environment: "preview" | "production" | "all"
      pack_install_source: "manual" | "pipeline" | "rollback" | "marketplace"
      pack_installation_status:
        | "draft"
        | "candidate"
        | "approved"
        | "released"
        | "deprecated"
        | "archived"
        | "rolled_back"
      regulatory_parameter_status:
        | "draft"
        | "review"
        | "approved"
        | "active"
        | "superseded"
        | "archived"
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
      app_role: [
        "admin",
        "manager",
        "viewer",
        "auditor",
        "platform_admin",
        "country_cto",
        "platform_operator",
        "platform_auditor",
      ],
      pack_flag_environment: ["preview", "production", "all"],
      pack_install_source: ["manual", "pipeline", "rollback", "marketplace"],
      pack_installation_status: [
        "draft",
        "candidate",
        "approved",
        "released",
        "deprecated",
        "archived",
        "rolled_back",
      ],
      regulatory_parameter_status: [
        "draft",
        "review",
        "approved",
        "active",
        "superseded",
        "archived",
      ],
    },
  },
} as const
