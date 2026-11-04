"use client";

import { useEffect, useState } from "react";

/**
 * Tastatura za combobox sa listom ispod polja: ↑/↓ biraju aktivnu opciju (aria-activedescendant),
 * Enter bira, Esc zatvara listu. Fokus ostaje u polju (WAI-ARIA combobox obrazac).
 */
export function useListboxNav({
  count,
  open,
  setOpen,
  onSelect,
  optionId,
  enterSelectsFirst = false,
}: {
  count: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSelect: (index: number) => void;
  optionId: (index: number) => string;
  /** Enter bez aktivne opcije bira prvu (pretraga proizvoda). */
  enterSelectsFirst?: boolean;
}) {
  const [rawActive, setActive] = useState(-1);
  const active = open && rawActive < count ? rawActive : -1;

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  }, [active, optionId]);

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (count === 0) return;
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(event.key === "ArrowDown" ? 0 : count - 1);
        return;
      }
      setActive(event.key === "ArrowDown" ? Math.min(active + 1, count - 1) : Math.max(active - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      if (!open || count === 0) return;
      const index = active >= 0 ? active : enterSelectsFirst ? 0 : -1;
      if (index < 0) return;
      event.preventDefault();
      onSelect(index);
      setActive(-1);
      return;
    }
    if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  };

  return {
    active,
    resetActive: () => setActive(-1),
    inputProps: {
      onKeyDown,
      "aria-activedescendant": active >= 0 ? optionId(active) : undefined,
    },
  };
}
