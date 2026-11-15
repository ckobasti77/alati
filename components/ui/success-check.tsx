"use client";

import { useRef } from "react";
import { DrawSVGPlugin, gsap, prefersReducedMotion, SUCCESS_CHECK, useGSAP } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * ✓ koji se iscrta pri uspešnom snimanju (ikonica success toast-a). Krug + kvačica preko DrawSVG, uz mali
 * „pop“ (jedini bounce u aplikaciji, samo za uspeh). Reduced motion: statičan ✓.
 */
export function SuccessCheck({ className }: { className?: string }) {
  const root = useRef<SVGSVGElement | null>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion() || !root.current) return;
      gsap.registerPlugin(DrawSVGPlugin);
      const timeline = gsap.timeline();
      timeline
        .fromTo("circle", { drawSVG: "0%" }, { drawSVG: "100%", duration: SUCCESS_CHECK.draw, ease: SUCCESS_CHECK.ease })
        .fromTo("path", { drawSVG: "0%" }, { drawSVG: "100%", duration: SUCCESS_CHECK.draw * 0.6, ease: SUCCESS_CHECK.ease }, "-=0.12")
        .fromTo(root.current, { scale: 0.85 }, { scale: 1, duration: SUCCESS_CHECK.popDuration, ease: SUCCESS_CHECK.pop, clearProps: "transform" }, 0);
    },
    { scope: root },
  );

  return (
    <svg ref={root} viewBox="0 0 24 24" fill="none" aria-hidden className={cn("size-5 text-success", className)}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7.5 12.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
