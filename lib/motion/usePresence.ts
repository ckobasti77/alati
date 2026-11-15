"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { BAR_SLIDE, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Traka koja se pojavljuje odozdo (izbor, grupne akcije): ostaje u DOM-u dok traje izlazak.
 * Ulaz: y 100% → 0 (`BAR_SLIDE.in`), izlaz: → 100% (`BAR_SLIDE.out`). Reduced motion: odmah.
 */
export function usePresence<T extends HTMLElement>(visible: boolean) {
  const ref = useRef<T | null>(null);
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);
  // Reduced motion: nestaje odmah (bez izlazne animacije).
  if (!visible && mounted && prefersReducedMotion()) setMounted(false);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!mounted || !element) return;
    if (prefersReducedMotion()) return;
    const tween = visible
      ? gsap.fromTo(element, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: BAR_SLIDE.in, ease: BAR_SLIDE.easeIn, clearProps: "transform,opacity" })
      : gsap.to(element, { yPercent: 100, opacity: 0, duration: BAR_SLIDE.out, ease: BAR_SLIDE.easeOut, onComplete: () => setMounted(false) });
    return () => {
      tween.kill();
    };
  }, [visible, mounted]);

  return { mounted, ref };
}
