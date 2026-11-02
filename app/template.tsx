"use client";

import { useRef } from "react";
import { animateRouteIn, useGSAP } from "@/lib/motion";

// Prvo učitavanje se ne animira (sadržaj sa servera je već vidljiv, bez treptanja posle hidratacije).
let hasNavigated = false;

/** Blaga tranzicija između ruta: fade + 6px, 180ms (lib/motion ROUTE_TRANSITION). Poštuje reduced motion. */
export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!hasNavigated) {
      hasNavigated = true;
      return;
    }
    if (ref.current) animateRouteIn(ref.current);
  });

  return <div ref={ref}>{children}</div>;
}
