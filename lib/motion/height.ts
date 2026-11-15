"use client";

import { gsap, HEIGHT_TOGGLE, prefersReducedMotion } from "@/lib/motion";

/**
 * Sklopivi panel: visina 0 ↔ auto (`HEIGHT_TOGGLE`), uz opacity. Na kraju `clearProps`, pa sadržaj ostaje
 * prirodne visine. Jedini dozvoljeni izuzetak od „samo transform/opacity“ (kratak collapse).
 */
export function animateHeight(element: HTMLElement, open: boolean, onComplete?: () => void) {
  // Prekinuta animacija ostavlja inline visinu: novo otvaranje kreće odatle, ne od nule.
  const midway = element.style.height !== "";
  gsap.killTweensOf(element);
  if (prefersReducedMotion()) {
    gsap.set(element, { clearProps: "height,opacity,overflow" });
    onComplete?.();
    return null;
  }
  if (open) {
    return gsap.fromTo(
      element,
      midway
        ? { height: element.offsetHeight, opacity: Number(getComputedStyle(element).opacity), overflow: "hidden" }
        : { height: 0, opacity: 0, overflow: "hidden" },
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
 * Klik dok se zatvara (`data-closing`) ponovo otvara, od trenutne visine.
 */
export function toggleDetails(event: React.MouseEvent<HTMLElement>) {
  const details = event.currentTarget.closest("details");
  const body = details?.querySelector<HTMLElement>("[data-details-body]");
  if (!details || !body || prefersReducedMotion()) return;
  event.preventDefault();
  if (details.open && details.dataset.closing !== "true") {
    details.dataset.closing = "true";
    animateHeight(body, false, () => {
      delete details.dataset.closing;
      details.open = false;
    });
  } else {
    delete details.dataset.closing;
    details.open = true;
    animateHeight(body, true);
  }
}
