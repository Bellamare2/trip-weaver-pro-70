import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  changed_by: string | null;
  changed_by_name: string | null;
  changes: Record<string, { from: unknown; to: unknown } | unknown>;
  created_at: string;
}

/** Friendly labels for DB column names shown in the log. */
const FIELD_LABELS: Record<string, string> = {
  name: "Title",
  status: "Status",
  date: "Date",
  start_time: "Time",
  vendor: "Vendor",
  location: "Location",
  notes: "Special info",
  internal_notes: "Internal notes",
  price_usd: "Price (USD)",
  confirmation_number: "Confirmation #",
  assigned_to: "Assigned to",
  confirmed_with: "Confirmed with",
  service_type: "Service type",
  category: "Category",
  roll_over: "Roll over",
  is_internal: "Internal",
  details: "Details",
  // guests
  full_name: "Full name",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp",
  property: "Property",
  check_in: "Check-in",
  check_out: "Check-out",
  party_size: "Party size",
  nationality: "Nationality",
  language: "Language",
  tags: "Tags",
  dietary: "Dietary",
  allergies: "Allergies",
  room_prefs: "Room preferences",
  vip_notes: "VIP notes",
  special_notes: "Special notes",
  // checklists / maintenance
  items: "Checklist items",
  type: "Type",
  scheduled_date: "Scheduled date",
  title: "Title",
  description: "Description",
  priority: "Priority",
  cost_estimate: "Cost estimate",
  owner_approval_status: "Owner approval",
};

export function fieldLabel(col: string): string {
  return FIELD_LABELS[col] ?? col.replace(/_/g, " ");
}

export function useAuditLog(tableName: string, recordId: string | undefined) {
  return useQuery({
    queryKey: ["audit-log", tableName, recordId],
    enabled: !!recordId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, table_name, record_id, action, changed_by, changed_by_name, changes, created_at")
        .eq("table_name", tableName)
        .eq("record_id", recordId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AuditEntry[];
    },
  });
}
