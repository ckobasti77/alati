"use client";

import { CalendarRange, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STAGE_OPTIONS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { formatRefundPeriodDate } from "../_lib/helpers";
import type { useOrdersFeed } from "../_hooks/useOrdersFeed";
import type { useRefundPeriod } from "../_hooks/useRefundPeriod";
import type { useOrdersPdf } from "../_hooks/useOrdersPdf";

type OrdersToolbarProps = {
  feed: ReturnType<typeof useOrdersFeed>;
  refund: ReturnType<typeof useRefundPeriod>;
  pdf: ReturnType<typeof useOrdersPdf>;
};

export function OrdersToolbar({ feed, refund, pdf }: OrdersToolbarProps) {
  const { search, setSearch, resetOrdersFeed, handleFilterMenuEnter, handleFilterMenuLeave, handleFilterMenuToggle, isFilterMenuOpen, activeFilterCount, setFilterMenuMode, stageFilters, handleStageFilterToggle, showUnreturnedOnly, handleUnreturnedToggle, showReturnedOnly, handleReturnedToggle, showPickupOnly, handlePickupToggle, showShippingOnly, handleShippingToggle, showLateOnly, handleLateToggle, dateFrom, handleDateFromChange, dateTo, handleDateToChange, dateFilterActive, handleClearDateFilter, isOrdersLoading, ordersPagination, orders, hasMoreOrders } = feed;
  const { refundPeriodOverview, openRefundPeriodModal } = refund;
  const { handleOrdersPdf, isOrdersPdfBusy, ordersPdfMode } = pdf;
  return (
    <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <CardTitle>Lista narudzbina</CardTitle>
        <p className="text-sm text-slate-500">Klikni na red za pregled. Stage se moze menjati direktno iz tabele.</p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Pretraga (naslov, kupac, telefon...)"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              resetOrdersFeed();
            }}
            className="sm:w-72"
          />
          <div className="grid w-full grid-cols-2 gap-2 sm:ml-auto sm:flex sm:w-auto sm:items-center">
            <div className="relative" onMouseEnter={handleFilterMenuEnter} onMouseLeave={handleFilterMenuLeave}>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2 sm:w-auto"
                onClick={handleFilterMenuToggle}
                aria-expanded={isFilterMenuOpen}
              >
                Filteri
                {activeFilterCount > 0 ? (
                  <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
              <div
                className={cn(
                  "fixed inset-0 z-40 flex items-start justify-center bg-slate-900/30 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+5rem)] transition md:absolute md:inset-auto md:right-0 md:top-full md:z-30 md:block md:w-72 md:bg-transparent md:p-0 md:pt-2",
                  isFilterMenuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                )}
                onClick={() => setFilterMenuMode("closed")}
              >
                <div
                  className="max-h-[calc(100dvh-6rem)] w-[min(96vw,40rem)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-lg md:max-h-none md:w-72"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stage</p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {STAGE_OPTIONS.map((option) => {
                          const isActive = stageFilters.includes(option.value);
                          return (
                            <label
                              key={option.value}
                              className={cn(
                                "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                                isActive
                                  ? option.tone
                                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isActive}
                                onChange={() => handleStageFilterToggle(option.value)}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              {option.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Povrat</p>
                      <div className="flex flex-col gap-2">
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                            showUnreturnedOnly
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={showUnreturnedOnly}
                            onChange={(event) => handleUnreturnedToggle(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Nepovraceni
                        </label>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                            showReturnedOnly
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={showReturnedOnly}
                            onChange={(event) => handleReturnedToggle(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Povraceno
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Preuzimanje</p>
                      <div className="flex flex-col gap-2">
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                            showPickupOnly
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={showPickupOnly}
                            onChange={(event) => handlePickupToggle(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Samo licno preuzimanje
                        </label>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                            showShippingOnly
                              ? "border-sky-200 bg-sky-50 text-sky-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={showShippingOnly}
                            onChange={(event) => handleShippingToggle(event.target.checked)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Samo slanje
                        </label>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Isporuka</p>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1 text-xs font-semibold transition",
                          showLateOnly
                            ? "border-orange-300 bg-orange-100 text-orange-800"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={showLateOnly}
                          onChange={(event) => handleLateToggle(event.target.checked)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        Samo oni koji kasne
                      </label>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Datum</p>
                      <div className="grid gap-2">
                        <label className="space-y-1 text-xs text-slate-600">
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Od</span>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(event) => handleDateFromChange(event.target.value)}
                          />
                        </label>
                        <label className="space-y-1 text-xs text-slate-600">
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-slate-400">Do</span>
                          <Input type="date" value={dateTo} onChange={(event) => handleDateToChange(event.target.value)} />
                        </label>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>Prazno = od pocetka / do danas</span>
                          {dateFilterActive ? (
                            <button
                              type="button"
                              className="text-xs font-semibold text-blue-700 hover:underline"
                              onClick={handleClearDateFilter}
                            >
                              Resetuj
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "col-span-2 w-full gap-2 sm:col-span-1 sm:w-auto",
                refundPeriodOverview?.period
                  ? "border-0 bg-success-soft text-success ring-1 ring-inset ring-success/40 hover:bg-success-soft hover:brightness-105"
                  : "",
              )}
              onClick={openRefundPeriodModal}
            >
              <CalendarRange className="h-4 w-4" />
              {refundPeriodOverview?.period
                ? `${formatRefundPeriodDate(refundPeriodOverview.period.startDate)} – ${formatRefundPeriodDate(refundPeriodOverview.period.endDate)}`
                : "Period 100%"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => void handleOrdersPdf("download")}
              disabled={isOrdersPdfBusy || isOrdersLoading}
            >
              <Download className="h-4 w-4" />
              {ordersPdfMode === "download" ? "Izvoz..." : "PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="col-span-2 w-full gap-2 sm:w-auto"
              onClick={() => void handleOrdersPdf("share")}
              disabled={isOrdersPdfBusy || isOrdersLoading}
            >
              <Share2 className="h-4 w-4" />
              {ordersPdfMode === "share" ? "Deljenje..." : "Podeli PDF"}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>
            {ordersPagination.total === 0
              ? "Nema podataka"
              : `Prikazano ${orders.length} od ${ordersPagination.total}`}
          </span>
          {hasMoreOrders ? (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
              Skroluj do dna za jos 10
            </span>
          ) : null}
        </div>
      </div>
    </CardHeader>
  );
}
