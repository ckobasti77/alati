"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { ChevronLeft, ChevronRight, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useProductImages } from "../_hooks/useProductImages";
import type { useProductMediaInbox } from "../_hooks/useProductMediaInbox";
import type { useProductsState } from "../_hooks/useProductsState";

type ImageLightboxProps = {
  imageLightbox: ReturnType<typeof useProductsState>["imageLightbox"];
  handleDeleteInboxImage: ReturnType<typeof useProductMediaInbox>["handleDeleteInboxImage"];
  handleDownloadInboxImage: ReturnType<typeof useProductMediaInbox>["handleDownloadInboxImage"];
  handleStepLightbox: ReturnType<typeof useProductImages>["handleStepLightbox"];
  handleCloseLightbox: ReturnType<typeof useProductImages>["handleCloseLightbox"];
};

export function ImageLightbox({ imageLightbox, handleDeleteInboxImage, handleDownloadInboxImage, handleStepLightbox, handleCloseLightbox }: ImageLightboxProps) {
  return (
    <>
      {imageLightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseLightbox}
        >
          {(() => {
            const item = imageLightbox.items[imageLightbox.index];
            const showDownload = Boolean(item?.downloadUrl);
            const showDelete = Boolean(item?.deleteId);
            if (!showDownload && !showDelete) return null;
            return (
              <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
                {showDownload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDownloadInboxImage(item?.downloadUrl, item?.downloadName);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Preuzmi
                  </Button>
                ) : null}
                {showDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item?.deleteId) {
                        void handleDeleteInboxImage(item.deleteId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Obrisi
                  </Button>
                ) : null}
              </div>
            );
          })()}
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {imageLightbox.items.length > 1 ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
                <button
                  type="button"
                  className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleStepLightbox(-1);
                  }}
                  aria-label="Prethodna slika"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleStepLightbox(1);
                  }}
                  aria-label="Sledeca slika"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </div>
            ) : null}
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-white/80">
              <span>
                {imageLightbox.index + 1} / {imageLightbox.items.length}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCloseLightbox();
                }}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow"
              >
                Zatvori
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageLightbox.items[imageLightbox.index]?.url}
              alt={imageLightbox.items[imageLightbox.index]?.alt ?? "Pregled slike"}
              className="mx-auto max-h-[82vh] w-auto rounded-xl object-contain"
              onClick={(event) => {
                event.stopPropagation();
                if (imageLightbox.items.length > 1) {
                  handleStepLightbox(1);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
