"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { useListEntrance } from "@/lib/motion/useListEntrance";
import type { LucideIcon } from "lucide-react";
import { AlarmClock, CheckCircle2, ChevronRight, PackageOpen, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConvexQueryState } from "@/lib/convex";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ZA_POVRAT_HREF, ZA_POVRAT_STAGE } from "@/lib/zaPovrat";
import type { OrderListResponse } from "@/types/order";
import { formatKeyRange, pluralNarudzbina } from "./format";
import type { DashboardOverview } from "./types";

type ActionItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  detail: string;
  count: number;
  href: string;
  tone: "warning" | "accent";
};

type ZaPovrat = { count: number; amount: number } | null;

function buildItems(actions: DashboardOverview["actions"], zaPovrat: ZaPovrat): ActionItem[] {
  const { refund } = actions;
  const items: ActionItem[] = [
    {
      key: "late",
      icon: AlarmClock,
      label: "Kasni",
      detail: "Poslato, a nije stiglo na vreme",
      count: actions.late,
      href: "/narudzbine?late=1",
      tone: "warning",
    },
    {
      key: "shipping",
      icon: PackageOpen,
      label: "Čeka slanje",
      detail: "Aks i Na stanju, za kurira",
      count: actions.awaitingShipment,
      href: "/narudzbine?stage=aks&stage=na_stanju&shipping=1",
      tone: "accent",
    },
  ];
  if (zaPovrat) {
    items.push({
      key: "za-povrat",
      icon: RotateCcw,
      label: "Za povrat",
      // Leglo + povrat nije urađen; iznos je postojeći proračun povrata (ulog + transport + 50% profita).
      detail: [
        formatCurrency(zaPovrat.amount, "EUR"),
        refund.period ? `100%: ${formatKeyRange(refund.period.startDate, refund.period.endDate)}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      count: zaPovrat.count,
      href: ZA_POVRAT_HREF,
      tone: "warning",
    });
  }
  return items.filter((item) => item.count > 0);
}

/** Za povrat (Leglo + povrat nije urađen): broj i iznos iz postojećeg `orders:list` (samo zbirovi). */
function useZaPovrat(token: string): { value: ZaPovrat; loading: boolean } {
  const { data, error } = useConvexQueryState<OrderListResponse>("orders:list", {
    token,
    scope: "default",
    stages: [ZA_POVRAT_STAGE],
    unreturnedOnly: true,
    page: 1,
    pageSize: 1,
  });
  // Greška ovog query-ja samo sakriva stavku (ostatak table radi).
  if (error) return { value: null, loading: false };
  if (!data) return { value: null, loading: true };
  return { value: { count: data.pagination.total, amount: data.totals.povrat }, loading: false };
}

const iconTone = {
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent-text",
} as const;

export function ActionList({ actions, token }: { actions: DashboardOverview["actions"] | undefined; token: string }) {
  const zaPovrat = useZaPovrat(token);
  const items = actions && !zaPovrat.loading ? buildItems(actions, zaPovrat.value) : null;
  const listRef = useRef<HTMLUListElement | null>(null);
  const keys = useMemo(() => (items ?? []).map((item) => item.key), [items]);
  useListEntrance(listRef, keys);

  return (
    <section aria-labelledby="za-akciju" className="flex flex-col gap-2 md:gap-3">
      <h2 id="za-akciju" className="text-base font-semibold text-text">
        Za akciju
      </h2>

      {items === null ? (
        <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border md:grid md:grid-cols-3 md:gap-3 md:bg-transparent md:ring-0">
          {[0, 1, 2].map((index) => (
            <div key={index} className="flex h-14 items-center gap-3 px-4 md:h-[88px] md:rounded-2xl md:bg-surface md:ring-1 md:ring-border">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="flex min-h-12 items-center gap-3 rounded-2xl bg-surface px-4 text-sm text-text-muted ring-1 ring-border">
          <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
          Ništa ne čeka: nema zakasnelih, neposlatih ni povrata.
        </p>
      ) : (
        <ul ref={listRef} className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border md:grid md:grid-cols-3 md:gap-3 md:divide-y-0 md:overflow-visible md:bg-transparent md:ring-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key} data-flip-id={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    "group flex min-h-14 items-center gap-3 px-4 py-2 transition-colors duration-(--duration-fast) hover:bg-surface-2",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    "md:h-full md:min-h-[88px] md:rounded-2xl md:bg-surface md:py-3 md:ring-1 md:ring-border md:hover:bg-surface-2",
                  )}
                >
                  <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full", iconTone[item.tone])}>
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-medium leading-5 text-text md:text-sm">
                      {item.label}
                      <span className="sr-only">: {pluralNarudzbina(item.count)}.</span>
                    </span>
                    <span className="line-clamp-1 text-[13px] leading-5 text-text-muted md:line-clamp-2">{item.detail}</span>
                  </span>
                  <span aria-hidden className="num text-xl font-semibold text-text">
                    {item.count}
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-text-muted transition-transform duration-(--duration-fast) group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
