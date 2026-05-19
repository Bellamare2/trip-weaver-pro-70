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
  return STATUSES[(i + 1) % STATUSES.length];
}
