"use client";

import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { STAGE_OPTIONS } from "@/lib/stages";
import { getPeriodPresets } from "../../_lib/orderView";
import type { useOrdersFeed } from "../../_hooks/useOrdersFeed";

export type FeedState = ReturnType<typeof useOrdersFeed>;

const sectionTitle = "mb-2 text-[13px] font-medium text-text-muted";

/** Sadržaj filtera: isti u Sheet-u (telefon) i Popover-u (desktop). Svaka promena se odmah primenjuje. */
export function FilterPanel({ feed, now }: { feed: FeedState; now: number }) {
  const presets = getPeriodPresets(now);
  const returnValue = feed.showReturnedOnly ? "vraceno" : feed.showUnreturnedOnly ? "nevraceno" : "svi";
  const pickupValue = feed.showPickupOnly ? "licno" : feed.showShippingOnly ? "slanje" : "svi";

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="filter-status">
        <h3 id="filter-status" className={sectionTitle}>Status</h3>
        <div className="flex flex-wrap gap-2">
          {STAGE_OPTIONS.map((stage) => (
            <Chip
              key={stage.value}
              label={stage.label}
              icon={stage.icon}
              selected={feed.stageFilters.includes(stage.value)}
              onClick={() => feed.handleStageFilterToggle(stage.value)}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="filter-period" id="filter-period-section">
        <h3 id="filter-period" className={sectionTitle}>Period (datum kreiranja)</h3>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Chip
              key={preset.key}
              label={preset.label}
              selected={feed.dateFrom === preset.from && feed.dateTo === preset.to}
              onClick={() =>
                feed.dateFrom === preset.from && feed.dateTo === preset.to
                  ? feed.handleClearDateFilter()
                  : feed.handleDateRangeChange(preset.from, preset.to)
              }
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-[13px] text-text-muted">
            Od
            <Input type="date" value={feed.dateFrom} max={feed.dateTo || undefined} onChange={(event) => feed.handleDateFromChange(event.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-text-muted">
            Do
            <Input type="date" value={feed.dateTo} min={feed.dateFrom || undefined} onChange={(event) => feed.handleDateToChange(event.target.value)} />
          </label>
        </div>
        {feed.dateFilterActive ? (
          <button
            type="button"
            onClick={feed.handleClearDateFilter}
            className="mt-1 inline-flex min-h-11 cursor-pointer items-center text-[13px] font-medium text-accent-text hover:underline md:min-h-8"
          >
            Očisti period
          </button>
        ) : (
          <p className="mt-2 text-[13px] text-text-muted">Prazno = od početka do danas.</p>
        )}
      </section>

      <section className="flex flex-col divide-y divide-border" aria-label="Brzi filteri">
        <Switch
          label="100% povrat"
          description="U periodu ili ručno dodate, povrat nije vraćen"
          checked={feed.showRefund100Only}
          onCheckedChange={feed.handleRefund100Toggle}
        />
        <Switch
          label="Kasni"
          description="Poslato, a označeno da kasni"
          checked={feed.showLateOnly}
          onCheckedChange={feed.handleLateToggle}
        />
      </section>

      <section aria-labelledby="filter-povrat">
        <h3 id="filter-povrat" className={sectionTitle}>Povrat</h3>
        <SegmentedControl
          ariaLabel="Povrat"
          fullWidth
          value={returnValue}
          onChange={(value) => {
            if (value === "vraceno") feed.handleReturnedToggle(true);
            else if (value === "nevraceno") feed.handleUnreturnedToggle(true);
            else if (feed.showReturnedOnly) feed.handleReturnedToggle(false);
            else feed.handleUnreturnedToggle(false);
          }}
          options={[
            { value: "svi", label: "Svi" },
            { value: "nevraceno", label: "Nevraćeni" },
            { value: "vraceno", label: "Vraćeni" },
          ]}
        />
      </section>

      <section aria-labelledby="filter-preuzimanje">
        <h3 id="filter-preuzimanje" className={sectionTitle}>Preuzimanje</h3>
        <SegmentedControl
          ariaLabel="Preuzimanje"
          fullWidth
          value={pickupValue}
          onChange={(value) => {
            if (value === "licno") feed.handlePickupToggle(true);
            else if (value === "slanje") feed.handleShippingToggle(true);
            else if (feed.showPickupOnly) feed.handlePickupToggle(false);
            else feed.handleShippingToggle(false);
          }}
          options={[
            { value: "svi", label: "Svi" },
            { value: "licno", label: "Lično" },
            { value: "slanje", label: "Slanje" },
          ]}
        />
      </section>
    </div>
  );
}
