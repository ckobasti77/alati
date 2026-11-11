"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";

type DetailLightboxProps = {
  imageLightbox: ReturnType<typeof useProductDetailState>["imageLightbox"];
  handleCloseLightbox: ReturnType<typeof useProductGalleryManager>["handleCloseLightbox"];
  handleStepLightbox: ReturnType<typeof useProductGalleryManager>["handleStepLightbox"];
  /** Unutar otvorenog Sheet-a: bez portala, da ostane u njegovom fokus trap-u i sloju. */
  inline?: boolean;
};

/**
 * Pregled slike preko celog ekrana. Portal u <body> sa `pointer-events-auto` (radi i iznad otvorenog Sheet-a,
 * koji gasi pointer-events na body), dijalog semantika, fokus na „Zatvori“ i povratak fokusa.
 * `data-nested-layer`: Esc unutar pregleda zatvara samo pregled, ne i Sheet ispod (vidi components/ui/sheet.tsx).
 */
export function DetailLightbox({ imageLightbox, handleCloseLightbox, handleStepLightbox, inline = false }: DetailLightboxProps) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const isOpen = Boolean(imageLightbox);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);

  if (!imageLightbox || typeof document === "undefined") return null;
  const count = imageLightbox.items.length;
  const current = imageLightbox.items[imageLightbox.index];

  const layer = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pregled slike"
      data-nested-layer
      className="pointer-events-auto fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/85 p-4"
      onClick={handleCloseLightbox}
      onKeyDown={(event) => {
        if (event.key === "Tab") {
          // Fokus ostaje u pregledu (tri dugmeta).
          const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
          const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.shiftKey ? (index <= 0 ? buttons.length - 1 : index - 1) : (index + 1) % buttons.length;
          event.preventDefault();
          buttons[next]?.focus();
        }
      }}
    >
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 left-3 flex items-center justify-between text-sm text-white/85">
        <span className="num" aria-live="polite">
          {imageLightbox.index + 1} / {count}
        </span>
        <IconButton
          ref={closeRef}
          aria-label="Zatvori pregled"
          size="lg"
          className="bg-white/15 text-white hover:bg-white/25"
          onClick={(event) => {
            event.stopPropagation();
            handleCloseLightbox();
          }}
        >
          <X />
        </IconButton>
      </div>
      {count > 1 ? (
        <>
          <IconButton
            aria-label="Prethodna slika"
            size="lg"
            className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/15 text-white hover:bg-white/25"
            onClick={(event) => {
              event.stopPropagation();
              handleStepLightbox(-1);
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            aria-label="Sledeća slika"
            size="lg"
            className="absolute top-1/2 right-3 -translate-y-1/2 bg-white/15 text-white hover:bg-white/25"
            onClick={(event) => {
              event.stopPropagation();
              handleStepLightbox(1);
            }}
          >
            <ChevronRight />
          </IconButton>
        </>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL */}
      <img
        src={current?.url}
        alt={current?.alt ?? "Pregled slike"}
        className="max-h-[80dvh] max-w-full rounded-xl object-contain"
        onClick={(event) => {
          event.stopPropagation();
          if (count > 1) handleStepLightbox(1);
        }}
      />
    </div>
  );
  return inline ? layer : createPortal(layer, document.body);
}
