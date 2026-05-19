import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { type ActivityStatus, nextStatus, statusStyles, statusDot } from "@/lib/domain";

export function StatusBadge({
  status,
  activityId,
  size = "md",
  clickable = true,
}: {
  status: ActivityStatus;
  activityId?: string;
  size?: "sm" | "md";
  clickable?: boolean;
}) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: async (next: ActivityStatus) => {
      if (!activityId) return;
      const { error } = await supabase.from("activities").update({ status: next }).eq("id", activityId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] });
      qc.invalidateQueries({ queryKey: ["guest-activities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pad = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  const handle = () => {
    if (!clickable || !activityId) return;
    m.mutate(nextStatus(status));
  };
  return (
    <button
      type="button"
      onClick={handle}
      disabled={!clickable || m.isPending}
      className={`inline-flex items-center gap-1.5 rounded-full font-medium uppercase tracking-wider ${pad} ${statusStyles[status]} ${clickable ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
      title={clickable ? "Click to change status" : undefined}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDot[status]}`} />
      {status}
    </button>
  );
}
