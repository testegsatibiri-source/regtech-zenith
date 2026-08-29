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
      alert_escalations: {
        Row: {
          after_seconds: number
          id: string
          notification_id: string
          rule_id: string
          step_order: number
        }
        Insert: {
          after_seconds: number
          id?: string
          notification_id: string
          rule_id: string
          step_order: number
        }
        Update: {
          after_seconds?: number
          id?: string
          notification_id?: string
          rule_id?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_escalations_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "alert_notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_escalations_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_incidents: {
        Row: {
          id: string
          incident_id: string | null
          observed_value: number | null
          resolved_at: string | null
          rule_id: string
          triggered_at: string
        }
        Insert: {
          id?: string
          incident_id?: string | null
          observed_value?: number | null
          resolved_at?: string | null
          rule_id: string
          triggered_at?: string
        }
        Update: {
          id?: string
          incident_id?: string | null
          observed_value?: number | null
          resolved_at?: string | null
          rule_id?: string
          triggered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_incidents_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_incidents_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_notifications: {
        Row: {
          channel: string
          created_at: string
          enabled: boolean
          id: string
          rule_id: string
          target: string
        }
        Insert: {
          channel: string
          created_at?: string
          enabled?: boolean
          id?: string
          rule_id: string
          target: string
        }
        Update: {
          channel?: string
          created_at?: string
          enabled?: boolean
          id?: string
          rule_id?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_notifications_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          comparator: string
          created_at: string
          enabled: boolean
          id: string
          layer: string
          metric: string
          name: string
          severity: string
          threshold: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          comparator: string
          created_at?: string
          enabled?: boolean
          id?: string
          layer: string
          metric: string
          name: string
          severity?: string
          threshold: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          comparator?: string
          created_at?: string
          enabled?: boolean
          id?: string
          layer?: string
          metric?: string
          name?: string
          severity?: string
          threshold?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
      }
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
          statutory_metadata: Json
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
          statutory_metadata?: Json
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
          statutory_metadata?: Json
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      compatibility_reports: {
        Row: {
          checks: Json
          created_at: string
          engine_version: string
          environment: string | null
          id: string
          matrix_version: string
          ok: boolean
          pack_country: string
          pack_version: string
          published_report_ref: string | null
          rejections: Json
          source: string
        }
        Insert: {
          checks?: Json
          created_at?: string
          engine_version: string
          environment?: string | null
          id?: string
          matrix_version: string
          ok: boolean
          pack_country: string
          pack_version: string
          published_report_ref?: string | null
          rejections?: Json
          source?: string
        }
        Update: {
          checks?: Json
          created_at?: string
          engine_version?: string
          environment?: string | null
          id?: string
          matrix_version?: string
          ok?: boolean
          pack_country?: string
          pack_version?: string
          published_report_ref?: string | null
          rejections?: Json
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "compatibility_reports_published_report_ref_fkey"
            columns: ["published_report_ref"]
            isOneToOne: false
            referencedRelation: "pack_registry"
            referencedColumns: ["id"]
          },
        ]
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
          country_code: string
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
      employee_dependents: {
        Row: {
          birth_date: string | null
          company_id: string
          created_at: string
          employee_id: string
          full_name: string
          id: string
          is_pwd: boolean
          is_qualified_dependent: boolean
          is_student: boolean
          notes: string | null
          relationship: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          company_id: string
          created_at?: string
          employee_id: string
          full_name: string
          id?: string
          is_pwd?: boolean
          is_qualified_dependent?: boolean
          is_student?: boolean
          notes?: string | null
          relationship?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          company_id?: string
          created_at?: string
          employee_id?: string
          full_name?: string
          id?: string
          is_pwd?: boolean
          is_qualified_dependent?: boolean
          is_student?: boolean
          notes?: string | null
          relationship?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_dependents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_dependents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_job_history: {
        Row: {
          base_salary: number
          change_reason: string
          company_id: string
          created_at: string
          department: string | null
          effective_date: string
          employee_id: string
          employment_type: string | null
          id: string
          notes: string | null
          position: string | null
          updated_at: string
        }
        Insert: {
          base_salary?: number
          change_reason?: string
          company_id: string
          created_at?: string
          department?: string | null
          effective_date: string
          employee_id: string
          employment_type?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          updated_at?: string
        }
        Update: {
          base_salary?: number
          change_reason?: string
          company_id?: string
          created_at?: string
          department?: string | null
          effective_date?: string
          employee_id?: string
          employment_type?: string | null
          id?: string
          notes?: string | null
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_job_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_job_history_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
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
      incidents: {
        Row: {
          country_code: string | null
          description: string | null
          id: string
          layer: string
          opened_at: string
          opened_by: string | null
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          description?: string | null
          id?: string
          layer?: string
          opened_at?: string
          opened_by?: string | null
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          description?: string | null
          id?: string
          layer?: string
          opened_at?: string
          opened_by?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      leave_balances: {
        Row: {
          company_id: string
          converted_days: number
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          leave_code: string
          notes: string | null
          updated_at: string
          used_days: number
          year: number
        }
        Insert: {
          company_id: string
          converted_days?: number
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          leave_code: string
          notes?: string | null
          updated_at?: string
          used_days?: number
          year: number
        }
        Update: {
          company_id?: string
          converted_days?: number
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          leave_code?: string
          notes?: string | null
          updated_at?: string
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          company_id: string
          created_at: string
          days: number
          decided_at: string | null
          decided_by: string | null
          employee_id: string
          end_date: string
          id: string
          leave_code: string
          metadata: Json
          paid: boolean
          reason: string | null
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          days?: number
          decided_at?: string | null
          decided_by?: string | null
          employee_id: string
          end_date: string
          id?: string
          leave_code: string
          metadata?: Json
          paid?: boolean
          reason?: string | null
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          days?: number
          decided_at?: string | null
          decided_by?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          leave_code?: string
          metadata?: Json
          paid?: boolean
          reason?: string | null
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
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
          layer: string
          name: string
          tags: Json
          trace_id: string | null
          ts: string
          value_ms: number | null
        }
        Insert: {
          id?: number
          layer?: string
          name: string
          tags?: Json
          trace_id?: string | null
          ts?: string
          value_ms?: number | null
        }
        Update: {
          id?: number
          layer?: string
          name?: string
          tags?: Json
          trace_id?: string | null
          ts?: string
          value_ms?: number | null
        }
        Relationships: []
      }
      metrics_export_log: {
        Row: {
          created_at: string
          exported_from: string
          exported_to: string
          id: string
          rows_exported: number
          sink: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          exported_from: string
          exported_to: string
          id?: string
          rows_exported: number
          sink?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          exported_from?: string
          exported_to?: string
          id?: string
          rows_exported?: number
          sink?: string
          storage_path?: string
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
      pack_lifecycle_events: {
        Row: {
          actor_id: string | null
          created_at: string
          from_state: Database["public"]["Enums"]["pack_state"] | null
          id: string
          metadata: Json | null
          pack_id: string
          reason: string | null
          to_state: Database["public"]["Enums"]["pack_state"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["pack_state"] | null
          id?: string
          metadata?: Json | null
          pack_id: string
          reason?: string | null
          to_state: Database["public"]["Enums"]["pack_state"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_state?: Database["public"]["Enums"]["pack_state"] | null
          id?: string
          metadata?: Json | null
          pack_id?: string
          reason?: string | null
          to_state?: Database["public"]["Enums"]["pack_state"]
        }
        Relationships: [
          {
            foreignKeyName: "pack_lifecycle_events_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "pack_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_registry: {
        Row: {
          checksum: string
          compatibility_report: Json | null
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          interface_version: string
          manifest: Json
          pack_version: string
          publisher: string
          requires_core: string
          signatures: Json
          state: Database["public"]["Enums"]["pack_state"]
          updated_at: string
        }
        Insert: {
          checksum: string
          compatibility_report?: Json | null
          country_code: string
          created_at?: string
          created_by?: string | null
          id?: string
          interface_version: string
          manifest: Json
          pack_version: string
          publisher: string
          requires_core: string
          signatures?: Json
          state?: Database["public"]["Enums"]["pack_state"]
          updated_at?: string
        }
        Update: {
          checksum?: string
          compatibility_report?: Json | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          interface_version?: string
          manifest?: Json
          pack_version?: string
          publisher?: string
          requires_core?: string
          signatures?: Json
          state?: Database["public"]["Enums"]["pack_state"]
          updated_at?: string
        }
        Relationships: []
      }
      pack_signing_keys: {
        Row: {
          active: boolean
          algo: string
          capabilities: string[]
          created_at: string
          id: string
          key_id: string | null
          provider: string
          public_key: string
          publisher: string
          revoked_at: string | null
        }
        Insert: {
          active?: boolean
          algo?: string
          capabilities?: string[]
          created_at?: string
          id?: string
          key_id?: string | null
          provider?: string
          public_key: string
          publisher: string
          revoked_at?: string | null
        }
        Update: {
          active?: boolean
          algo?: string
          capabilities?: string[]
          created_at?: string
          id?: string
          key_id?: string | null
          provider?: string
          public_key?: string
          publisher?: string
          revoked_at?: string | null
        }
        Relationships: []
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
      platform_feature_gates: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          environment: string
          gate: string
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment: string
          gate: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string
          gate?: string
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_invitations: {
        Row: {
          accepted_at: string | null
          country_code: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          country_code?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          country_code?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      postmortems: {
        Row: {
          author_id: string | null
          cause: string
          created_at: string
          id: string
          incident_id: string
          prevention: string
          published_at: string | null
          resolution: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          cause: string
          created_at?: string
          id?: string
          incident_id: string
          prevention: string
          published_at?: string | null
          resolution: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          cause?: string
          created_at?: string
          id?: string
          incident_id?: string
          prevention?: string
          published_at?: string | null
          resolution?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postmortems_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
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
      role_capabilities: {
        Row: {
          capability: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          scope: string
        }
        Insert: {
          capability: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          scope?: string
        }
        Update: {
          capability?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          scope?: string
        }
        Relationships: []
      }
      runtime_boot_reports: {
        Row: {
          environment: string | null
          id: string
          ready: boolean
          report: Json
          runtime_version: string
          sdk_version: string
          ts: string
        }
        Insert: {
          environment?: string | null
          id?: string
          ready: boolean
          report?: Json
          runtime_version: string
          sdk_version: string
          ts?: string
        }
        Update: {
          environment?: string | null
          id?: string
          ready?: boolean
          report?: Json
          runtime_version?: string
          sdk_version?: string
          ts?: string
        }
        Relationships: []
      }
      statutory_filings: {
        Row: {
          amends_filing_id: string | null
          artifact_checksum: string
          artifact_content: string
          artifact_filename: string
          artifact_format: string
          company_id: string
          country_code: string
          created_at: string
          form_code: string
          form_title: string
          id: string
          pack_version: string
          period_month: number | null
          period_year: number
          row_count: number
          ruleset_version: string
          run_id: string | null
          status: string
          submission_notes: string | null
          submission_reference: string | null
          submitted_at: string | null
          totals: Json
          updated_at: string
          warnings: Json
        }
        Insert: {
          amends_filing_id?: string | null
          artifact_checksum: string
          artifact_content: string
          artifact_filename: string
          artifact_format: string
          company_id: string
          country_code: string
          created_at?: string
          form_code: string
          form_title: string
          id?: string
          pack_version: string
          period_month?: number | null
          period_year: number
          row_count?: number
          ruleset_version: string
          run_id?: string | null
          status?: string
          submission_notes?: string | null
          submission_reference?: string | null
          submitted_at?: string | null
          totals?: Json
          updated_at?: string
          warnings?: Json
        }
        Update: {
          amends_filing_id?: string | null
          artifact_checksum?: string
          artifact_content?: string
          artifact_filename?: string
          artifact_format?: string
          company_id?: string
          country_code?: string
          created_at?: string
          form_code?: string
          form_title?: string
          id?: string
          pack_version?: string
          period_month?: number | null
          period_year?: number
          row_count?: number
          ruleset_version?: string
          run_id?: string | null
          status?: string
          submission_notes?: string | null
          submission_reference?: string | null
          submitted_at?: string | null
          totals?: Json
          updated_at?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "statutory_filings_amends_filing_id_fkey"
            columns: ["amends_filing_id"]
            isOneToOne: false
            referencedRelation: "statutory_filings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_filings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "statutory_filings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_policies: {
        Row: {
          allow_experimental: boolean
          distinct_signers: boolean
          environment: string
          id: string
          required_capabilities: string[]
          required_signatures: number
          updated_at: string
        }
        Insert: {
          allow_experimental?: boolean
          distinct_signers?: boolean
          environment: string
          id?: string
          required_capabilities?: string[]
          required_signatures?: number
          updated_at?: string
        }
        Update: {
          allow_experimental?: boolean
          distinct_signers?: boolean
          environment?: string
          id?: string
          required_capabilities?: string[]
          required_signatures?: number
          updated_at?: string
        }
        Relationships: []
      }
      uada_benchmark_results: {
        Row: {
          benchmark_id: string
          benchmark_version: string
          hit: boolean
          id: string
          latency_ms: number | null
          precision_at_5: number | null
          ran_at: string
          recall_at_5: number | null
          returned_paths: string[]
          snapshot_id: string
        }
        Insert: {
          benchmark_id: string
          benchmark_version: string
          hit?: boolean
          id?: string
          latency_ms?: number | null
          precision_at_5?: number | null
          ran_at?: string
          recall_at_5?: number | null
          returned_paths?: string[]
          snapshot_id: string
        }
        Update: {
          benchmark_id?: string
          benchmark_version?: string
          hit?: boolean
          id?: string
          latency_ms?: number | null
          precision_at_5?: number | null
          ran_at?: string
          recall_at_5?: number | null
          returned_paths?: string[]
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uada_benchmark_results_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "uada_search_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uada_benchmark_results_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_documents: {
        Row: {
          content: string | null
          content_truncated: boolean
          id: string
          kind: string
          metadata: Json
          path: string
          sha256: string
          snapshot_id: string
          summary: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          content_truncated?: boolean
          id?: string
          kind: string
          metadata?: Json
          path: string
          sha256: string
          snapshot_id: string
          summary?: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          content_truncated?: boolean
          id?: string
          kind?: string
          metadata?: Json
          path?: string
          sha256?: string
          snapshot_id?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uada_documents_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_embeddings: {
        Row: {
          created_at: string
          document_id: string
          embedding: string | null
          embedding_dimensions: number
          embedding_model: string
          error_message: string | null
          id: string
          last_embedded_at: string | null
          retry_count: number
          snapshot_id: string
          status: string
        }
        Insert: {
          created_at?: string
          document_id: string
          embedding?: string | null
          embedding_dimensions: number
          embedding_model: string
          error_message?: string | null
          id?: string
          last_embedded_at?: string | null
          retry_count?: number
          snapshot_id: string
          status?: string
        }
        Update: {
          created_at?: string
          document_id?: string
          embedding?: string | null
          embedding_dimensions?: number
          embedding_model?: string
          error_message?: string | null
          id?: string
          last_embedded_at?: string | null
          retry_count?: number
          snapshot_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "uada_embeddings_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "uada_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uada_embeddings_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_graph_edges: {
        Row: {
          confidence: number
          from_node: string
          id: string
          kind: string
          metadata: Json
          snapshot_id: string
          source: string
          to_node: string
          weight: number
        }
        Insert: {
          confidence?: number
          from_node: string
          id?: string
          kind: string
          metadata?: Json
          snapshot_id: string
          source?: string
          to_node: string
          weight?: number
        }
        Update: {
          confidence?: number
          from_node?: string
          id?: string
          kind?: string
          metadata?: Json
          snapshot_id?: string
          source?: string
          to_node?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "uada_graph_edges_from_node_fkey"
            columns: ["from_node"]
            isOneToOne: false
            referencedRelation: "uada_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uada_graph_edges_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uada_graph_edges_to_node_fkey"
            columns: ["to_node"]
            isOneToOne: false
            referencedRelation: "uada_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_graph_nodes: {
        Row: {
          id: string
          key: string
          kind: string
          label: string
          metadata: Json
          path: string | null
          snapshot_id: string
        }
        Insert: {
          id?: string
          key: string
          kind: string
          label: string
          metadata?: Json
          path?: string | null
          snapshot_id: string
        }
        Update: {
          id?: string
          key?: string
          kind?: string
          label?: string
          metadata?: Json
          path?: string | null
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uada_graph_nodes_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_index_runs: {
        Row: {
          cancel_requested_at: string | null
          cancel_state: string
          cancelled_at: string | null
          coverage: Json
          coverage_detail: Json
          docs_denied: number
          docs_skipped: number
          docs_upserted: number
          duration_ms: number | null
          embedding_batches: number
          embedding_cost: number
          embedding_tokens: number
          error: string | null
          files_changed: number
          files_scanned: number
          finished_at: string | null
          graph_edges: number
          graph_nodes: number
          id: string
          mode: string
          ok: boolean
          reason: string
          snapshot_id: string | null
          started_at: string
        }
        Insert: {
          cancel_requested_at?: string | null
          cancel_state?: string
          cancelled_at?: string | null
          coverage?: Json
          coverage_detail?: Json
          docs_denied?: number
          docs_skipped?: number
          docs_upserted?: number
          duration_ms?: number | null
          embedding_batches?: number
          embedding_cost?: number
          embedding_tokens?: number
          error?: string | null
          files_changed?: number
          files_scanned?: number
          finished_at?: string | null
          graph_edges?: number
          graph_nodes?: number
          id?: string
          mode: string
          ok?: boolean
          reason: string
          snapshot_id?: string | null
          started_at?: string
        }
        Update: {
          cancel_requested_at?: string | null
          cancel_state?: string
          cancelled_at?: string | null
          coverage?: Json
          coverage_detail?: Json
          docs_denied?: number
          docs_skipped?: number
          docs_upserted?: number
          duration_ms?: number | null
          embedding_batches?: number
          embedding_cost?: number
          embedding_tokens?: number
          error?: string | null
          files_changed?: number
          files_scanned?: number
          finished_at?: string | null
          graph_edges?: number
          graph_nodes?: number
          id?: string
          mode?: string
          ok?: boolean
          reason?: string
          snapshot_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "uada_index_runs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      uada_memory: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          key: string
          scope: string
          value: Json
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key: string
          scope: string
          value?: Json
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          key?: string
          scope?: string
          value?: Json
        }
        Relationships: []
      }
      uada_score_reports: {
        Row: {
          created_at: string
          details: Json
          dimension: string
          id: string
          overall: number
          score: number
          snapshot_version: number
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          details?: Json
          dimension: string
          id?: string
          overall: number
          score: number
          snapshot_version: number
          updated_at?: string
          weight: number
        }
        Update: {
          created_at?: string
          details?: Json
          dimension?: string
          id?: string
          overall?: number
          score?: number
          snapshot_version?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      uada_search_benchmarks: {
        Row: {
          benchmark_version: string
          category: string
          created_at: string
          expected_paths: string[]
          id: string
          query: string
          slug: string
          updated_at: string
        }
        Insert: {
          benchmark_version?: string
          category: string
          created_at?: string
          expected_paths?: string[]
          id?: string
          query: string
          slug: string
          updated_at?: string
        }
        Update: {
          benchmark_version?: string
          category?: string
          created_at?: string
          expected_paths?: string[]
          id?: string
          query?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      uada_snapshots: {
        Row: {
          activated_at: string | null
          archived_at: string | null
          commit_sha: string | null
          created_at: string
          embedding_dimensions: number
          embedding_model: string
          failed_at: string | null
          failure_reason: string | null
          graph_schema_version: string
          id: string
          manifest: Json | null
          promotion_state: string
          schema_hash: string | null
          state: string
          stats: Json
          version: number
        }
        Insert: {
          activated_at?: string | null
          archived_at?: string | null
          commit_sha?: string | null
          created_at?: string
          embedding_dimensions: number
          embedding_model: string
          failed_at?: string | null
          failure_reason?: string | null
          graph_schema_version?: string
          id?: string
          manifest?: Json | null
          promotion_state?: string
          schema_hash?: string | null
          state: string
          stats?: Json
          version: number
        }
        Update: {
          activated_at?: string | null
          archived_at?: string | null
          commit_sha?: string | null
          created_at?: string
          embedding_dimensions?: number
          embedding_model?: string
          failed_at?: string | null
          failure_reason?: string | null
          graph_schema_version?: string
          id?: string
          manifest?: Json | null
          promotion_state?: string
          schema_hash?: string | null
          state?: string
          stats?: Json
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
      uada_benchmark_regression: {
        Row: {
          benchmark_id: string | null
          delta_precision: number | null
          hit: boolean | null
          latency_ms: number | null
          precision_at_5: number | null
          prev_precision_at_5: number | null
          prev_snapshot_version: number | null
          ran_at: string | null
          snapshot_id: string | null
          snapshot_version: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uada_benchmark_results_benchmark_id_fkey"
            columns: ["benchmark_id"]
            isOneToOne: false
            referencedRelation: "uada_search_benchmarks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uada_benchmark_results_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "uada_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_api_quota: {
        Args: { _key_id: string; _monthly_quota: number }
        Returns: boolean
      }
      has_capability: {
        Args: { _capability: string; _country_code?: string; _user_id: string }
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
      is_uada_reader: { Args: never; Returns: boolean }
      is_uada_writer: { Args: never; Returns: boolean }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
      uada_start_reindex: {
        Args: {
          _commit_sha: string
          _dimensions: number
          _graph_schema_version: string
          _model: string
          _namespace_id: number
          _repo_id: number
          _schema_hash: string
        }
        Returns: {
          acquired: boolean
          snapshot_id: string
          version: number
        }[]
      }
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
      pack_state:
        | "experimental"
        | "draft"
        | "review"
        | "approved"
        | "published"
        | "deprecated"
        | "yanked"
        | "archived"
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
      pack_state: [
        "experimental",
        "draft",
        "review",
        "approved",
        "published",
        "deprecated",
        "yanked",
        "archived",
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
