"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, LIST_ENTRANCE, prefersReducedMotion } from "@/lib/motion";

/**
 * Ulaz liste: pri prvom učitavanju prvih `LIST_ENTRANCE.max` stavki dobija stagger (fade + y), a stavke koje
 * kasnije stignu (infinite scroll) samo kratak fade. Preskače se kad je lista vraćena iz memorije (povratak sa
 * detalja: odmah na istom mestu) i pri reduced motion; posle promene filtera nova lista dobija samo kratak fade.
 * Samo opacity/transform, posle animacije `clearProps` (bez layout shift-a).
 */
export function useListEntrance(containerRef: React.RefObject<HTMLElement | null>, keys: readonly string[], { skip = false }: { skip?: boolean } = {}) {
  const seenRef = useRef<Set<string> | null>(skip ? new Set(keys) : null);

  useLayoutEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (keys.length === 0) {
      // Prazno (promena filtera, reset): posle prvog ulaza nova lista dobija samo kratak fade, ne ponovni stagger.
      if (seenRef.current) seenRef.current = new Set();
      return;
    }
    const seen = seenRef.current;
    const element = (key: string) => root.querySelector<HTMLElement>(`[data-flip-id="${CSS.escape(key)}"]`);
    if (prefersReducedMotion()) {
      seenRef.current = new Set(keys);
      return;
    }
    if (!seen) {
      const first = keys.slice(0, LIST_ENTRANCE.max).map(element).filter((item): item is HTMLElement => Boolean(item));
      gsap.fromTo(
        first,
        { opacity: 0, y: LIST_ENTRANCE.y },
        { opacity: 1, y: 0, duration: LIST_ENTRANCE.duration, ease: LIST_ENTRANCE.ease, stagger: LIST_ENTRANCE.stagger, clearProps: "opacity,transform" },
      );
      seenRef.current = new Set(keys);
      return;
    }
    const added = keys.filter((key) => !seen.has(key));
    added.forEach((key) => seen.add(key));
    const fresh = added.map(element).filter((item): item is HTMLElement => Boolean(item));
    if (fresh.length > 0) {
      gsap.fromTo(fresh, { opacity: 0 }, { opacity: 1, duration: LIST_ENTRANCE.appendDuration, ease: LIST_ENTRANCE.ease, clearProps: "opacity" });
    }
  }, [containerRef, keys]);
}
