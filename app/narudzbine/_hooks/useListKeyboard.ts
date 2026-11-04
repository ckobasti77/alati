"use client";

import { useEffect, useEffectEvent, useState, type RefObject } from "react";

type UseListKeyboardParams = {
  /** Redosled stavki na ekranu. */
  ids: string[];
  searchRef: RefObject<HTMLInputElement | null>;
  onOpen: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleView: () => void;
};

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.closest("[role=combobox]") !== null);

// Otvoren dijalog, sheet ili meni: prečice liste ne smeju da rade ispod njega.
const isOverlayOpen = () =>
  Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'));

/** Tastatura liste: `/` pretraga, `j`/`k` kretanje, `Enter` otvara, `x` bira, `v` menja prikaz. */
export function useListKeyboard({ ids, searchRef, onOpen, onToggleSelect, onToggleView }: UseListKeyboardParams) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const currentActive = activeId && ids.includes(activeId) ? activeId : null;

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target) || isOverlayOpen()) return;
    const key = event.key;

    if (key === "/") {
      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
      return;
    }
    if (key === "v" || key === "V") {
      event.preventDefault();
      onToggleView();
      return;
    }
    if (key === "j" || key === "k") {
      if (ids.length === 0) return;
      event.preventDefault();
      const index = currentActive ? ids.indexOf(currentActive) : -1;
      const nextIndex = index === -1 ? 0 : Math.min(Math.max(index + (key === "j" ? 1 : -1), 0), ids.length - 1);
      const nextId = ids[nextIndex];
      setActiveId(nextId);
      const node = document.querySelector<HTMLElement>(`[data-flip-id="${nextId}"]`);
      node?.focus({ preventScroll: true });
      node?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (!currentActive) return;
    // Enter na fokusiranom linku/dugmetu radi sam; ovde samo kad je fokus na redu/kartici.
    if (key === "Enter" && event.target instanceof HTMLElement && event.target.dataset.flipId === currentActive) {
      event.preventDefault();
      onOpen(currentActive);
      return;
    }
    if (key === "x" || key === "X") {
      event.preventDefault();
      onToggleSelect(currentActive);
    }
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);

  return { activeId: currentActive, setActiveId };
}
