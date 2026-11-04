"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { STAGE_OPTIONS } from "@/lib/stages";
import { StageBadge } from "./LegacyFields";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailDelete } from "../_hooks/useOrderDetailDelete";
import type { useOrderDetailDerived } from "../_hooks/useOrderDetailDerived";
import type { useOrderDetailShare } from "../_hooks/useOrderDetailShare";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

type DetailHeaderProps = {
  order: OrderWithProduct;
  isUpdatingStage: ReturnType<typeof useOrderDetailUpdates>["isUpdatingStage"];
  handleStageChange: ReturnType<typeof useOrderDetailUpdates>["handleStageChange"];
  isManualRefund100: ReturnType<typeof useOrderDetailDerived>["isManualRefund100"];
  isFullRefund100: ReturnType<typeof useOrderDetailDerived>["isFullRefund100"];
  isExcludedBecauseReturned: ReturnType<typeof useOrderDetailDerived>["isExcludedBecauseReturned"];
  setShareOpen: ReturnType<typeof useOrderDetailShare>["setShareOpen"];
  openDeleteModal: ReturnType<typeof useOrderDetailDelete>["openDeleteModal"];
  handleBack: () => void;
  backLabel: string;
};

export function DetailHeader({ order, isUpdatingStage, handleStageChange, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, setShareOpen, openDeleteModal, handleBack, backLabel }: DetailHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Narudzbina</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900">{order.title}</h1>
            <StageBadge stage={order.stage} />
            {order.stage === "poslato" && order.kasni ? (
              <span className="rounded-full border border-orange-300 bg-orange-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-orange-800">
                {`Kasni${order.slanjeMode ? ` · zovi ${order.slanjeMode}` : ""}`}
              </span>
            ) : null}
            {isFullRefund100 ? (
              <span
                className={`rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                  isExcludedBecauseReturned
                    ? "border-slate-200 bg-slate-100 text-slate-600"
                    : "border-emerald-300 bg-emerald-100 text-emerald-800"
                }`}
              >
                {isExcludedBecauseReturned
                  ? "Već vraćeno — ne računa se"
                  : isManualRefund100
                    ? "Povrat 100% · ručno"
                    : "Povrat 100%"}
              </span>
            ) : null}
          </div>
          {order.variantLabel ? <p className="text-sm text-slate-500">{order.variantLabel}</p> : null}
          <p className="text-xs text-slate-500">Kreirano {formatDate(order.kreiranoAt)}</p>
          <p className="text-xs text-slate-500">
            {order.stageChangedAt ? `Trenutni status od ${formatDate(order.stageChangedAt)}` : "Datum trenutnog statusa nije zabelezen"}
          </p>
        </div>
      </div>
      <div className="w-full -mx-2 overflow-x-auto pb-2 sm:mx-0 sm:pb-0">
          <div className="flex min-w-max gap-2 px-2 sm:px-0">
            {STAGE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={order.stage === option.value ? "default" : "outline"}
                className="min-w-[92px] whitespace-nowrap"
                disabled={isUpdatingStage || order.stage === option.value}
                onClick={() => handleStageChange(option.value)}
              >
                {isUpdatingStage && order.stage !== option.value ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {option.label}
              </Button>
            ))}
            <Button type="button" size="sm" variant="destructive" onClick={openDeleteModal}>
              Obrisi
            </Button>
            <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
              <Share2 className="h-4 w-4" />
              Podeli
            </Button>
          </div>
        </div>
      </div>
  );
}
