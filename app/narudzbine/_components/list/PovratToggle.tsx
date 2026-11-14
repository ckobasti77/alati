"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { ZA_POVRAT_STAGE } from "@/lib/zaPovrat";
import { cn } from "@/lib/utils";
import type { Order } from "@/types/order";
import { useOrdersList } from "./OrdersListContext";

/** Oznaka „Povrat urađen“ ima smisla samo u Leglu (ili kad je već označena, da može da se poništi). */
export const showsPovratToggle = (order: Order) => order.stage === ZA_POVRAT_STAGE || Boolean(order.povratVracen);

/**
 * „Povrat urađen“ jednim tapom iz liste. Prikaz se menja odmah (optimistično), a vraća se ako snimanje ne uspe.
 * U filteru Za povrat red posle čekiranja izlazi iz liste (usePresenceList), sa već čekiranim stanjem.
 * - `pill`: kompaktna kartica (telefon) i kartica (desktop), meta 44px
 * - `switch`: detaljna kartica (telefon)
 * - `checkbox`: kolona Povrat u tabeli
 */
export function PovratToggle({
  order,
  title,
  variant,
  disabled = false,
  className,
}: {
  order: Order;
  title: string;
  variant: "pill" | "switch" | "checkbox";
  disabled?: boolean;
  className?: string;
}) {
  const ctx = useOrdersList();
  const actual = Boolean(order.povratVracen);
  // Optimistična vrednost važi samo dok server ne potvrdi (`actual` dobije istu vrednost); posle toga se briše,
  // pa kasnija spoljna izmena (drugi uređaj, grupna akcija) uvek pobeđuje.
  const [pending, setPending] = useState<{ value: boolean; from: boolean } | null>(null);
  if (pending && actual === pending.value) setPending(null);
  const checked = pending && pending.from === actual ? pending.value : actual;
  const label = `Povrat urađen: ${title}`;

  const change = async (next: boolean) => {
    setPending({ value: next, from: actual });
    const saved = await ctx.rowActions.handlePovratToggle(order, next);
    if (!saved) setPending(null);
  };

  if (variant === "switch") {
    return (
      <label className={cn("flex min-h-11 cursor-pointer items-center gap-2 text-text-muted", className)}>
        Povrat urađen
        <Switch checked={checked} disabled={disabled} onCheckedChange={(value) => void change(value)} aria-label={label} />
      </label>
    );
  }

  if (variant === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => void change(event.target.checked)}
        onClick={(event) => event.stopPropagation()}
        aria-label={label}
        title={checked ? "Povrat urađen" : "Označi: povrat urađen"}
        className={cn("size-4 cursor-pointer accent-accent", className)}
      />
    );
  }

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        void change(!checked);
      }}
      className={cn(
        "relative inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium transition-colors duration-(--duration-fast)",
        // Meta 44px bez većeg reda: proširenje ide nadole (iznad je red sa pozivom).
        "after:absolute after:-inset-x-1 after:-top-1 after:-bottom-3 after:content-['']",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-success-soft text-success" : "text-text-muted ring-1 ring-inset ring-border-strong hover:bg-surface-2",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-3.5 items-center justify-center rounded-full transition-colors",
          checked ? "bg-success text-surface" : "ring-1 ring-inset ring-current",
        )}
      >
        {checked ? <Check className="size-2.5" strokeWidth={3.5} /> : null}
      </span>
      {checked ? "Povrat urađen" : "Povrat"}
    </button>
  );
}
