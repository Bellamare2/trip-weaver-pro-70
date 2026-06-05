export type ActivityStatus = "Requested" | "Confirmed" | "Cancelled";

export const STATUSES: ActivityStatus[] = ["Requested", "Confirmed", "Cancelled"];

export const CATEGORIES = [
  "Dining",
  "Transportation",
  "Excursion",
  "Spa",
  "Private Chef",
  "Grocery",
  "Housekeeping",
  "Other",
] as const;

export type ActivityCategory = (typeof CATEGORIES)[number];

export const GUEST_TAGS = ["VIP", "Returning", "First Stay", "Corporate"] as const;
export type GuestTag = (typeof GUEST_TAGS)[number];

export const GUEST_TYPES = ["Owner", "Friend of Owner", "Rental"] as const;
export type GuestType = (typeof GUEST_TYPES)[number];

export const guestTypeStyles: Record<GuestType, string> = {
  "Owner":           "bg-primary/15 text-primary border-primary/40",
  "Friend of Owner": "bg-[oklch(0.85_0.08_250)]/40 text-[oklch(0.35_0.12_250)] border-[oklch(0.65_0.08_250)]/50",
  "Rental":          "bg-gold/15 text-[oklch(0.45_0.13_80)] border-gold/50",
};

export const statusStyles: Record<ActivityStatus, string> = {
  Requested:
    "bg-warning/15 text-warning-foreground border border-warning/40 [&]:text-[oklch(0.42_0.10_85)]",
  Confirmed:
    "bg-success/15 text-success-foreground border border-success/40 [&]:text-[oklch(0.40_0.12_150)]",
  Cancelled:
    "bg-destructive/10 text-destructive border border-destructive/30",
};

export const statusDot: Record<ActivityStatus, string> = {
  Requested: "bg-warning",
  Confirmed: "bg-success",
  Cancelled: "bg-destructive",
};

export const categoryAccent: Record<string, string> = {
  Dining: "text-[oklch(0.55_0.16_25)]",
  Transportation: "text-[oklch(0.50_0.12_250)]",
  Excursion: "text-[oklch(0.50_0.15_150)]",
  Spa: "text-[oklch(0.55_0.13_330)]",
  "Private Chef": "text-[oklch(0.55_0.16_60)]",
  Grocery: "text-[oklch(0.50_0.14_140)]",
  Housekeeping: "text-[oklch(0.55_0.05_250)]",
  Other: "text-muted-foreground",
};

export const tagStyles: Record<GuestTag, string> = {
  VIP: "bg-gold/20 text-[oklch(0.45_0.13_80)] border-gold/50",
  Returning: "bg-primary/10 text-primary border-primary/30",
  "First Stay": "bg-sand text-sand-foreground border-sand-foreground/20",
  Corporate: "bg-accent text-accent-foreground border-accent-foreground/20",
};

export function nextStatus(s: ActivityStatus): ActivityStatus {
  const i = STATUSES.indexOf(s);
  // Don't wrap past Cancelled — it's a terminal state
  const next = i + 1;
  return next < STATUSES.length ? STATUSES[next] : s;
}

// ── Property OS domain ────────────────────────────────────────────
export const VENDOR_CATEGORIES = [
  "Pool", "Landscaping", "Housekeeping", "Plumbing", "Electrical",
  "HVAC", "General Maintenance", "Security", "Concierge", "Other",
] as const;
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

export const INSURANCE_STATUSES = ["Active", "Expired", "Pending", "Unknown"] as const;
export type InsuranceStatus = (typeof INSURANCE_STATUSES)[number];

export const INSPECTION_TYPES = ["Weekly", "Arrival", "Departure", "Special"] as const;
export type InspectionType = (typeof INSPECTION_TYPES)[number];

export const INSPECTION_CATEGORIES = [
  "Exterior", "Interior", "HVAC", "Plumbing", "Electrical",
  "Pool", "Landscaping", "Vehicles", "Security",
] as const;

export const PRIORITY_LEVELS = ["Low", "Normal", "High", "Urgent"] as const;
export type Priority = (typeof PRIORITY_LEVELS)[number];

export const MAINTENANCE_STATUSES = [
  "Open", "Waiting Owner Approval", "Scheduled", "In Progress", "Completed",
] as const;
export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];

export const maintenanceStatusStyles: Record<MaintenanceStatus, string> = {
  "Open": "bg-warning/15 border-warning/40 [&]:text-[oklch(0.42_0.10_85)]",
  "Waiting Owner Approval": "bg-gold/15 border-gold/40 [&]:text-[oklch(0.42_0.13_80)]",
  "Scheduled": "bg-primary/10 border-primary/30 text-primary",
  "In Progress": "bg-accent border-accent-foreground/20 text-accent-foreground",
  "Completed": "bg-success/15 border-success/40 [&]:text-[oklch(0.40_0.12_150)]",
};

export const EXPENSE_CATEGORIES = [
  "Utilities", "Maintenance", "Pool", "Landscaping",
  "Housekeeping", "Concierge", "Repairs", "Other",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const ARRIVAL_CHECKLIST_DEFAULT = [
  "AC Activated", "Pool Checked", "Lighting Tested", "Appliances Tested",
  "Groceries Delivered", "Vehicle Ready", "Welcome Set",
];
export const DEPARTURE_CHECKLIST_DEFAULT = [
  "Utilities Secured", "Vehicles Stored", "Property Locked",
  "Final Inspection Completed", "Linens Collected",
];

export const PROVIDER_ROLES = [
  "Pool", "Landscaping", "Housekeeping", "Electrician",
  "Plumber", "HVAC Technician", "Security", "Other",
] as const;

export const DOCUMENT_TYPES = [
  "Insurance Policy", "HOA Document", "Warranty", "Floor Plan", "Other",
] as const;

// ── Concierge service types ───────────────────────────────────────
export const SERVICE_TYPES = [
  "Arrival Transportation",
  "Departure Transportation",
  "Private Transportation",
  "Restaurant Reservation",
  "Activity",
  "Spa",
  "Private Chef",
  "Grocery",
  "Other",
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export function serviceCategory(s: ServiceType | string): string {
  if (typeof s === "string" && s.includes("Transportation")) return "Transportation";
  if (s === "Restaurant Reservation") return "Dining";
  if (s === "Activity") return "Excursion";
  if (s === "Spa") return "Spa";
  if (s === "Private Chef") return "Private Chef";
  if (s === "Grocery") return "Grocery";
  return "Other";
}

export const CAR_TYPES = [
  "Luxury SUV", "Luxury Sprinter", "SUV", "One way", "Owners",
] as const;

export const TRANSPORT_LOCATIONS = [
  "Chileno Bay Resort and Residences",
  "Chileno Bay Beach Club",
  "Esperanza",
  "El Dorado Golf Club",
  "The Resort at Pedregal",
  "San Jose International Airport",
  "San Jose Private Airport MMSD",
  "Cabo San Lucas Private Airport MMSL",
  "Cabo San Lucas Airport Terminal 1 - JSX",
  "Las Ventanas",
  "One and Only Palmilla",
  "Hacienda Beach Club & Residences",
  "Le Blanc",
  "Thompson Hotel",
  "Montage Hotel",
  "Mar de Cortez",
  "Dreams Resort",
  "Secrets Puerto Los Cabos",
  "Grand Velas",
  "Viceroy",
  "Other",
] as const;

export const CHARGE_TYPES = [
  "A&G (Gerencia)", "Complimentary", "Food & Beverage",
  "Golf Tournament Package", "Hotel Package", "Master account",
  "Owner House Account", "Room bill", "Rooms Division",
  "Sales and Marketing", "SPA",
] as const;

export const TRANSPORTATION_MODES = [
  "Own Vehicle", "Taxi", "Private Transportation", "Walking",
  "Carpool", "Shuttle", "Not needed", "TBA",
] as const;

export const ACTIVITY_TYPES = [
  "ATVs / Quads", "Camel Safari", "City tour", "Deep sea fishing",
  "Dolphin Encounter", "Dolphin Swim", "Desert Oasis Hike",
  "Electric Bike tour", "Fishing", "Flyboard", "Glass Bottom Boat",
  "Hike & SUP", "Horseback Ride", "Jeep tour", "Jet Ski",
  "Kayak & Snorkeling", "Paddle to The Arch", "Parasailing",
  "Pelagic Safari", "Private Boat", "Park Pass", "RZR / UTV",
  "Sailing", "Scuba Diving", "Snorkeling cruise", "Spearfishing",
  "Stand Up Paddle", "Sunset cruise", "Surfing lesson",
  "Tennis Lesson", "Whale Watching", "Private Yacht", "Zip lines",
] as const;

export const PAYMENT_METHODS = [
  "Amex, VS, MC & Cash accepted",
  "VS, MC and Cash accepted only",
  "Cash accepted only",
  "Already Paid",
  "Pay at venue",
] as const;


