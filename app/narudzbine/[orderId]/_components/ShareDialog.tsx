"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Copy, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useOrderDetailShare } from "../_hooks/useOrderDetailShare";

type ShareDialogProps = {
  shareOpen: ReturnType<typeof useOrderDetailShare>["shareOpen"];
  setShareOpen: ReturnType<typeof useOrderDetailShare>["setShareOpen"];
  orderPdfMode: ReturnType<typeof useOrderDetailShare>["orderPdfMode"];
  canShare: ReturnType<typeof useOrderDetailShare>["canShare"];
  handleCopyShareLink: ReturnType<typeof useOrderDetailShare>["handleCopyShareLink"];
  handleShareLink: ReturnType<typeof useOrderDetailShare>["handleShareLink"];
  isOrderPdfBusy: ReturnType<typeof useOrderDetailShare>["isOrderPdfBusy"];
  handleOrderPdf: ReturnType<typeof useOrderDetailShare>["handleOrderPdf"];
};

export function ShareDialog({ shareOpen, setShareOpen, orderPdfMode, canShare, handleCopyShareLink, handleShareLink, isOrderPdfBusy, handleOrderPdf }: ShareDialogProps) {
  return (
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Podeli narudzbinu</DialogTitle>
          <DialogDescription>Podeli PDF kroz sistemski share ili preuzmi fajl.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button
            type="button"
            className="w-full justify-start gap-2"
            onClick={() => void handleOrderPdf("share")}
            disabled={isOrderPdfBusy}
          >
            <Share2 className="h-4 w-4" />
            {orderPdfMode === "share" ? "Deljenje..." : "Podeli PDF"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => void handleOrderPdf("download")}
            disabled={isOrderPdfBusy}
          >
            <Download className="h-4 w-4" />
            {orderPdfMode === "download" ? "Izvoz..." : "Preuzmi PDF"}
          </Button>
          <Button type="button" className="w-full justify-start gap-2" onClick={handleCopyShareLink}>
            <Copy className="h-4 w-4" />
            Kopiraj link
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleShareLink}
            disabled={!canShare}
          >
            <Share2 className="h-4 w-4" />
            Podeli link
          </Button>
          <p className="text-xs text-slate-500">
            Na telefonu izaberi WhatsApp, Viber ili drugu aplikaciju iz share prozora. Ako deljenje fajlova nije
            podrzano, PDF ce biti preuzet.
          </p>
          {!canShare ? <p className="text-xs text-slate-500">Deljenje linka nije podrzano na ovom uredjaju.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
