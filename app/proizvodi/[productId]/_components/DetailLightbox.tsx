"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";

type DetailLightboxProps = {
  imageLightbox: ReturnType<typeof useProductDetailState>["imageLightbox"];
  handleCloseLightbox: ReturnType<typeof useProductGalleryManager>["handleCloseLightbox"];
  handleStepLightbox: ReturnType<typeof useProductGalleryManager>["handleStepLightbox"];
};

export function DetailLightbox({ imageLightbox, handleCloseLightbox, handleStepLightbox }: DetailLightboxProps) {
  return (
    <>
      {imageLightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseLightbox}
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
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
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
