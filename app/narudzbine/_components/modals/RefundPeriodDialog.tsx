"use client";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { useRefundPeriod } from "../../_hooks/useRefundPeriod";

type RefundPeriodDialogProps = {
  refund: ReturnType<typeof useRefundPeriod>;
};

export function RefundPeriodDialog({ refund }: RefundPeriodDialogProps) {
  const { refundPeriodModalOpen, setRefundPeriodModalOpen, refundPeriodStart, setRefundPeriodStart, refundPeriodEnd, setRefundPeriodEnd, isRefundPeriodSaving, refundPeriodOverview, handleSaveRefundPeriod, handleClearRefundPeriod } = refund;
  return (
    <Dialog open={refundPeriodModalOpen} onOpenChange={setRefundPeriodModalOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Period 100% povrata</DialogTitle>
          <DialogDescription>
            Sve nevraćene porudžbine kreirane u ovom rasponu računaju se po posebnom pravilu. Datumi su uključivi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Od</span>
              <Input
                type="date"
                value={refundPeriodStart}
                onChange={(event) => setRefundPeriodStart(event.target.value)}
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              <span>Do</span>
              <Input
                type="date"
                value={refundPeriodEnd}
                onChange={(event) => setRefundPeriodEnd(event.target.value)}
              />
            </label>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-950">
            <p className="font-semibold">Poseban obračun</p>
            <p className="mt-1 text-emerald-800">Nabavna cena + 100% ukupnog profita − transport.</p>
            <p className="mt-2 text-xs text-emerald-700">
              Porudžbine kojima je povrat već označen kao vraćen ostaju vidljive, ali se ne računaju u iznos za vraćanje.
            </p>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {refundPeriodOverview?.period ? (
              <Button
                type="button"
                variant="ghost"
                className="text-red-700 hover:bg-red-50 hover:text-red-800"
                onClick={() => void handleClearRefundPeriod()}
                disabled={isRefundPeriodSaving}
              >
                Ukloni period
              </Button>
            ) : null}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRefundPeriodModalOpen(false)}
              disabled={isRefundPeriodSaving}
            >
              Otkaži
            </Button>
            <Button
              type="button"
              className="bg-emerald-800 text-white hover:bg-emerald-900"
              onClick={() => void handleSaveRefundPeriod()}
              disabled={isRefundPeriodSaving}
            >
              {isRefundPeriodSaving ? "Čuvanje..." : "Sačuvaj period"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
