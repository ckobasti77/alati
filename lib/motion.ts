"use client";

import gsap from "gsap";
import { Flip } from "gsap/Flip";
import { Draggable } from "gsap/Draggable";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

// Motion tokeni. Sve animacije idu kroz ove vrednosti i helpere (bez magičnih brojeva po
// komponentama). CSS kopije: --duration-* i --ease-* u styles/globals.css.

/** Trajanja u sekundama (GSAP). */
export const DURATION = { fast: 0.15, base: 0.22, slow: 0.32 } as const;
/** Ista trajanja u ms (CSS, setTimeout). */
export const DURATION_MS = { fast: 150, base: 220, slow: 320 } as const;

export const EASE = {
  /** Podrazumevano za ulaz i promenu stanja. */
  out: "power2.out",
  /** Veći pokreti (sheet od dna). */
  emphasized: "power3.out",
  /** Izlaz. */
  in: "power2.in",
  inOut: "power2.inOut",
} as const;

export const ROUTE_TRANSITION = { duration: 0.18, y: 6, ease: EASE.out } as const;

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Trajanje koje poštuje reduced motion (0 = trenutno). */
export function dur(seconds: number): number {
  return prefersReducedMotion() ? 0 : seconds;
}

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP, Flip, Draggable, DrawSVGPlugin);
}

/** Izlazak stavke iz liste (npr. više ne prolazi filter): fade + blago smanjenje, ostale kliznu (Flip). */
export const LIST_EXIT = { scale: 0.98, duration: DURATION.base, ease: EASE.in } as const;
/** Najviše stavki koje izlaze animirano odjednom; više od toga (npr. promena filtera) menja se odmah. */
export const LIST_EXIT_MAX = 12;
/** Pomeranje ostalih stavki posle izlaska. */
export const LIST_REFLOW = { duration: DURATION.base, ease: EASE.out } as const;

export function animateListExit(element: Element, onComplete: () => void) {
  if (prefersReducedMotion()) {
    onComplete();
    return null;
  }
  return gsap.to(element, { opacity: 0, scale: LIST_EXIT.scale, duration: LIST_EXIT.duration, ease: LIST_EXIT.ease, onComplete });
}

type SheetTargets = {
  panel: HTMLElement;
  overlay: HTMLElement | null;
  /** Telefon: panel ulazi od dna. Desktop: fade + blagi scale. */
  fromBottom: boolean;
};

export function animateSheetIn({ panel, overlay, fromBottom }: SheetTargets) {
  const timeline = gsap.timeline();
  if (prefersReducedMotion()) return timeline;
  if (overlay) {
    timeline.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: DURATION.fast, ease: "none", clearProps: "opacity" }, 0);
  }
  if (fromBottom) {
    timeline.fromTo(
      panel,
      { yPercent: 100 },
      { yPercent: 0, duration: DURATION.slow, ease: EASE.emphasized, clearProps: "transform" },
      0,
    );
  } else {
    timeline.fromTo(
      panel,
      { opacity: 0, y: 8, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, duration: DURATION.base, ease: EASE.out, clearProps: "transform,opacity" },
      0,
    );
  }
  return timeline;
}

export function animateSheetOut({ panel, overlay, fromBottom }: SheetTargets, onComplete: () => void) {
  if (prefersReducedMotion()) {
    onComplete();
    return null;
  }
  const timeline = gsap.timeline({ onComplete });
  if (fromBottom) {
    timeline.to(panel, { yPercent: 100, duration: DURATION.base, ease: EASE.in }, 0);
  } else {
    timeline.to(panel, { opacity: 0, y: 8, scale: 0.98, duration: DURATION.fast, ease: EASE.in }, 0);
  }
  if (overlay) {
    timeline.to(overlay, { opacity: 0, duration: DURATION.fast, ease: "none" }, fromBottom ? DURATION.fast / 2 : 0);
  }
  return timeline;
}

/** Ulaz stranice posle navigacije. Transform se briše na kraju da ne kvari `position: fixed` potomke. */
export function animateRouteIn(element: HTMLElement) {
  if (prefersReducedMotion()) return null;
  return gsap.fromTo(
    element,
    { opacity: 0, y: ROUTE_TRANSITION.y },
    {
      opacity: 1,
      y: 0,
      duration: ROUTE_TRANSITION.duration,
      ease: ROUTE_TRANSITION.ease,
      clearProps: "transform,opacity",
    },
  );
}

/** Prekidač prikaza (Tabela ↔ Kartice, Mreža ↔ Lista): Flip; preko `maxElements` vidljivih samo crossfade. */
export const FLIP_VIEW = { duration: DURATION.slow, ease: EASE.emphasized, maxElements: 60, crossfade: DURATION.base } as const;
/** Prvo učitavanje liste: prvih 12, razmak 20 ms, fade + 8px; stavke iz infinite scroll-a samo kratak fade. */
export const LIST_ENTRANCE = { max: 12, stagger: 0.02, y: 8, duration: DURATION.base, ease: EASE.out, appendDuration: DURATION.fast } as const;
/** Brojevi na tabli pri promeni perioda. */
export const COUNT_UP = { duration: 0.4, ease: EASE.out, snap: 0.01 } as const;
/** Barovi grafikona rastu iz nulte linije; ukupno kašnjenje stagger-a najviše `staggerTotal`. */
export const BAR_GROW = { duration: DURATION.slow, ease: EASE.emphasized, staggerTotal: 0.12 } as const;
/** Promena statusa: mali pulse bedža (boja ide kroz CSS tranziciju). */
export const STAGE_PULSE = { scale: 1.08, duration: DURATION.base, ease: EASE.out } as const;
/** Drag-to-dismiss sheet-a: zatvara se preko 30% visine ili brzinom većom od 0,6 px/ms. */
export const SHEET_DRAG = { closeRatio: 0.3, closeVelocity: 0.6, snapBack: DURATION.fast, ease: EASE.out } as const;
/** Trake koje dolaze odozdo (izbor, grupne akcije). */
export const BAR_SLIDE = { in: DURATION.base, out: DURATION.fast, easeIn: EASE.emphasized, easeOut: EASE.in } as const;
/** Klizni indikator donje navigacije. */
export const NAV_INDICATOR = { duration: DURATION.base, ease: EASE.emphasized } as const;
/** Kopiranje: ikonica → ✓, drži 1,2 s. */
export const COPY_CONFIRM = { swap: DURATION.fast, ease: EASE.out, holdMs: 1200 } as const;
/** ✓ u success toast-u: iscrtavanje + mali pop (jedini bounce, samo za uspeh). */
export const SUCCESS_CHECK = { draw: DURATION.slow, ease: EASE.out, pop: "back.out(2)", popDuration: DURATION.base } as const;
/** Sklopivi paneli: visina 0 ↔ auto. */
export const HEIGHT_TOGGLE = { duration: DURATION.base, easeOpen: EASE.out, easeClose: EASE.in } as const;
/** Indikator tačkica galerije posle `scrollend`. */
export const GALLERY_DOT = { duration: DURATION.fast, ease: EASE.out } as const;

export { Draggable, DrawSVGPlugin, Flip, gsap, useGSAP };
