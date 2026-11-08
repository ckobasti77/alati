"use client";

import { useEffect } from "react";

const isVisibleField = (el: HTMLElement) => !(el as HTMLInputElement).disabled && el.getClientRects().length > 0;

/** Fokusirano polje ostaje iznad tastature (visualViewport se smanji kad se tastatura otvori). */
export function useKeepFocusedVisible(container: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const viewport = window.visualViewport;
    const reveal = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !container.current?.contains(el)) return;
      if (!el.matches("input, textarea, select")) return;
      const rect = el.getBoundingClientRect();
      const visibleTop = viewport ? viewport.offsetTop : 0;
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      // Prostor za sticky footer ispod polja.
      if (rect.top < visibleTop + 64 || rect.bottom > visibleBottom - 88) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    };
    let timer: number | undefined;
    const onFocusIn = () => {
      window.clearTimeout(timer);
      // Tastatura se otvara ~250 ms posle fokusa.
      timer = window.setTimeout(reveal, 280);
    };
    document.addEventListener("focusin", onFocusIn);
    viewport?.addEventListener("resize", reveal);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("focusin", onFocusIn);
      viewport?.removeEventListener("resize", reveal);
    };
  }, [active, container]);
}

/** enterKeyHint="next": Enter prelazi na sledeće vidljivo polje u kontejneru umesto da šalje formu. */
export function focusNextField(event: React.KeyboardEvent<HTMLElement>, container: HTMLElement | null) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.enterKeyHint !== "next") return;
  event.preventDefault();
  const fields = [...(container?.querySelectorAll<HTMLElement>("input[enterkeyhint], textarea[enterkeyhint]") ?? [])].filter(
    (el) => isVisibleField(el) && el.getAttribute("enterkeyhint") !== "search",
  );
  const next = fields[fields.indexOf(target) + 1];
  next?.focus();
}
