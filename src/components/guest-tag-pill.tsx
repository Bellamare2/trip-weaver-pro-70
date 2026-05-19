import { type GuestTag, tagStyles } from "@/lib/domain";

export function GuestTagPill({ tag, size = "md" }: { tag: GuestTag; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9px]" : "px-2 py-0.5 text-[10px]";
  return (
    <span
      className={`inline-flex items-center rounded-full border uppercase tracking-wider font-medium ${pad} ${tagStyles[tag]}`}
    >
      {tag}
    </span>
  );
}
