"use client";

import type { LucideIcon } from "lucide-react";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ChipProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: React.ReactNode;
  selected?: boolean;
  icon?: LucideIcon;
  /** Broj pored labele (npr. koliko stavki filter pogađa). */
  count?: number;
};

/** Filter/izbor čip. 44px na telefonu (red čipova se skroluje horizontalno), 32px od md. */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ label, selected = false, icon: Icon, count, className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium whitespace-nowrap ring-1 ring-inset transition-colors duration-(--duration-fast) md:h-8 md:px-3",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "bg-accent-soft text-accent-text ring-accent/40"
          : "bg-surface text-text-muted ring-border hover:bg-surface-2 hover:text-text",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {label}
      {typeof count === "number" ? (
        <span className={cn("num rounded-full px-1.5 text-xs leading-5", selected ? "bg-accent/15" : "bg-surface-2")}>{count}</span>
      ) : null}
    </button>
  ),
);

Chip.displayName = "Chip";
