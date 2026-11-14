"use client";

import { Info } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Money } from "@/components/ui/money";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ObracunOwnerTotal, ObracunSummary } from "@/types/order";
import { pluralNarudzbina } from "@/app/_dashboard/format";

/** Isti tekst kao na tabli (Novac po računima): početno stanje je zaseban, objašnjen iznos. */
export const STARTING_EXPLANATION =
  "Početno stanje je novac koji je bio na računu pre nego što je evidencija počela. Upisuje se ručno uz račun i ne dolazi iz narudžbina. Na računu = Početno + Leglo.";

export function StartingInfo({ className }: { className?: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton aria-label="Šta je početno stanje?" className={cn("-my-2 text-text-muted", className)}>
          <Info />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 text-[13px] leading-5 text-text" aria-label="Početno stanje">
        {STARTING_EXPLANATION}
      </PopoverContent>
    </Popover>
  );
}

const ordersTotalOf = (row: ObracunOwnerTotal) => row.ordersTotal ?? row.total - (row.startingAmount ?? 0);

function Stat({ label, value, sub, strong = false, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; strong?: boolean; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 bg-surface px-4 py-3 md:px-5 md:py-4", className)}>
      <dt className="text-[13px] text-text-muted">{label}</dt>
      <dd className={cn("num font-semibold tracking-tight text-text", strong ? "text-2xl md:text-3xl" : "text-xl md:text-2xl")}>{value}</dd>
      {sub ? <dd className="text-[13px] leading-5 text-text-muted">{sub}</dd> : null}
    </div>
  );
}

/** Tri zbira: ukupno na računima (sa početnim), Aks/Bex, Pošta. */
export function SummaryTiles({ data }: { data: ObracunSummary }) {
  const aksBexTotal = data.aksBex.totalWithStarting ?? data.aksBex.total;
  const starting = data.aksBex.totalStarting ?? 0;
  const grandTotal = aksBexTotal + data.posta.total;
  return (
    <section aria-label="Zbirovi" className="overflow-hidden rounded-2xl ring-1 ring-border">
      <dl className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
        <Stat
          strong
          className="col-span-2 md:col-span-1"
          label="Ukupno na računima"
          value={<Money value={grandTotal} />}
          sub={
            <>
              {pluralNarudzbina(data.meta.ordersCount)} u Leglu
              {starting > 0 ? (
                <>
                  {" "}· uključuje početno <Money value={starting} className="text-text-muted" />
                </>
              ) : null}
            </>
          }
        />
        <Stat
          label="Aks / Bex"
          value={<Money value={aksBexTotal} />}
          sub={
            <>
              Aks <Money value={data.aksBex.totalAks} className="text-text-muted" /> · Bex <Money value={data.aksBex.totalBex} className="text-text-muted" />
            </>
          }
        />
        <Stat label="Pošta" value={<Money value={data.posta.total} />} sub={pluralNarudzbina(data.posta.byOwner.reduce((sum, row) => sum + row.count, 0))} />
      </dl>
    </section>
  );
}

const thClass =
  "sticky top-(--header-h) z-(--z-sticky) bg-surface px-3 py-2 text-[11px] leading-4 font-medium uppercase tracking-[0.06em] text-text-muted shadow-[inset_0_-1px_0_var(--color-border)]";
const tdClass = "px-3 py-3 shadow-[inset_0_-1px_0_var(--color-border)]";
const tfClass = "px-3 py-3 font-semibold text-text";

function SectionCard({ id, title, aside, children }: { id: string; title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-2xl bg-surface ring-1 ring-border">
      <div className="flex min-h-14 items-center justify-between gap-3 px-4 py-3 md:px-5">
        <h2 id={id} className="text-base font-semibold text-text">
          {title}
        </h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Aks + Bex po računima: telefon = lista kartica, desktop = tabela sa sticky zaglavljem i zbirom. */
export function AksBexAccounts({ data }: { data: ObracunSummary }) {
  const rows = data.aksBex.byOwner;
  const totalStarting = data.aksBex.totalStarting ?? 0;
  const totalOrders = data.aksBex.totalFromOrders ?? data.aksBex.totalAks + data.aksBex.totalBex;
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <SectionCard id="obracun-aksbex" title="Aks + Bex po računima">
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-muted md:px-5 md:pb-5">Još nema narudžbina u Leglu preko Aksa ili Bexa sa unetim računom.</p>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border md:hidden">
            {rows.map((row) => {
              const starting = row.startingAmount ?? 0;
              return (
                <li key={row.owner} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="min-w-0 truncate text-[15px] font-semibold text-text">{row.owner}</p>
                    <Money value={row.total} className="text-[17px] font-semibold text-text" />
                  </div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] leading-5">
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Leglo</dt>
                      <dd><Money value={ordersTotalOf(row)} /></dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Početno</dt>
                      <dd><Money value={starting} className={starting > 0 ? undefined : "text-text-muted"} /></dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Aks</dt>
                      <dd><Money value={row.aks ?? 0} className="text-text-muted" /></dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-text-muted">Bex</dt>
                      <dd><Money value={row.bex ?? 0} className="text-text-muted" /></dd>
                    </div>
                    <div className="col-span-2 flex justify-between gap-2">
                      <dt className="text-text-muted">Narudžbina</dt>
                      <dd className="num text-text">{row.count.toLocaleString("sr-RS")}</dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
          <p className="flex items-start gap-2 border-t border-border px-4 py-3 text-[13px] leading-5 text-text-muted md:hidden">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            {STARTING_EXPLANATION}
          </p>

          <div className="max-md:hidden">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Aks + Bex po računima</caption>
              <thead>
                <tr>
                  <th scope="col" className={cn(thClass, "text-left")}>Račun</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Na računu</th>
                  <th scope="col" className={cn(thClass, "text-right")}>
                    <span className="inline-flex items-center justify-end gap-0.5">
                      Početno
                      <StartingInfo className="size-7 md:size-7 [&_svg]:size-3.5" />
                    </span>
                  </th>
                  <th scope="col" className={cn(thClass, "text-right")}>Leglo</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Aks</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Bex</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Narudžbina</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.owner} className="hover:bg-surface-2">
                    <th scope="row" className={cn(tdClass, "text-left font-medium text-text")}>{row.owner}</th>
                    <td className={cn(tdClass, "text-right font-semibold")}><Money value={row.total} /></td>
                    <td className={cn(tdClass, "text-right text-text-muted")}><Money value={row.startingAmount ?? 0} /></td>
                    <td className={cn(tdClass, "text-right")}><Money value={ordersTotalOf(row)} /></td>
                    <td className={cn(tdClass, "text-right text-text-muted")}><Money value={row.aks ?? 0} /></td>
                    <td className={cn(tdClass, "text-right text-text-muted")}><Money value={row.bex ?? 0} /></td>
                    <td className={cn(tdClass, "num text-right text-text")}>{row.count.toLocaleString("sr-RS")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={cn(tfClass, "text-left")}>Ukupno</th>
                  <td className={cn(tfClass, "text-right")}><Money value={data.aksBex.totalWithStarting ?? data.aksBex.total} /></td>
                  <td className={cn(tfClass, "text-right")}><Money value={totalStarting} /></td>
                  <td className={cn(tfClass, "text-right")}><Money value={totalOrders} /></td>
                  <td className={cn(tfClass, "text-right")}><Money value={data.aksBex.totalAks} /></td>
                  <td className={cn(tfClass, "text-right")}><Money value={data.aksBex.totalBex} /></td>
                  <td className={cn(tfClass, "num text-right")}>{totalCount.toLocaleString("sr-RS")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/** Pošta po imenima/brojevima. */
export function PostaAccounts({ data }: { data: ObracunSummary }) {
  const rows = data.posta.byOwner;
  const totalCount = rows.reduce((sum, row) => sum + row.count, 0);
  return (
    <SectionCard id="obracun-posta" title="Pošta">
      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-text-muted md:px-5 md:pb-5">Još nema narudžbina u Leglu preko Pošte.</p>
      ) : (
        <>
          <ul className="divide-y divide-border border-t border-border md:hidden">
            {rows.map((row) => (
              <li key={row.owner} className="flex min-h-14 items-center justify-between gap-3 px-4 py-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-medium text-text">{row.owner}</span>
                  <span className="text-[13px] text-text-muted">{pluralNarudzbina(row.count)}</span>
                </div>
                <Money value={row.total} className="text-[15px] font-semibold text-text" />
              </li>
            ))}
          </ul>
          <div className="max-md:hidden">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <caption className="sr-only">Pošta</caption>
              <thead>
                <tr>
                  <th scope="col" className={cn(thClass, "text-left")}>Ime / broj</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Ukupno</th>
                  <th scope="col" className={cn(thClass, "text-right")}>Narudžbina</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.owner} className="hover:bg-surface-2">
                    <th scope="row" className={cn(tdClass, "text-left font-medium text-text")}>{row.owner}</th>
                    <td className={cn(tdClass, "text-right font-semibold")}><Money value={row.total} /></td>
                    <td className={cn(tdClass, "num text-right text-text")}>{row.count.toLocaleString("sr-RS")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className={cn(tfClass, "text-left")}>Ukupno</th>
                  <td className={cn(tfClass, "text-right")}><Money value={data.posta.total} /></td>
                  <td className={cn(tfClass, "num text-right")}>{totalCount.toLocaleString("sr-RS")}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </SectionCard>
  );
}

/** Skeleton istih dimenzija kao zbirovi i sekcije (bez skoka pri učitavanju). */
export function ObracunSkeleton() {
  return (
    <div className="flex flex-col gap-4 md:gap-6" aria-hidden>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border ring-1 ring-border md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className={cn("flex flex-col gap-2 bg-surface px-4 py-3 md:px-5 md:py-4", index === 0 && "col-span-2 md:col-span-1")}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
      {[0, 1].map((index) => (
        <div key={index} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border md:p-5">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 3 }, (_, row) => (
            <Skeleton key={row} className="h-12 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
