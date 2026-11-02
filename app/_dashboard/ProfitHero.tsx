import { TrendingDown, TrendingUp } from "lucide-react";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { profitDelta, type DashboardPeriod, type DashboardTotals } from "@/lib/dashboard";
import { cn } from "@/lib/utils";
import { PERIOD_LABELS, formatMonthLong, formatPercent, pluralNarudzbina } from "./format";
import type { DashboardOverview } from "./types";

type ProfitHeroProps = {
  period: DashboardPeriod;
  data: Pick<DashboardOverview, "totals" | "previous" | "period"> | undefined;
  stale?: boolean;
};

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-xs font-medium text-text-muted">{label}</dt>
      <dd className="truncate text-[15px] font-medium leading-6 text-text md:text-base">{children}</dd>
    </div>
  );
}

function periodTitle(period: DashboardPeriod, data: ProfitHeroProps["data"]) {
  if (period === "prosli" && data?.period.startKey) return formatMonthLong(data.period.startKey.slice(0, 7));
  return PERIOD_LABELS[period].title;
}

function Delta({ period, totals, previous }: { period: DashboardPeriod; totals: DashboardTotals; previous: DashboardTotals | null }) {
  const delta = profitDelta(totals, previous);
  const versus = PERIOD_LABELS[period].previous;
  if (delta === null || !versus) return null;
  const up = delta >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] leading-5 text-text-muted">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
          up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        <span className="num">{formatPercent(delta)}</span>
      </span>
      <span>
        u odnosu na {versus} (<Money value={previous?.profit} className="text-text-muted" />)
      </span>
    </p>
  );
}

export function ProfitHero({ period: requestedPeriod, data, stale = false }: ProfitHeroProps) {
  // Dok se novi period ucitava, labele prate podatke koji se vide (stari period).
  const period = data?.period.key ?? requestedPeriod;
  const totals = data?.totals;
  const average = totals && totals.brojNarudzbina > 0 ? totals.profit / totals.brojNarudzbina : null;

  return (
    <section
      aria-labelledby="profit-hero"
      aria-busy={!data || stale}
      className={cn(
        "flex flex-col gap-4 rounded-2xl bg-surface p-4 ring-1 ring-border transition-opacity duration-(--duration-fast) md:h-full md:p-5",
        stale && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-1">
        <h2 id="profit-hero" className="text-sm font-medium text-text-muted">
          Profit · {periodTitle(period, data)}
        </h2>
        {totals ? (
          <>
            <Money
              value={totals.profit}
              tone={totals.brojNarudzbina > 0 ? "profit" : "muted"}
              className="text-4xl font-semibold leading-[44px] tracking-tight md:text-5xl md:leading-[56px]"
            />
            {totals.brojNarudzbina > 0 ? (
              <Delta period={period} totals={totals} previous={data?.previous ?? null} />
            ) : (
              <p className="text-[13px] leading-5 text-text-muted">Nema narudžbina sa statusom Leglo u ovom periodu.</p>
            )}
          </>
        ) : (
          <>
            <Skeleton className="h-11 w-48 md:h-14 md:w-64" />
            <Skeleton className="h-5 w-56" />
          </>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
        {totals ? (
          <>
            <Stat label="Prodajno">
              <Money value={totals.ukupnoProdajno} />
            </Stat>
            <Stat label="Nabavno">
              <Money value={totals.ukupnoNabavno} />
            </Stat>
            <Stat label="Transport">
              <Money value={totals.ukupnoTransport} />
            </Stat>
            <Stat label="Omer (Aks × 2,5 €)">
              <Money value={totals.omerUkupno > 0 ? -totals.omerUkupno : 0} />
            </Stat>
            <Stat label="Leglo">
              <span className="num">{pluralNarudzbina(totals.brojNarudzbina)}</span>
            </Stat>
            <Stat label="Prosečno po narudžbini">
              <Money value={average} tone="profit" />
            </Stat>
          </>
        ) : (
          Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-24" />
            </div>
          ))
        )}
      </dl>

      <p className="-mt-1 text-xs text-text-muted">
        Računa se samo status Leglo, po datumu kreiranja narudžbine. Profit je umanjen za Omer.
      </p>
    </section>
  );
}
