import { ReactNode } from "react";

export function PageHeader({
  eyebrow, title, action,
}: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold">{eyebrow}</p>
        )}
        <h1 className="mt-1 font-display text-3xl text-primary md:text-4xl">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">{children}</div>;
}
