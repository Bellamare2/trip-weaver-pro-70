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
      activities: {
        Row: {
          assigned_to: string | null
          category: string
          confirmation_number: string | null
          confirmed_with: string | null
          created_at: string
          created_by: string | null
          date: string
          details: Json
          duration_minutes: number | null
          guest_id: string | null
          id: string
          internal_notes: string | null
          is_internal: boolean
          location: string | null
          name: string
          notes: string | null
          price_usd: number | null
          repeat_pattern: string | null
          reservation_id: string | null
          roll_over: boolean
          service_type: string
          start_time: string | null
          status: string
          updated_at: string
          updated_by: string | null
          vendor: string | null
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          confirmation_number?: string | null
          confirmed_with?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          details?: Json
          duration_minutes?: number | null
          guest_id?: string | null
          id?: string
          internal_notes?: string | null
          is_internal?: boolean
          location?: string | null
          name: string
          notes?: string | null
          price_usd?: number | null
          repeat_pattern?: string | null
          reservation_id?: string | null
          roll_over?: boolean
          service_type?: string
          start_time?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Update: {
          assigned_to?: string | null
          category?: string
          confirmation_number?: string | null
          confirmed_with?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          details?: Json
          duration_minutes?: number | null
          guest_id?: string | null
          id?: string
          internal_notes?: string | null
          is_internal?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          price_usd?: number | null
          repeat_pattern?: string | null
          reservation_id?: string | null
          roll_over?: boolean
          service_type?: string
          start_time?: string | null
          status?: string
          updated_at?: string
          updated_by?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          changed_by: string | null
          changed_by_name: string | null
          changes: Json
          created_at: string
          id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          changed_by_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          changed_by_name?: string | null
          changes?: Json
          created_at?: string
          id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount_usd: number
          category: string
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          id: string
          invoice_url: string | null
          property_id: string
          vendor_id: string | null
        }
        Insert: {
          amount_usd?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          property_id: string
          vendor_id?: string | null
        }
        Update: {
          amount_usd?: number
          category?: string
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          property_id?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          allergies: string | null
          check_in: string | null
          check_out: string | null
          created_at: string
          created_by: string | null
          dietary: string | null
          email: string | null
          favorite_activities: string | null
          full_name: string
          guest_type: string | null
          id: string
          language: string | null
          nationality: string | null
          notes: string | null
          owner_id: string | null
          party_size: number | null
          phone: string | null
          preferences: string | null
          property: string | null
          room_number: string | null
          room_prefs: string | null
          special_notes: string | null
          tags: string[]
          updated_at: string
          updated_by: string | null
          vip_notes: string | null
          whatsapp: string | null
        }
        Insert: {
          allergies?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          dietary?: string | null
          email?: string | null
          favorite_activities?: string | null
          full_name: string
          guest_type?: string | null
          id?: string
          language?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
          preferences?: string | null
          property?: string | null
          room_number?: string | null
          room_prefs?: string | null
          special_notes?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          vip_notes?: string | null
          whatsapp?: string | null
        }
        Update: {
          allergies?: string | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          dietary?: string | null
          email?: string | null
          favorite_activities?: string | null
          full_name?: string
          guest_type?: string | null
          id?: string
          language?: string | null
          nationality?: string | null
          notes?: string | null
          owner_id?: string | null
          party_size?: number | null
          phone?: string | null
          preferences?: string | null
          property?: string | null
          room_number?: string | null
          room_prefs?: string | null
          special_notes?: string | null
          tags?: string[]
          updated_at?: string
          updated_by?: string | null
          vip_notes?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      inspection_findings: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          inspection_id: string
          photos: string[]
          priority: string
          status: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          inspection_id: string
          photos?: string[]
          priority?: string
          status?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          inspection_id?: string
          photos?: string[]
          priority?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_findings_inspection_id_fkey"
            columns: ["inspection_id"]
            isOneToOne: false
            referencedRelation: "inspections"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          inspector_name: string | null
          overall_status: string
          property_id: string
          summary: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          inspector_name?: string | null
          overall_status?: string
          property_id: string
          summary?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          inspector_name?: string | null
          overall_status?: string
          property_id?: string
          summary?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_tickets: {
        Row: {
          cost_estimate: number | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_url: string | null
          owner_approval_status: string
          photos: string[]
          priority: string
          property_id: string
          scheduled_for: string | null
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
        }
        Insert: {
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          owner_approval_status?: string
          photos?: string[]
          priority?: string
          property_id: string
          scheduled_for?: string | null
          status?: string
          title: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Update: {
          cost_estimate?: number | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_url?: string | null
          owner_approval_status?: string
          photos?: string[]
          priority?: string
          property_id?: string
          scheduled_for?: string | null
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_tickets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_tickets_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          alarm_code: string | null
          alarm_company: string | null
          community: string | null
          created_at: string
          emergency_contacts: Json
          floor_plan_url: string | null
          gate_codes: string | null
          gps: string | null
          id: string
          insurance: Json
          name: string
          notes: string | null
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          photos: string[]
          property_tax: Json
          updated_at: string
          utility_providers: Json
          wifi_password: string | null
          wifi_ssid: string | null
        }
        Insert: {
          address?: string | null
          alarm_code?: string | null
          alarm_company?: string | null
          community?: string | null
          created_at?: string
          emergency_contacts?: Json
          floor_plan_url?: string | null
          gate_codes?: string | null
          gps?: string | null
          id?: string
          insurance?: Json
          name: string
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photos?: string[]
          property_tax?: Json
          updated_at?: string
          utility_providers?: Json
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Update: {
          address?: string | null
          alarm_code?: string | null
          alarm_company?: string | null
          community?: string | null
          created_at?: string
          emergency_contacts?: Json
          floor_plan_url?: string | null
          gate_codes?: string | null
          gps?: string | null
          id?: string
          insurance?: Json
          name?: string
          notes?: string | null
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          photos?: string[]
          property_tax?: Json
          updated_at?: string
          utility_providers?: Json
          wifi_password?: string | null
          wifi_ssid?: string | null
        }
        Relationships: []
      }
      property_documents: {
        Row: {
          created_at: string
          expires_at: string | null
          file_url: string | null
          id: string
          name: string
          property_id: string
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          name: string
          property_id: string
          type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          name?: string
          property_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_service_providers: {
        Row: {
          created_at: string
          id: string
          property_id: string
          role: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          role: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          role?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_service_providers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_service_providers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          adults: number | null
          check_in: string | null
          check_out: string | null
          created_at: string
          created_by: string | null
          guest_id: string
          id: string
          itinerary_closing: string
          itinerary_intro: string
          kids: number | null
          notes: string | null
          property: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adults?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          guest_id: string
          id?: string
          itinerary_closing?: string
          itinerary_intro?: string
          kids?: number | null
          notes?: string | null
          property?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adults?: number | null
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          created_by?: string | null
          guest_id?: string
          id?: string
          itinerary_closing?: string
          itinerary_intro?: string
          kids?: number | null
          notes?: string | null
          property?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
        ]
      }
      stay_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          guest_id: string | null
          id: string
          items: Json
          property_id: string
          scheduled_date: string | null
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          guest_id?: string | null
          id?: string
          items?: Json
          property_id: string
          scheduled_date?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          guest_id?: string | null
          id?: string
          items?: Json
          property_id?: string
          scheduled_date?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stay_checklists_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stay_checklists_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          battery_status: string | null
          created_at: string
          fuel_level: string | null
          id: string
          insurance_expires_at: string | null
          last_inspection_at: string | null
          make: string | null
          model: string | null
          name: string
          notes: string | null
          property_id: string | null
          registration_expires_at: string | null
          updated_at: string
          vin: string | null
          year: number | null
        }
        Insert: {
          battery_status?: string | null
          created_at?: string
          fuel_level?: string | null
          id?: string
          insurance_expires_at?: string | null
          last_inspection_at?: string | null
          make?: string | null
          model?: string | null
          name: string
          notes?: string | null
          property_id?: string | null
          registration_expires_at?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Update: {
          battery_status?: string | null
          created_at?: string
          fuel_level?: string | null
          id?: string
          insurance_expires_at?: string | null
          last_inspection_at?: string | null
          make?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          property_id?: string | null
          registration_expires_at?: string | null
          updated_at?: string
          vin?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          insurance_expires_at: string | null
          insurance_status: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_expires_at?: string | null
          insurance_status?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          insurance_expires_at?: string | null
          insurance_status?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
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
