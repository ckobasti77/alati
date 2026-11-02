"use client";

import { useLayoutEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { TODAY_CHART_DAYS } from "@/lib/dashboard";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { formatAxisMoney, formatDayKey, formatDayLong, formatMonthLong, formatMonthShort, formatWeekday, pluralNarudzbina } from "./format";
import type { DashboardOverview } from "./types";

type ProfitChartProps = {
  data: Pick<DashboardOverview, "series" | "period"> | undefined;
  stale?: boolean;
};

const BAR_MAX = 24;
const LABEL_BAND = 18;
const MAX_X_LABELS = 6;

/** Callback ref + dimenzije elementa (element se montira tek kad stignu podaci). */
function useSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!node) return;
    const update = () => setSize({ width: node.clientWidth, height: node.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [setNode, size] as const;
}

/** Bar sa zaobljenim krajem (4px) i ravnom osnovom na nultoj liniji. */
function barPath(x: number, width: number, y0: number, y1: number) {
  const height = Math.abs(y1 - y0);
  const r = Math.min(4, width / 2, height);
  if (y1 < y0) {
    return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + width - r}Q${x + width},${y1} ${x + width},${y1 + r}V${y0}Z`;
  }
  return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + width - r}Q${x + width},${y1} ${x + width},${y1 - r}V${y0}Z`;
}

function labelIndices(count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index);
  const step = Math.ceil(count / MAX_X_LABELS);
  const indices: number[] = [];
  for (let index = count - 1; index >= 0; index -= step) indices.unshift(index);
  return indices;
}

export function ProfitChart({ data, stale = false }: ProfitChartProps) {
  const [plotRef, { width, height }] = useSize<HTMLDivElement>();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const series = data?.series ?? [];
  const bucket = data?.period.bucket ?? "day";
  const isEmpty = data !== undefined && series.every((point) => point.count === 0 && point.profit === 0);
  const currentIndex = series.findIndex((point) => point.key === data?.period.currentKey);
  const defaultIndex = currentIndex >= 0 ? currentIndex : series.length - 1;
  const foundIndex = selectedKey ? series.findIndex((point) => point.key === selectedKey) : -1;
  const selectedIndex = foundIndex >= 0 ? foundIndex : defaultIndex;
  const selected = series[selectedIndex];
  const unit = bucket === "month" ? "mesec" : "dan";

  const formatKeyLong = (key: string) => (bucket === "month" ? formatMonthLong(key) : formatDayLong(key));
  const formatKeyShort = (key: string) =>
    bucket === "month" ? formatMonthShort(key) : series.length <= 7 ? formatWeekday(key) : formatDayKey(key);

  const title =
    bucket === "month"
      ? "Profit po mesecu"
      : data?.period.key === "danas"
        ? `Profit po danu · poslednjih ${TODAY_CHART_DAYS}`
        : "Profit po danu";

  // Geometrija (px). Skala uvek ukljucuje nulu; negativni barovi idu ispod nulte linije.
  const values = series.map((point) => point.profit);
  const maxValue = Math.max(0, ...values);
  const minValue = Math.min(0, ...values);
  const span = maxValue - minValue || 1;
  const plotTop = LABEL_BAND;
  const plotBottom = Math.max(plotTop + 1, height - 1);
  const y = (value: number) => plotTop + ((maxValue - value) / span) * (plotBottom - plotTop);
  const y0 = y(0);
  const slot = series.length > 0 ? width / series.length : 0;
  const barWidth = Math.max(1, Math.min(BAR_MAX, slot - 2, slot * 0.72));

  const selectAt = (clientX: number, target: Element) => {
    if (slot <= 0) return;
    const left = target.getBoundingClientRect().left;
    const index = Math.min(series.length - 1, Math.max(0, Math.floor((clientX - left) / slot)));
    setSelectedKey(series[index]?.key ?? null);
  };

  const move = (step: number | "first" | "last") => {
    if (series.length === 0) return;
    const next =
      step === "first" ? 0 : step === "last" ? series.length - 1 : Math.min(series.length - 1, Math.max(0, selectedIndex + step));
    setSelectedKey(series[next].key);
  };

  return (
    <section
      aria-labelledby="profit-grafikon"
      aria-busy={!data || stale}
      className={cn(
        "flex flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border transition-opacity duration-(--duration-fast) md:h-full md:p-5",
        stale && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="profit-grafikon" className="text-base font-semibold text-text">
          {title}
        </h2>
        {selected && !isEmpty ? (
          <p id="profit-grafikon-izbor" aria-live="polite" aria-atomic="true" className="text-[13px] leading-5 text-text-muted">
            <span className="text-text">{formatKeyLong(selected.key)}</span> ·{" "}
            <Money value={selected.profit} tone="profit" className="font-medium" /> · {pluralNarudzbina(selected.count)}
          </p>
        ) : null}
      </div>

      {data === undefined ? (
        <Skeleton className="h-40 w-full rounded-xl md:h-auto md:min-h-56 md:flex-1" />
      ) : isEmpty ? (
        <EmptyState
          compact
          icon={BarChart3}
          title="Nema profita u ovom periodu"
          description="Grafikon prikazuje narudžbine sa statusom Leglo, po danu kreiranja."
          className="h-40 justify-center md:h-auto md:min-h-56 md:flex-1"
        />
      ) : (
        <div className="flex flex-col gap-1.5 md:flex-1">
          <div
            // Slider: citaci ekrana prepustaju strelice widgetu (role=group bi ih zadrzao u browse modu).
            role="slider"
            aria-label={`${title}: izbor (${unit}), strelice levo i desno`}
            aria-valuemin={1}
            aria-valuemax={series.length}
            aria-valuenow={selectedIndex + 1}
            aria-valuetext={
              selected
                ? `${formatKeyLong(selected.key)}, ${formatCurrency(selected.profit, "EUR")}, ${pluralNarudzbina(selected.count)}`
                : undefined
            }
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") move(1);
              else if (event.key === "ArrowLeft") move(-1);
              else if (event.key === "Home") move("first");
              else if (event.key === "End") move("last");
              else return;
              event.preventDefault();
            }}
            className="flex flex-col rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:flex-1"
          >
            <div ref={plotRef} className="relative h-[136px] touch-pan-y select-none md:h-auto md:min-h-[196px] md:flex-1">
              {width > 0 ? (
                <>
                  <span className="num absolute top-0 right-0 text-xs leading-4 text-text-muted" aria-hidden>
                    {formatAxisMoney(maxValue)}
                  </span>
                  {minValue < 0 ? (
                    <span className="num absolute right-0 bottom-0 text-xs leading-4 text-text-muted" aria-hidden>
                      {formatAxisMoney(minValue)}
                    </span>
                  ) : null}
                  <svg
                    width={width}
                    height={height}
                    className="block overflow-visible"
                    aria-hidden
                    onPointerDown={(event) => selectAt(event.clientX, event.currentTarget)}
                    onPointerMove={(event) => {
                      if (event.pointerType === "mouse") selectAt(event.clientX, event.currentTarget);
                    }}
                  >
                    {selected ? (
                      // Izabrani dan/mesec: traka iza slota. Barovi ostaju puni (prigusivanje pada ispod 3:1).
                      <rect
                        x={selectedIndex * slot + 1}
                        y={plotTop}
                        width={Math.max(0, slot - 2)}
                        height={Math.max(0, plotBottom - plotTop)}
                        rx={4}
                        className="fill-surface-3/70"
                      />
                    ) : null}
                    <line x1={0} x2={width} y1={plotTop} y2={plotTop} className="stroke-border" strokeWidth={1} />
                    {series.map((point, index) => {
                      if (point.profit === 0) return null;
                      const x = index * slot + (slot - barWidth) / 2;
                      return (
                        <path
                          key={point.key}
                          d={barPath(x, barWidth, y0, y(point.profit))}
                          className={point.profit < 0 ? "fill-danger" : "fill-accent"}
                        />
                      );
                    })}
                    <line x1={0} x2={width} y1={y0} y2={y0} className="stroke-border-strong" strokeWidth={1} />
                  </svg>
                </>
              ) : null}
            </div>

            <div className="relative h-4" aria-hidden>
              {width > 0
                ? labelIndices(series.length).map((index) => {
                    const center = (index + 0.5) * slot;
                    const align = center < 24 ? "start" : center > width - 24 ? "end" : "center";
                    return (
                      <span
                        key={series[index].key}
                        className={cn(
                          "absolute top-0 text-xs leading-4 whitespace-nowrap",
                          index === selectedIndex ? "font-medium text-text" : "text-text-muted",
                          align === "center" && "-translate-x-1/2",
                          align === "end" && "-translate-x-full",
                        )}
                        style={{ left: align === "start" ? 0 : align === "end" ? width : center }}
                      >
                        {formatKeyShort(series[index].key)}
                      </span>
                    );
                  })
                : null}
            </div>
          </div>

          {/* sr-only na omotacu: tabela ignorise width 1px i siri stranicu na uskim ekranima. */}
          <div className="sr-only">
            <table>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">{bucket === "month" ? "Mesec" : "Dan"}</th>
                  <th scope="col">Profit</th>
                  <th scope="col">Narudžbine</th>
                </tr>
              </thead>
              <tbody>
                {series.map((point) => (
                  <tr key={point.key}>
                    <th scope="row">{formatKeyLong(point.key)}</th>
                    <td>
                      <Money value={point.profit} />
                    </td>
                    <td>{point.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
