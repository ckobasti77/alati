import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepperStep = { key: string; label: string };

/**
 * Koraci toka (uvoz priznanica, WA uvoz, legle pare). Završeni korak ima ✓, trenutni je naglašen
 * (`aria-current="step"`), sledeći su prigušeni. Na telefonu staje u jedan red (2–4 kratka koraka).
 */
export function Stepper({ steps, current, className, label = "Koraci" }: { steps: StepperStep[]; current: number; className?: string; label?: string }) {
  return (
    <ol aria-label={label} className={cn("flex items-center gap-2", className)}>
      {steps.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={step.key} aria-current={active ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "num inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-colors duration-(--duration-base)",
                done && "bg-accent-soft text-accent-text",
                active && "bg-accent text-accent-fg",
                !done && !active && "text-text-muted ring-1 ring-inset ring-border-strong",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : index + 1}
            </span>
            <span className={cn("min-w-0 truncate text-[13px] md:text-sm", active ? "font-semibold text-text" : "text-text-muted")}>
              {step.label}
              {done ? <span className="sr-only"> (završeno)</span> : null}
            </span>
            {index < steps.length - 1 ? <span aria-hidden className={cn("h-px min-w-3 flex-1", done ? "bg-accent/40" : "bg-border")} /> : null}
          </li>
        );
      })}
    </ol>
  );
}
