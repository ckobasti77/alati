"use client";

import type { LucideIcon } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label?: React.ReactNode;
  icon?: LucideIcon;
  /** Obavezno kad opcija ima samo ikonicu. */
  ariaLabel?: string;
  disabled?: boolean;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: SegmentedOption<T>[];
  ariaLabel: string;
  /** Rastegni opcije preko cele širine (npr. u sheet-u). */
  fullWidth?: boolean;
  /** Grid sa N kolona (više redova) kad opcije ne staju u jedan red. */
  columns?: number;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  fullWidth = false,
  columns,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((option) => !option.disabled);
  // Tab stop: izabrana opcija, a ako je onemogućena ili nepoznata, prva dostupna.
  const tabStop = enabled.some((option) => option.value === value) ? value : enabled[0]?.value;

  const move = (step: number | "first" | "last") => {
    const currentIndex = enabled.findIndex((option) => option.value === value);
    const nextIndex =
      step === "first" || (currentIndex === -1 && step === 1)
        ? 0
        : step === "last" || (currentIndex === -1 && step === -1)
          ? enabled.length - 1
          : (currentIndex + (step as number) + enabled.length) % enabled.length;
    const next = enabled[nextIndex];
    if (!next) return;
    onChange(next.value);
    refs.current[options.indexOf(next)]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex gap-0.5 rounded-xl bg-surface-2 p-0.5 ring-1 ring-inset ring-border",
        fullWidth && "flex w-full",
        columns && "grid w-full",
        className,
      )}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined}
      onKeyDown={(event) => {
        // Alt+strelice su nazad/napred u browseru.
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") move(1);
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") move(-1);
        else if (event.key === "Home") move("first");
        else if (event.key === "End") move("last");
        else return;
        event.preventDefault();
      }}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            disabled={option.disabled}
            tabIndex={option.value === tabStop ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast) md:h-8 md:min-w-8 md:px-2.5",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
              (fullWidth || columns) && "flex-1",
              checked
                ? "bg-raised text-text shadow-(--shadow-raised) ring-1 ring-inset ring-border"
                : "text-text-muted hover:text-text",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
