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
      access_requests: {
        Row: {
          admin_notes: string | null
          company_name: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          company_name?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          is_approved: boolean | null
          logo_url: string | null
          name: string
          plan_days: number | null
          plan_ends_at: string | null
          plan_starts_at: string | null
          plan_type: string | null
          settings: Json | null
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          logo_url?: string | null
          name: string
          plan_days?: number | null
          plan_ends_at?: string | null
          plan_starts_at?: string | null
          plan_type?: string | null
          settings?: Json | null
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          is_approved?: boolean | null
          logo_url?: string | null
          name?: string
          plan_days?: number | null
          plan_ends_at?: string | null
          plan_starts_at?: string | null
          plan_type?: string | null
          settings?: Json | null
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      counters: {
        Row: {
          company_id: string
          created_at: string
          current_operator_id: string | null
          id: string
          is_active: boolean | null
          name: string
          number: number
          unit_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_operator_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          number?: number
          unit_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_operator_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          number?: number
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "counters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "counters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      device_group_members: {
        Row: {
          device_id: string
          group_id: string
          id: string
        }
        Insert: {
          device_id: string
          group_id: string
          id?: string
        }
        Update: {
          device_id?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_group_members_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "device_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      device_groups: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          tags: string[] | null
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tags?: string[] | null
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "device_groups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          active_playlist_id: string | null
          active_screen_id: string | null
          cache_size_mb: number | null
          company_id: string
          created_at: string
          device_token: string | null
          id: string
          last_seen: string | null
          location: string | null
          name: string
          orientation: Database["public"]["Enums"]["device_orientation"] | null
          pairing_code: string | null
          pairing_expires_at: string | null
          player_version: string | null
          resolution: string | null
          status: Database["public"]["Enums"]["device_status"] | null
          tags: string[] | null
          timezone: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          active_playlist_id?: string | null
          active_screen_id?: string | null
          cache_size_mb?: number | null
          company_id: string
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen?: string | null
          location?: string | null
          name: string
          orientation?: Database["public"]["Enums"]["device_orientation"] | null
          pairing_code?: string | null
          pairing_expires_at?: string | null
          player_version?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          timezone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          active_playlist_id?: string | null
          active_screen_id?: string | null
          cache_size_mb?: number | null
          company_id?: string
          created_at?: string
          device_token?: string | null
          id?: string
          last_seen?: string | null
          location?: string | null
          name?: string
          orientation?: Database["public"]["Enums"]["device_orientation"] | null
          pairing_code?: string | null
          pairing_expires_at?: string | null
          player_version?: string | null
          resolution?: string | null
          status?: Database["public"]["Enums"]["device_status"] | null
          tags?: string[] | null
          timezone?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_active_screen_id_fkey"
            columns: ["active_screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      media_files: {
        Row: {
          company_id: string
          created_at: string
          file_path: string
          file_size: number | null
          file_type: string
          file_url: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          file_path: string
          file_size?: number | null
          file_type?: string
          file_url: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_files_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_items: {
        Row: {
          created_at: string
          duration_seconds: number
          id: string
          playlist_id: string
          screen_id: string
          sort_order: number
          transition: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          id?: string
          playlist_id: string
          screen_id: string
          sort_order?: number
          transition?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          id?: string
          playlist_id?: string
          screen_id?: string
          sort_order?: number
          transition?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_items_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_items_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          schedule_days: number[] | null
          schedule_end: string | null
          schedule_start: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          schedule_days?: number[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          schedule_days?: number[] | null
          schedule_end?: string | null
          schedule_start?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
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
      queue_daily_sequences: {
        Row: {
          date: string
          id: string
          last_number: number
          queue_id: string
        }
        Insert: {
          date?: string
          id?: string
          last_number?: number
          queue_id: string
        }
        Update: {
          date?: string
          id?: string
          last_number?: number
          queue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_daily_sequences_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          alternation_ratio: number | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          prefix: string
          priority_mode: string | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          alternation_ratio?: number | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          prefix?: string
          priority_mode?: string | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          alternation_ratio?: number | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          prefix?: string
          priority_mode?: string | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queues_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      screen_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          layout_json: Json
          screen_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout_json: Json
          screen_id: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          layout_json?: Json
          screen_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "screen_versions_screen_id_fkey"
            columns: ["screen_id"]
            isOneToOne: false
            referencedRelation: "screens"
            referencedColumns: ["id"]
          },
        ]
      }
      screens: {
        Row: {
          background_color: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          height: number
          id: string
          is_template: boolean | null
          layout_json: Json
          name: string
          orientation: string | null
          status: string | null
          template_category: string | null
          thumbnail_url: string | null
          updated_at: string
          width: number
        }
        Insert: {
          background_color?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          height?: number
          id?: string
          is_template?: boolean | null
          layout_json?: Json
          name: string
          orientation?: string | null
          status?: string | null
          template_category?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          width?: number
        }
        Update: {
          background_color?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          height?: number
          id?: string
          is_template?: boolean | null
          layout_json?: Json
          name?: string
          orientation?: string | null
          status?: string | null
          template_category?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "screens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_events: {
        Row: {
          counter_id: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          performed_by: string | null
          ticket_id: string
        }
        Insert: {
          counter_id?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          performed_by?: string | null
          ticket_id: string
        }
        Update: {
          counter_id?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          performed_by?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_events_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          called_at: string | null
          called_by: string | null
          company_id: string
          completed_at: string | null
          counter_id: string | null
          created_at: string
          id: string
          queue_id: string
          served_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          ticket_type: Database["public"]["Enums"]["ticket_type"]
          unit_id: string
          updated_at: string
        }
        Insert: {
          called_at?: string | null
          called_by?: string | null
          company_id: string
          completed_at?: string | null
          counter_id?: string | null
          created_at?: string
          id?: string
          queue_id: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          unit_id: string
          updated_at?: string
        }
        Update: {
          called_at?: string | null
          called_by?: string | null
          company_id?: string
          completed_at?: string | null
          counter_id?: string | null
          created_at?: string
          id?: string
          queue_id?: string
          served_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          ticket_number?: string
          ticket_type?: Database["public"]["Enums"]["ticket_type"]
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_counter_id_fkey"
            columns: ["counter_id"]
            isOneToOne: false
            referencedRelation: "counters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_leads: {
        Row: {
          company_id: string | null
          company_name: string | null
          contacted_at: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          status: string
          trial_ends_at: string
          trial_starts_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          contacted_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          contacted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          trial_ends_at?: string
          trial_starts_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trial_leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          name: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_company_id_fkey"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      approve_access_request: {
        Args: { _plan_days?: number; _plan_type: string; _request_id: string }
        Returns: undefined
      }
      get_next_ticket_number: { Args: { _queue_id: string }; Returns: string }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_company_role: {
        Args: {
          _company_id: string
          _role: Database["public"]["Enums"]["app_role"]
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
      onboard_new_company: {
        Args: {
          _company_name: string
          _company_slug: string
          _email?: string
          _full_name?: string
          _trial_ends_at: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin_empresa"
        | "editor_conteudo"
        | "operador_fila"
        | "viewer"
      device_orientation: "landscape" | "portrait"
      device_status: "online" | "offline" | "pairing"
      ticket_status:
        | "waiting"
        | "called"
        | "serving"
        | "completed"
        | "skipped"
        | "redirected"
      ticket_type:
        | "normal"
        | "preferencial"
        | "prioridade_especial"
        | "emergencia"
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
        "super_admin",
        "admin_empresa",
        "editor_conteudo",
        "operador_fila",
        "viewer",
      ],
      device_orientation: ["landscape", "portrait"],
      device_status: ["online", "offline", "pairing"],
      ticket_status: [
        "waiting",
        "called",
        "serving",
        "completed",
        "skipped",
        "redirected",
      ],
      ticket_type: [
        "normal",
        "preferencial",
        "prioridade_especial",
        "emergencia",
      ],
    },
  },
} as const
