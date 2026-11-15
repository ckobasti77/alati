"use client";

import { gsap, HEIGHT_TOGGLE, prefersReducedMotion } from "@/lib/motion";

/**
 * Sklopivi panel: visina 0 ↔ auto (`HEIGHT_TOGGLE`), uz opacity. Na kraju `clearProps`, pa sadržaj ostaje
 * prirodne visine. Jedini dozvoljeni izuzetak od „samo transform/opacity“ (kratak collapse).
 */
export function animateHeight(element: HTMLElement, open: boolean, onComplete?: () => void) {
  gsap.killTweensOf(element);
  if (prefersReducedMotion()) {
    onComplete?.();
    return null;
  }
  if (open) {
    return gsap.fromTo(
      element,
      { height: 0, opacity: 0, overflow: "hidden" },
      { height: "auto", opacity: 1, duration: HEIGHT_TOGGLE.duration, ease: HEIGHT_TOGGLE.easeOpen, clearProps: "height,opacity,overflow", onComplete },
    );
  }
  return gsap.to(element, {
    height: 0,
    opacity: 0,
    overflow: "hidden",
    duration: HEIGHT_TOGGLE.duration,
    ease: HEIGHT_TOGGLE.easeClose,
    onComplete: () => {
      gsap.set(element, { clearProps: "height,opacity,overflow" });
      onComplete?.();
    },
  });
}

/**
 * `<details>` sa animiranim otvaranjem/zatvaranjem: klik na `<summary>` ide kroz ovu funkciju
 * (`onClick` na summary). Otvaranje: open=true pa animacija; zatvaranje: animacija pa open=false.
 */
export function toggleDetails(event: React.MouseEvent<HTMLElement>) {
  const details = event.currentTarget.closest("details");
  const body = details?.querySelector<HTMLElement>("[data-details-body]");
  if (!details || !body || prefersReducedMotion()) return;
  event.preventDefault();
  if (details.open) {
    animateHeight(body, false, () => {
      details.open = false;
    });
  } else {
    details.open = true;
    animateHeight(body, true);
  }
}
