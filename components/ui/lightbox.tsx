"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";

export type LightboxItem = { url?: string; alt?: string };

/**
 * Pregled slike preko celog ekrana (lista i detalj proizvoda). Portal u <body> sa `pointer-events-auto`
 * (radi i iznad otvorenog Sheet-a), dijalog semantika, fokus na „Zatvori“, Tab ostaje u pregledu i fokus se
 * vraća na okidač. `data-nested-layer`: Esc unutar pregleda zatvara samo pregled, ne i Sheet ispod.
 * Esc i strelice obrađuju hookovi koji drže stanje pregleda (kao i ranije).
 * `actions`: dodatna dugmad u gornjoj traci (npr. Preuzmi / Obriši).
 */
export function Lightbox({
  open,
  items,
  index,
  onClose,
  onStep,
  inline = false,
  actions,
  footer,
}: {
  open: boolean;
  items: LightboxItem[];
  index: number;
  onClose: () => void;
  onStep: (direction: -1 | 1) => void;
  inline?: boolean;
  actions?: React.ReactNode;
  /** Sadržaj pri dnu (npr. potvrda brisanja). */
  footer?: React.ReactNode;
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    return () => {
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;
  const count = items.length;
  const current = items[index];

  const layer = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pregled slike"
      data-nested-layer
      className="pointer-events-auto fixed inset-0 z-(--z-popover) flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        // Fokus ostaje u pregledu.
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not([disabled])")];
        const position = buttons.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.shiftKey ? (position <= 0 ? buttons.length - 1 : position - 1) : (position + 1) % buttons.length;
        event.preventDefault();
        buttons[next]?.focus();
      }}
    >
      <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 left-3 flex items-center justify-between gap-2 text-sm text-white/85">
        <span className="num" aria-live="polite">
          {index + 1} / {count}
        </span>
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          {actions}
          <IconButton ref={closeRef} aria-label="Zatvori pregled" size="lg" className="bg-white/15 text-white hover:bg-white/25" onClick={onClose}>
            <X />
          </IconButton>
        </div>
      </div>
      {count > 1 ? (
        <>
          <IconButton
            aria-label="Prethodna slika"
            size="lg"
            className="absolute top-1/2 left-3 -translate-y-1/2 bg-white/15 text-white hover:bg-white/25"
            onClick={(event) => {
              event.stopPropagation();
              onStep(-1);
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
              onStep(1);
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
          if (count > 1) onStep(1);
        }}
      />
      {footer ? (
        <div className="absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center" onClick={(event) => event.stopPropagation()}>
          {footer}
        </div>
      ) : null}
    </div>
  );
  return inline ? layer : createPortal(layer, document.body);
}
