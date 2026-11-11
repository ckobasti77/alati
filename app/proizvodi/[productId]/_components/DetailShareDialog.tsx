"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { useProductDetailShare } from "../_hooks/useProductDetailShare";
import type { useProductDetailState } from "../_hooks/useProductDetailState";

type DetailShareDialogProps = {
  shareOpen: ReturnType<typeof useProductDetailState>["shareOpen"];
  setShareOpen: ReturnType<typeof useProductDetailState>["setShareOpen"];
  canShare: ReturnType<typeof useProductDetailShare>["canShare"];
  handleCopyShareLink: ReturnType<typeof useProductDetailShare>["handleCopyShareLink"];
  handleShareLink: ReturnType<typeof useProductDetailShare>["handleShareLink"];
};

export function DetailShareDialog({ shareOpen, setShareOpen, canShare, handleCopyShareLink, handleShareLink }: DetailShareDialogProps) {
  return (
    <Dialog open={shareOpen} onOpenChange={setShareOpen}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Podeli proizvod</DialogTitle>
          <DialogDescription>Prvo kopiraj link, pa podeli preko aplikacije.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
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
          {!canShare ? <p className="text-xs text-slate-500">Share nije podrzan na ovom uredjaju.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
