"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { animateListExit, Flip, gsap, LIST_EXIT_MAX, LIST_REFLOW, prefersReducedMotion } from "@/lib/motion";

export type PresentItem<T> = { item: T; key: string; leaving: boolean };

/**
 * Ubacuje stavke koje su upravo nestale (ostaju na staroj poziciji, `leaving`) u novu listu.
 * Bez animacije (vraća samo novu listu): prazna nova lista (reset/promena filtera), previše izlazaka odjednom
 * ili reduced motion.
 */
export function reconcilePresence<T>(
  previous: PresentItem<T>[],
  items: T[],
  getKey: (item: T) => string,
  maxExits = LIST_EXIT_MAX,
  reduced = false,
): PresentItem<T>[] {
  const next: PresentItem<T>[] = items.map((item) => ({ item, key: getKey(item), leaving: false }));
  const nextKeys = new Set(next.map((entry) => entry.key));
  const removed = previous.filter((entry) => !nextKeys.has(entry.key));
  if (reduced || next.length === 0 || removed.length === 0 || removed.length > maxExits) return next;

  const result = [...next];
  previous.forEach((entry, index) => {
    if (nextKeys.has(entry.key)) return;
    let insertAt = 0;
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const position = result.findIndex((candidate) => candidate.key === previous[cursor].key);
      if (position >= 0) {
        insertAt = position + 1;
        break;
      }
    }
    result.splice(insertAt, 0, { ...entry, leaving: true });
  });
  return result;
}

/**
 * Lista koja pušta stavke da glatko izađu: stavka koja nestane iz `items` (npr. posle čekiranja „Povrat urađen“
 * u filteru Za povrat) ostaje dok ne izbledi, pa ostale kliznu na mesto (GSAP Flip po `data-flip-id`).
 * `containerRef` ide na element koji sadrži stavke sa `data-flip-id={key}`.
 */
export function usePresenceList<T>(items: T[], getKey: (item: T) => string) {
  const [state, setState] = useState(() => ({
    source: items,
    rendered: items.map((item) => ({ item, key: getKey(item), leaving: false })) as PresentItem<T>[],
  }));
  let current = state;
  if (state.source !== items) {
    current = { source: items, rendered: reconcilePresence(state.rendered, items, getKey, LIST_EXIT_MAX, prefersReducedMotion()) };
    setState(current);
  }

  const containerRef = useRef<HTMLElement | null>(null);
  const animatingRef = useRef(new Set<string>());
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  const finish = useCallback((key: string) => {
    animatingRef.current.delete(key);
    const container = containerRef.current;
    if (container && !prefersReducedMotion()) flipStateRef.current = Flip.getState(container.querySelectorAll("[data-flip-id]"));
    setState((prev) => ({ ...prev, rendered: prev.rendered.filter((entry) => !(entry.leaving && entry.key === key)) }));
  }, []);

  const rendered = current.rendered;
  useLayoutEffect(() => {
    const container = containerRef.current;
    const flipState = flipStateRef.current;
    if (flipState && container) {
      flipStateRef.current = null;
      Flip.from(flipState, { targets: container.querySelectorAll("[data-flip-id]"), duration: LIST_REFLOW.duration, ease: LIST_REFLOW.ease });
    }
    for (const entry of rendered) {
      // Stavka se vratila dok je izlazila (npr. poništen povrat): prekini izlazak i vrati je u normalno stanje.
      if (!entry.leaving && animatingRef.current.has(entry.key)) {
        animatingRef.current.delete(entry.key);
        const element = container?.querySelector<HTMLElement>(`[data-flip-id="${CSS.escape(entry.key)}"]`);
        if (element) {
          gsap.killTweensOf(element);
          gsap.set(element, { clearProps: "opacity,transform,scale" });
          element.removeAttribute("inert");
        }
        continue;
      }
      if (!entry.leaving || animatingRef.current.has(entry.key)) continue;
      animatingRef.current.add(entry.key);
      const element = container?.querySelector(`[data-flip-id="${CSS.escape(entry.key)}"]`);
      if (!element) {
        // Stavka nije u DOM-u (npr. promenjen prikaz): skloni je u sledećem frejmu, bez animacije.
        requestAnimationFrame(() => finish(entry.key));
        continue;
      }
      // Fokus unutar reda koji izlazi ide na susedni red (inert bi ga bacio na <body>).
      if (element.contains(document.activeElement)) {
        const rows = Array.from(container?.querySelectorAll<HTMLElement>("[data-flip-id]:not([inert])") ?? []).filter((row) => row !== element);
        const index = rows.findIndex((row) => element.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING);
        (rows[index >= 0 ? index : rows.length - 1] ?? container)?.focus({ preventScroll: true });
      }
      element.setAttribute("inert", "");
      animateListExit(element, () => finish(entry.key));
    }
  }, [rendered, finish]);

  return { rendered, containerRef };
}
