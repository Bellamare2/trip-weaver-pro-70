import { type GuestType, guestTypeStyles } from "@/lib/domain";

export function GuestTypePill({ type, size = "md" }: { type: GuestType; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-0.5 text-[10px]";
  return (
    <span className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wider ${pad} ${guestTypeStyles[type]}`}>
      {type}
    </span>
  );
}
