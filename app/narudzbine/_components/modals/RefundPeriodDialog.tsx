"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { useRefundPeriod } from "../../_hooks/useRefundPeriod";

type RefundPeriodDialogProps = {
  refund: ReturnType<typeof useRefundPeriod>;
};

export function RefundPeriodDialog({ refund }: RefundPeriodDialogProps) {
  const { refundPeriodModalOpen, setRefundPeriodModalOpen, refundPeriodStart, setRefundPeriodStart, refundPeriodEnd, setRefundPeriodEnd, isRefundPeriodSaving, refundPeriodOverview, handleSaveRefundPeriod, handleClearRefundPeriod } = refund;
  return (
    <Sheet
      open={refundPeriodModalOpen}
      onOpenChange={setRefundPeriodModalOpen}
      title="Period 100% povrata"
      size="auto"
      desktopWidth="sm"
      footer={
        <div className="flex items-center gap-2">
          {refundPeriodOverview?.period ? (
            <Button
              type="button"
              variant="ghost"
              className="text-danger"
              onClick={() => void handleClearRefundPeriod()}
              disabled={isRefundPeriodSaving}
            >
              Ukloni period
            </Button>
          ) : null}
          <Button
            type="button"
            className="ml-auto flex-1 md:flex-none"
            onClick={() => void handleSaveRefundPeriod()}
            disabled={isRefundPeriodSaving}
          >
            {isRefundPeriodSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Sačuvaj
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refund-period-start" className="text-[13px] text-text-muted">
              Od
            </label>
            <Input
              id="refund-period-start"
              type="date"
              value={refundPeriodStart}
              onChange={(event) => setRefundPeriodStart(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="refund-period-end" className="text-[13px] text-text-muted">
              Do
            </label>
            <Input
              id="refund-period-end"
              type="date"
              value={refundPeriodEnd}
              onChange={(event) => setRefundPeriodEnd(event.target.value)}
            />
          </div>
        </div>
        <p className="text-[13px] text-text-muted">
          Nevraćene porudžbine iz ovog perioda (datumi su uključivi) računaju se kao nabavna cena + 100% profita − transport.
        </p>
      </div>
    </Sheet>
  );
}
