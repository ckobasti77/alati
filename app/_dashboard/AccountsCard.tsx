"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { DashboardTotals } from "@/lib/dashboard";
import type { ObracunSummary } from "@/types/order";
import { pluralNarudzbina } from "./format";

type AccountsCardProps = {
  obracun: ObracunSummary | undefined;
  /** Zbir od pocetka (Licno preuzimanje). */
  allTime: DashboardTotals | undefined;
};

function Row({ label, sub, value, strong = false }: { label: React.ReactNode; sub?: React.ReactNode; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className={cn("truncate text-[15px] md:text-sm", strong ? "font-semibold text-text" : "text-text")}>{label}</span>
        {sub ? <span className="text-[13px] leading-5 text-text-muted">{sub}</span> : null}
      </div>
      <span className={cn("shrink-0 text-[15px] md:text-sm", strong ? "font-semibold text-text" : "text-text")}>{value}</span>
    </div>
  );
}

function GroupTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="pt-3 pb-1 text-xs font-medium text-text-muted">{children}</h3>;
}

export function AccountsCard({ obracun, allTime }: AccountsCardProps) {
  const [open, setOpen] = useState(false);
  const contentId = useId();

  const aksBex = obracun?.aksBex;
  const fromOrders = aksBex ? (aksBex.totalFromOrders ?? aksBex.totalAks + aksBex.totalBex) : 0;
  const starting = aksBex?.totalStarting ?? 0;
  const posta = obracun?.posta.total ?? 0;
  const grandTotal = (aksBex?.totalWithStarting ?? aksBex?.total ?? 0) + posta;
  const hasAccounts = Boolean(obracun && (aksBex!.byOwner.length > 0 || obracun.posta.byOwner.length > 0));

  // Na telefonu je naslov dugme za sklapanje; od md je obican naslov (vidljiv je uvek samo jedan).
  return (
    <section aria-label="Novac po računima" className="flex flex-col rounded-2xl bg-surface ring-1 ring-border md:h-full">
      <h2 className="md:hidden">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-2xl px-4 py-3 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex min-w-0 flex-1 flex-col text-left">
            <span className="text-base font-semibold text-text">Novac po računima</span>
            <span className="text-[13px] text-text-muted">
              {obracun ? (
                <>
                  Ukupno na računima <Money value={grandTotal} className="font-medium text-text" />
                </>
              ) : (
                "Učitavanje…"
              )}
            </span>
          </span>
          <ChevronDown
            className={cn("size-5 shrink-0 text-text-muted transition-transform duration-(--duration-base)", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </h2>
      <div className="flex items-center justify-between gap-3 px-5 pt-5 max-md:hidden">
        <h2 className="text-base font-semibold text-text">Novac po računima</h2>
        <Link
          href="/obracun"
          className="inline-flex items-center gap-1 rounded-md text-[13px] font-medium text-accent-text hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Detaljan obračun
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      <div id={contentId} className={cn("px-4 pb-4 md:block md:px-5 md:pb-5", !open && "max-md:hidden")}>
        {obracun === undefined ? (
          <div className="flex flex-col gap-2 pt-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : !hasAccounts ? (
          <p className="pt-3 text-sm text-text-muted">Još nema narudžbina sa statusom Leglo i unetim računom ili imenom za Poštu.</p>
        ) : (
          <div className="flex flex-col">
            {aksBex!.byOwner.length > 0 ? (
              <>
                <GroupTitle>Aks / Bex</GroupTitle>
                <div className="divide-y divide-border">
                  {aksBex!.byOwner.map((row) => {
                    const ordersTotal = row.ordersTotal ?? row.total - (row.startingAmount ?? 0);
                    const startingAmount = row.startingAmount ?? 0;
                    return (
                      <div key={row.owner}>
                        <Row
                          label={row.owner}
                          sub={
                            <>
                              Aks <Money value={row.aks ?? 0} className="text-text-muted" /> · Bex{" "}
                              <Money value={row.bex ?? 0} className="text-text-muted" /> · {pluralNarudzbina(row.count)}
                            </>
                          }
                          value={<Money value={ordersTotal} />}
                        />
                        {startingAmount > 0 ? (
                          <div className="-mt-1 mb-2 flex flex-col gap-1 rounded-lg bg-surface-2 px-3 py-2 text-[13px] leading-5">
                            <div className="flex justify-between gap-3 text-text-muted">
                              <span>+ Početno stanje računa</span>
                              <Money value={startingAmount} className="text-text-muted" />
                            </div>
                            <div className="flex justify-between gap-3 font-medium text-text">
                              <span>Na računu</span>
                              <Money value={row.total} />
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}

            {obracun.posta.byOwner.length > 0 ? (
              <>
                <GroupTitle>Pošta</GroupTitle>
                <div className="divide-y divide-border">
                  {obracun.posta.byOwner.map((row) => (
                    <Row key={row.owner} label={row.owner} sub={pluralNarudzbina(row.count)} value={<Money value={row.total} />} />
                  ))}
                </div>
              </>
            ) : null}

            <div className="mt-3 flex flex-col border-t border-border pt-1">
              <Row label="Od narudžbina (Leglo)" value={<Money value={fromOrders + posta} />} />
              {starting > 0 ? (
                <Row
                  label="Početno stanje računa"
                  sub="Uneto ručno u Obračunu kao stanje pre aplikacije. Nije zarada od narudžbina."
                  value={<Money value={starting} />}
                />
              ) : null}
              <Row label="Ukupno na računima" value={<Money value={grandTotal} />} strong />
            </div>

            {allTime && allTime.licnoPreuzimanjeBrojNarudzbina > 0 ? (
              <div className="mt-1 border-t border-border pt-1">
                <Row
                  label="Lično preuzimanje"
                  sub={`${pluralNarudzbina(allTime.licnoPreuzimanjeBrojNarudzbina)} · gotovina, nije na računu`}
                  value={<Money value={allTime.ukupnoLicnoPreuzimanje} />}
                />
              </div>
            ) : null}
          </div>
        )}

        <Link
          href="/obracun"
          className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-accent-text focus-visible:outline-2 focus-visible:outline-ring md:hidden"
        >
          Detaljan obračun
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
