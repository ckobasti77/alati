import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Sledeći korak (npr. "Nova narudžbina", "Očisti filtere", "Pokušaj ponovo"). */
  action?: React.ReactNode;
  /** `danger` za stanje greške. */
  tone?: "neutral" | "danger";
  compact?: boolean;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, tone = "neutral", compact = false, className }: EmptyStateProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : undefined}
      className={cn("flex flex-col items-center text-center", compact ? "gap-2 py-6" : "gap-3 py-12", className)}
    >
      {Icon ? (
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-full",
            tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-2 text-text-muted",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <div className="flex max-w-[38ch] flex-col gap-1">
        <p className="text-sm font-semibold text-text">{title}</p>
        {description ? <p className="text-sm leading-5 text-text-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
