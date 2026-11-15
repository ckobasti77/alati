"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Package } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { GALLERY_DOT, gsap, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { GalleryItem } from "../../_lib/detailTypes";

/**
 * Galerija: telefon = swipe (scroll-snap) sa tačkama i brojačem ISPOD slike; desktop = velika slika,
 * strelice, tastatura ←/→ i traka sličica. Tap/klik otvara postojeći lightbox.
 */
export function ProductGalleryView({ items, name, onOpen }: { items: GalleryItem[]; name: string; onOpen: (item: GalleryItem) => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);
  // Dok traje programski (smooth) skrol, onScroll ne sme da vrati indeks na međuvrednost (brze strelice).
  const targetRef = useRef<number | null>(null);
  const count = items.length;
  // Telefon: aktivna tačka je jedan klizni indikator (transform), pomera se kad swipe stane na novoj slici.
  const dotsRef = useRef<HTMLDivElement | null>(null);
  const indicatorRef = useRef<HTMLSpanElement | null>(null);
  const placedRef = useRef(false);
  useLayoutEffect(() => {
    const dots = dotsRef.current;
    const indicator = indicatorRef.current;
    if (!dots || !indicator) return;
    const dot = dots.querySelector<HTMLElement>(`[data-dot="${Math.min(index, 9)}"]`);
    if (!dot) return;
    const x = dot.offsetLeft + dot.offsetWidth / 2 - indicator.offsetWidth / 2;
    if (!placedRef.current || prefersReducedMotion()) gsap.set(indicator, { x });
    else gsap.to(indicator, { x, duration: GALLERY_DOT.duration, ease: GALLERY_DOT.ease, overwrite: true });
    placedRef.current = true;
  }, [index, count]);

  const goTo = (next: number) => {
    const target = Math.max(0, Math.min(count - 1, next));
    const track = trackRef.current;
    targetRef.current = target;
    if (track) track.scrollTo({ left: target * track.clientWidth, behavior: "smooth" });
    setIndex(target);
  };

  if (count === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-2xl md:aspect-[4/3] bg-surface-2 text-text-muted ring-1 ring-border">
        <Package className="size-8" aria-hidden />
        <span className="text-sm">Nema slika</span>
      </div>
    );
  }

  return (
    <div
      role="region"
      aria-roledescription="galerija"
      aria-label={`Slike: ${name}`}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") goTo(index + 1);
        if (event.key === "ArrowLeft") goTo(index - 1);
      }}
      className="flex flex-col gap-2"
    >
      <div className="relative">
        <div
          ref={trackRef}
          onPointerDown={() => {
            targetRef.current = null;
          }}
          onScroll={(event) => {
            const el = event.currentTarget;
            const next = Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));
            if (targetRef.current !== null) {
              if (next === targetRef.current) targetRef.current = null;
              return;
            }
            if (next !== index) setIndex(next);
          }}
          className="flex aspect-square w-full snap-x snap-mandatory md:aspect-[4/3] overflow-x-auto overscroll-x-contain rounded-2xl bg-surface-2 ring-1 ring-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, itemIndex) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item)}
              aria-label={`Otvori sliku ${itemIndex + 1} od ${count}`}
              className="relative size-full shrink-0 cursor-zoom-in snap-center focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL */}
              <img src={item.url} alt={item.alt} loading={itemIndex === 0 ? "eager" : "lazy"} className="size-full object-contain" />
            </button>
          ))}
        </div>
        {count > 1 ? (
          <>
            <IconButton aria-label="Prethodna slika" variant="ghost" onClick={() => goTo(index - 1)} disabled={index === 0} className="absolute top-1/2 left-2 hidden -translate-y-1/2 bg-surface/90 shadow-(--shadow-raised) md:inline-flex">
              <ChevronLeft />
            </IconButton>
            <IconButton aria-label="Sledeća slika" variant="ghost" onClick={() => goTo(index + 1)} disabled={index === count - 1} className="absolute top-1/2 right-2 hidden -translate-y-1/2 bg-surface/90 shadow-(--shadow-raised) md:inline-flex">
              <ChevronRight />
            </IconButton>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          {/* Telefon: tačke + brojač ispod slike (ništa preko fotografije). */}
          <div className="flex items-center justify-center gap-1 md:hidden">
            <div ref={dotsRef} className="relative flex items-center gap-1">
            <span ref={indicatorRef} aria-hidden className="pointer-events-none absolute top-1/2 left-0 h-2 w-4 -translate-y-1/2 rounded-full bg-accent" />
            {items.slice(0, 10).map((item, dotIndex) => (
              <button
                key={item.id}
                data-dot={dotIndex}
                type="button"
                onClick={() => goTo(dotIndex)}
                aria-label={`Slika ${dotIndex + 1}`}
                aria-current={dotIndex === index ? "true" : undefined}
                className="flex size-6 cursor-pointer items-center justify-center after:absolute after:size-11 after:content-[''] relative"
              >
                <span className={cn("block size-2 rounded-full bg-text-muted/50", dotIndex === index && "opacity-0")} />
              </button>
            ))}
            </div>
            <span className="num ml-2 text-xs text-text-muted" aria-live="polite">
              {index + 1} / {count}
            </span>
          </div>
          {/* Desktop: traka sličica. */}
          <div className="hidden gap-2 overflow-x-auto pb-1 md:flex">
            {items.map((item, thumbIndex) => (
              <button
                key={item.id}
                type="button"
                onClick={() => goTo(thumbIndex)}
                aria-label={`Prikaži sliku ${thumbIndex + 1}`}
                aria-current={thumbIndex === index ? "true" : undefined}
                className={cn(
                  "size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg bg-surface-2 ring-1 focus-visible:outline-2 focus-visible:outline-ring",
                  thumbIndex === index ? "ring-2 ring-accent" : "ring-border opacity-80 hover:opacity-100",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL */}
                <img src={item.url} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
