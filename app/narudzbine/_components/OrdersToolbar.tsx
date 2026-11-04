"use client";

import { BadgePercent, CalendarRange, Clock, SlidersHorizontal } from "lucide-react";
import { useRef, useState, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { ViewToggle } from "@/components/ui/view-toggle";
import { STAGE_OPTIONS } from "@/lib/stages";
import { cn } from "@/lib/utils";
import { formatPeriodLabel, pluralOrders } from "../_lib/orderView";
import type { OrdersViewState } from "../_hooks/useOrdersView";
import { FilterPanel, type FeedState } from "./filters/FilterPanel";
import { SearchField } from "./filters/SearchField";
import { ViewSettingsMenu } from "./ViewSettingsMenu";

type OrdersToolbarProps = {
  feed: FeedState;
  ordersView: OrdersViewState;
  refundPendingCount: number | undefined;
  searchRef: RefObject<HTMLInputElement | null>;
  now: number;
};

function CountBadge({ count, inverted = false }: { count: number; inverted?: boolean }) {
  if (count === 0) return null;
  return (
    <span className={cn("num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold", inverted ? "bg-accent text-accent-fg" : "bg-accent-soft text-accent-text")}>
      {count}
    </span>
  );
}

function ResultCount({ feed, className }: { feed: FeedState; className?: string }) {
  const total = feed.ordersPagination.total;
  return (
    <span className={cn("num text-[13px] text-text-muted", className)} aria-live="polite">
      {feed.isOrdersLoading ? "Učitavanje…" : total === 0 ? "Nema narudžbina" : `${feed.orders.length.toLocaleString("sr-RS")} od ${total.toLocaleString("sr-RS")}`}
    </span>
  );
}

export function OrdersToolbar({ feed, ordersView, refundPendingCount, searchRef, now }: OrdersToolbarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const periodRequestRef = useRef(false);
  const searchInput = (
    <SearchField
      ref={searchRef}
      value={feed.searchInput}
      onChange={(value) => (value === "" ? feed.clearSearch() : feed.setSearchInput(value))}
      showShortcut={ordersView.isDesktop}
      className={ordersView.isDesktop ? "w-72" : "min-w-0 flex-1"}
    />
  );
  const refundChip = (
    <Chip
      label="100% povrat"
      icon={BadgePercent}
      count={refundPendingCount || undefined}
      selected={feed.showRefund100Only}
      onClick={() => feed.handleRefund100Toggle(!feed.showRefund100Only)}
    />
  );
  const lateChip = <Chip label="Kasni" icon={Clock} selected={feed.showLateOnly} onClick={() => feed.handleLateToggle(!feed.showLateOnly)} />;

  if (ordersView.isDesktop) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {searchInput}
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-2 rounded-xl">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filteri
              <CountBadge count={feed.activeFilterCount} inverted />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="max-h-[min(80dvh,640px)] w-[380px] overflow-y-auto p-4" align="start" aria-label="Filteri">
            <FilterPanel feed={feed} now={now} />
            {feed.activeFilterCount > 0 ? (
              <div className="mt-4 flex justify-end border-t border-border pt-3">
                <Button type="button" variant="ghost" size="sm" onClick={feed.clearAllFilters}>
                  Očisti sve
                </Button>
              </div>
            ) : null}
          </PopoverContent>
        </Popover>
        {lateChip}
        {refundChip}
        {feed.activeFilterCount > 0 ? (
          <button
            type="button"
            onClick={feed.clearAllFilters}
            className="inline-flex h-8 cursor-pointer items-center rounded-lg px-2 text-[13px] font-medium text-accent-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring"
          >
            Očisti filtere
          </button>
        ) : null}
        <ResultCount feed={feed} className="ml-auto" />
        <ViewToggle value={ordersView.view === "kartice" ? "kartice" : "tabela"} onChange={ordersView.setView} showLabels />
        <ViewSettingsMenu ordersView={ordersView} />
      </div>
    );
  }

  const periodActive = feed.dateFilterActive;
  return (
    <>
      <div className="sticky top-[calc(var(--header-h)+env(safe-area-inset-top))] z-(--z-sticky) -mx-4 -mt-4 border-b border-border bg-(--header-bg) pt-2 pb-2 backdrop-blur-xl">
        <div className="flex gap-2 px-4">
          {searchInput}
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-1.5 rounded-xl px-3"
            onClick={() => setFiltersOpen(true)}
            aria-label={feed.activeFilterCount ? `Filteri, aktivno ${feed.activeFilterCount}` : "Filteri"}
          >
            <SlidersHorizontal className="size-4" aria-hidden />
            Filteri
            <CountBadge count={feed.activeFilterCount} inverted />
          </Button>
        </div>
        <span className="sr-only" aria-live="polite">
          {feed.isOrdersLoading ? "" : `${feed.ordersPagination.total.toLocaleString("sr-RS")} ${pluralOrders(feed.ordersPagination.total)}`}
        </span>
        <div className="mt-2 flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Brzi filteri">
          {STAGE_OPTIONS.map((stage) => (
            <Chip
              key={stage.value}
              label={stage.label}
              selected={feed.stageFilters.includes(stage.value)}
              onClick={() => feed.handleStageFilterToggle(stage.value)}
              className="snap-start"
            />
          ))}
          <Chip
            label={formatPeriodLabel(feed.dateFrom, feed.dateTo, now)}
            icon={CalendarRange}
            selected={periodActive}
            onClick={() => {
              periodRequestRef.current = true;
              setFiltersOpen(true);
            }}
            className="snap-start"
          />
          {lateChip}
          {refundChip}
        </div>
      </div>
      <Sheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        title="Filteri"
        description={feed.activeFilterCount ? `Aktivno: ${feed.activeFilterCount}` : undefined}
        onOpenAutoFocus={(event) => {
          if (!periodRequestRef.current) return;
          periodRequestRef.current = false;
          event.preventDefault();
          requestAnimationFrame(() => document.getElementById("filter-period-section")?.scrollIntoView({ block: "start" }));
        }}
        footer={
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <Button type="button" variant="ghost" className="px-4" disabled={feed.activeFilterCount === 0} onClick={feed.clearAllFilters}>
              Očisti
            </Button>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              {feed.isOrdersLoading ? "Prikaži" : `Prikaži ${feed.ordersPagination.total.toLocaleString("sr-RS")} ${pluralOrders(feed.ordersPagination.total, "akuzativ")}`}
            </Button>
          </div>
        }
      >
        <FilterPanel feed={feed} now={now} />
      </Sheet>
    </>
  );
}
