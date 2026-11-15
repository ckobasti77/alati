"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { FLIP_VIEW, gsap, prefersReducedMotion } from "@/lib/motion";

type Positions = Map<string, { left: number; top: number }>;

/** Položaji stavki sa `data-flip-id` koje su (bar delom) u viewport-u: samo čitanje, jedan layout. */
function visiblePositions(root: ParentNode): Positions {
  const height = window.innerHeight;
  const positions: Positions = new Map();
  for (const element of root.querySelectorAll<HTMLElement>("[data-flip-id]")) {
    const rect = element.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= height || rect.width === 0) continue;
    positions.set(element.dataset.flipId ?? "", { left: rect.left, top: rect.top });
  }
  return positions;
}

/**
 * Prelaz između dva prikaza iste liste (Tabela ↔ Kartice, Mreža ↔ Lista) po `data-flip-id`, samo za stavke
 * u viewport-u: FLIP preko GSAP-a (First: položaji pre promene, Last: posle crtanja, Invert: x/y razlika,
 * Play: transform do nule). Kad je vidljivo više od `FLIP_VIEW.maxElements`, samo crossfade kontejnera.
 *
 * Namerno bez GSAP Flip plugina: on za svaki element čita i computed style (širina, visina, transform),
 * što je sa CPU 4x usporenjem davalo dug task od ~150–300 ms na listi od 30 kartica. Ovde je jedno čitanje
 * položaja pre i jedno posle promene, a animira se samo transform/opacity.
 * Upotreba: `capture()` neposredno pre promene prikaza; animacija kreće posle sledećeg crtanja (`view`).
 */
export function useViewFlip<T>(view: T, containerRef: React.RefObject<HTMLElement | null>) {
  const stateRef = useRef<{ positions: Positions; crossfade: boolean } | null>(null);
  const lastViewRef = useRef(view);

  const capture = useCallback(() => {
    if (prefersReducedMotion()) return;
    const root = containerRef.current;
    if (!root) return;
    const positions = visiblePositions(root);
    stateRef.current = { positions, crossfade: positions.size === 0 || positions.size > FLIP_VIEW.maxElements };
  }, [containerRef]);

  useLayoutEffect(() => {
    if (lastViewRef.current === view) return;
    lastViewRef.current = view;
    const captured = stateRef.current;
    stateRef.current = null;
    const root = containerRef.current;
    if (!captured || !root) return;
    if (captured.crossfade) {
      gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: FLIP_VIEW.crossfade, ease: FLIP_VIEW.ease, clearProps: "opacity" });
      return;
    }
    // Last: novi položaji (čitanje), pa Invert/Play (samo upisi).
    const height = window.innerHeight;
    const moved: { element: HTMLElement; x: number; y: number }[] = [];
    const entered: HTMLElement[] = [];
    for (const element of root.querySelectorAll<HTMLElement>("[data-flip-id]")) {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= height) continue;
      const before = captured.positions.get(element.dataset.flipId ?? "");
      if (before) moved.push({ element, x: before.left - rect.left, y: before.top - rect.top });
      else entered.push(element);
    }
    const tweens = moved.map(({ element, x, y }) =>
      gsap.fromTo(element, { x, y }, { x: 0, y: 0, duration: FLIP_VIEW.duration, ease: FLIP_VIEW.ease, clearProps: "transform" }),
    );
    if (entered.length > 0) {
      tweens.push(gsap.fromTo(entered, { opacity: 0 }, { opacity: 1, duration: FLIP_VIEW.crossfade, ease: FLIP_VIEW.ease, clearProps: "opacity" }));
    }
    return () => tweens.forEach((tween) => tween.progress(1).kill());
  }, [view, containerRef]);

  return capture;
}
