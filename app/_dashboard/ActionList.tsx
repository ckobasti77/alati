import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlarmClock, BellRing, CheckCircle2, ChevronRight, PackageOpen, RotateCcw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatKeyRange } from "./format";
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

function buildItems(actions: DashboardOverview["actions"]): ActionItem[] {
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
    {
      key: "refund",
      icon: RotateCcw,
      label: "100% povrat",
      detail: [
        formatCurrency(refund.pendingAmount, "EUR"),
        refund.period ? formatKeyRange(refund.period.startDate, refund.period.endDate) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      count: refund.pendingCount,
      href: refund.period
        ? `/narudzbine?from=${refund.period.startDate}&to=${refund.period.endDate}&unreturned=1`
        : "/narudzbine",
      tone: "warning",
    },
    {
      key: "restock",
      icon: BellRing,
      label: "Zahtevi za dopunu",
      detail: "Kupci čekaju da se proizvod vrati",
      count: actions.restock,
      href: "/narudzbine?restock=1",
      tone: "accent",
    },
  ];
  return items.filter((item) => item.count > 0);
}

const iconTone = {
  warning: "bg-warning-soft text-warning",
  accent: "bg-accent-soft text-accent-text",
} as const;

export function ActionList({ actions }: { actions: DashboardOverview["actions"] | undefined }) {
  const items = actions ? buildItems(actions) : null;

  return (
    <section aria-labelledby="za-akciju" className="flex flex-col gap-2 md:gap-3">
      <h2 id="za-akciju" className="text-base font-semibold text-text">
        Za akciju
      </h2>

      {items === null ? (
        <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border md:grid md:grid-cols-4 md:gap-3 md:bg-transparent md:ring-0">
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
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-surface ring-1 ring-border md:grid md:grid-cols-4 md:gap-3 md:divide-y-0 md:overflow-visible md:bg-transparent md:ring-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
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
                    <span className="text-[15px] font-medium leading-5 text-text md:text-sm">{item.label}</span>
                    <span className="line-clamp-1 text-[13px] leading-5 text-text-muted md:line-clamp-2">{item.detail}</span>
                  </span>
                  <span className="num text-xl font-semibold text-text">{item.count}</span>
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
