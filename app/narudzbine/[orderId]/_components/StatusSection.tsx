"use client";

import { BadgePercent, Clock } from "lucide-react";
import { StageBadge } from "@/components/ui/stage-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { STAGE_FLOW, getStage } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { OrderStage, OrderWithProduct } from "@/types/order";
import { stageProgress } from "../_lib/detailHelpers";
import { DetailSection } from "./DetailSection";

type StatusSectionProps = {
  order: OrderWithProduct;
  isUpdatingStage: boolean;
  onStageChange: (stage: OrderStage) => void;
  isFullRefund100: boolean;
  isManualRefund100: boolean;
  isExcludedBecauseReturned: boolean;
  aside?: boolean;
  className?: string;
};

/** Status (bedž otvara izbor) + kompaktan progres Poručeno → Leglo; Vraćeno je van toka. */
export function StatusSection({ order, isUpdatingStage, onStageChange, isFullRefund100, isManualRefund100, isExcludedBecauseReturned, aside, className }: StatusSectionProps) {
  const meta = getStage(order.stage);
  const progress = stageProgress(order.stage);
  const isLate = order.stage === "poslato" && order.kasni;

  return (
    <DetailSection id="status" title="Status" hideTitle aside={aside} className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <StageBadge stage={order.stage} onChange={onStageChange} disabled={isUpdatingStage} />
        {isLate ? (
          <span className="inline-flex h-6 items-center gap-1 rounded-full bg-warning-soft px-2 text-xs font-medium text-warning">
            <Clock className="size-3.5" aria-hidden />
            Kasni{order.slanjeMode ? ` · zovi ${order.slanjeMode}` : ""}
          </span>
        ) : null}
        {isFullRefund100 ? (
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium",
              isExcludedBecauseReturned ? "bg-surface-2 text-text-muted" : "bg-success-soft text-success",
            )}
          >
            <BadgePercent className="size-3.5" aria-hidden />
            {isExcludedBecauseReturned ? "100% · već vraćeno" : isManualRefund100 ? "100% povrat · ručno" : "100% povrat"}
          </span>
        ) : null}
      </div>

      <ol className="mt-4 grid grid-cols-6 gap-1" aria-label="Tok statusa">
        {STAGE_FLOW.map((stage, index) => {
          const done = !progress.returned && index <= progress.index;
          const current = !progress.returned && index === progress.index;
          return (
            <li key={stage.value} className="flex flex-col gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "h-1.5 rounded-full",
                  progress.returned ? "bg-stage-vraceno/30" : done ? meta.dotClass : "bg-text-muted/70",
                )}
              />
              <span className="sr-only">
                {stage.label}: {progress.returned ? "van toka" : current ? "trenutno" : done ? "završeno" : "sledi"}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-[13px] leading-5 text-text-muted">
        <span className="font-medium text-text">{progress.returned ? "Vraćeno · van toka" : `${meta.longLabel} · ${progress.index + 1} od ${progress.total}`}</span>
        {order.stageChangedAt ? <> · od {formatDateTime(order.stageChangedAt)}</> : null}
      </p>
      <p className="text-[13px] leading-5 text-text-muted">Kreirana {formatDate(order.kreiranoAt)}</p>
    </DetailSection>
  );
}
