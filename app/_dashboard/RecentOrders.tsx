import Link from "next/link";
import { ChevronRight, ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatDate } from "@/lib/format";
import { NEW_ORDER_HREF } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { DashboardOverview } from "./types";

/** Na telefonu se vidi prvih 5, od md svih 10. */
const MOBILE_LIMIT = 5;

export function RecentOrders({ latest }: { latest: DashboardOverview["latest"] | undefined }) {
  return (
    <section aria-labelledby="poslednje-narudzbine" className="flex flex-col rounded-2xl bg-surface ring-1 ring-border">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-1 md:px-5 md:pt-5 md:pb-2">
        <h2 id="poslednje-narudzbine" className="text-base font-semibold text-text">
          Poslednje narudžbine
        </h2>
        <Link
          href="/narudzbine"
          className="inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring md:min-h-0 md:text-[13px]"
        >
          Sve narudžbine
          <ChevronRight className="size-4 md:size-3.5" aria-hidden />
        </Link>
      </div>

      {latest === undefined ? (
        <div className="flex flex-col gap-2 px-4 pb-4 md:px-5 md:pb-5">
          {Array.from({ length: MOBILE_LIMIT }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      ) : latest.length === 0 ? (
        <EmptyState
          compact
          icon={ClipboardList}
          title="Još nema narudžbina"
          description="Prva narudžbina će se pojaviti ovde."
          action={
            <Button asChild size="sm">
              <Link href={NEW_ORDER_HREF}>
                <Plus className="size-4" aria-hidden />
                Nova narudžbina
              </Link>
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border px-2 pb-2 md:px-3 md:pb-3">
          {latest.map((order, index) => (
            <li key={order._id} className={cn(index >= MOBILE_LIMIT && "max-md:hidden")}>
              <Link
                href={`/narudzbine/${order._id}`}
                className={cn(
                  "grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 rounded-lg px-2 py-2 transition-colors duration-(--duration-fast) hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  "md:grid-cols-[88px_minmax(0,1fr)_120px_110px_110px] md:py-2.5",
                )}
              >
                <span className="num text-[13px] text-text-muted max-md:hidden">{formatDate(order.kreiranoAt)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-medium text-text md:text-sm">{order.title}</span>
                  <span className="truncate text-[13px] text-text-muted">
                    <span className="md:hidden">{formatDate(order.kreiranoAt)} · </span>
                    {order.customerName}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1 md:contents">
                  <StageBadge stage={order.stage} className="md:justify-self-start" />
                  <span className="text-[13px] max-md:hidden md:text-right">
                    <span className="sr-only">Prodajno </span>
                    <Money value={order.prodajno} tone="muted" />
                  </span>
                  <span className="text-[13px] font-medium md:text-right md:text-sm">
                    <span className="sr-only">Profit </span>
                    <Money value={order.profit} tone="profit" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
