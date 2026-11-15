"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { COUNT_UP, gsap, prefersReducedMotion } from "@/lib/motion";
import { Money, type MoneyProps } from "@/components/ui/money";

/**
 * Money koji pri promeni vrednosti broji od stare do nove (COUNT_UP: 400 ms, korak 0,01, tabular cifre).
 * Prvo crtanje i reduced motion: odmah konačna vrednost. Za čitače ekrana tabla ima posebnu `role=status`
 * najavu konačnog broja, pa međukoraci ne smetaju.
 */
export function AnimatedMoney(props: MoneyProps) {
  const target = typeof props.value === "number" && !Number.isNaN(props.value) ? props.value : null;
  const [display, setDisplay] = useState<number | null>(target);
  const shownRef = useRef<number | null>(target);

  useLayoutEffect(() => {
    const from = shownRef.current;
    if (target === null || from === null || from === target || prefersReducedMotion()) {
      shownRef.current = target;
      // Bez animacije: vrednost ide direktno (u callback-u frejma, ne sinhrono u efektu).
      const frame = requestAnimationFrame(() => setDisplay(target));
      return () => cancelAnimationFrame(frame);
    }
    const counter = { value: from };
    const tween = gsap.to(counter, {
      value: target,
      duration: COUNT_UP.duration,
      ease: COUNT_UP.ease,
      snap: { value: COUNT_UP.snap },
      onUpdate: () => {
        shownRef.current = counter.value;
        setDisplay(counter.value);
      },
      onComplete: () => {
        shownRef.current = target;
        setDisplay(target);
      },
    });
    return () => {
      tween.kill();
    };
  }, [target]);

  const shown = target === null ? props.value : (display ?? target);
  return <Money {...props} value={shown} />;
}
