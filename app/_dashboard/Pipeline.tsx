import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { STAGES } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { pluralNarudzbina } from "./format";
import type { DashboardOverview } from "./types";

export function Pipeline({ pipeline }: { pipeline: DashboardOverview["pipeline"] | undefined }) {
  const total = pipeline?.reduce((sum, entry) => sum + entry.count, 0) ?? 0;

  return (
    <section aria-labelledby="u-toku" className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border md:h-full md:p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="u-toku" className="text-base font-semibold text-text">
          U toku
        </h2>
        <p className="text-[13px] text-text-muted">
          {pipeline ? `${pluralNarudzbina(total)} · ` : null}trenutno stanje
        </p>
      </div>

      {pipeline === undefined ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-2 w-full rounded-full" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState compact icon={Inbox} title="Nema narudžbina u toku" description="Sve je stiglo, leglo ili vraćeno." />
      ) : (
        <>
          <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {pipeline
              .filter((entry) => entry.count > 0)
              .map((entry) => (
                <span
                  key={entry.stage}
                  className={cn("h-full first:rounded-l-full last:rounded-r-full", STAGES[entry.stage].dotClass)}
                  style={{ flexGrow: entry.count, flexBasis: 0 }}
                />
              ))}
          </div>
          <ul className="-mx-2 flex flex-col">
            {pipeline.map((entry) => {
              const meta = STAGES[entry.stage];
              return (
                <li key={entry.stage}>
                  <Link
                    href={`/narudzbine?stage=${entry.stage}`}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg px-2 transition-colors duration-(--duration-fast) hover:bg-surface-2",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    <span className={cn("size-2.5 shrink-0 rounded-full", meta.dotClass)} aria-hidden />
                    <span className={cn("flex-1 text-[15px] md:text-sm", entry.count > 0 ? "text-text" : "text-text-muted")}>
                      {meta.label}
                    </span>
                    <Money value={entry.prodajno} tone="muted" className="text-[13px]" />
                    <span className={cn("num w-8 text-right text-[15px] font-semibold md:text-sm", entry.count > 0 ? "text-text" : "text-text-muted")}>
                      {entry.count}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
