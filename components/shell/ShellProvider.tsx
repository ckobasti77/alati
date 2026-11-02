"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { useAuth } from "@/lib/auth-client";

type ShellContextValue = {
  /** DOM čvor u mobilnom headeru gde stranice ubacuju svoje akcije. */
  actionsSlot: HTMLElement | null;
  setActionsSlot: (node: HTMLElement | null) => void;
  /** DOM čvor u mobilnom headeru za naslov koji stranica sama zadaje. */
  titleSlot: HTMLElement | null;
  setTitleSlot: (node: HTMLElement | null) => void;
  openPalette: () => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell() {
  const value = useContext(ShellContext);
  if (!value) throw new Error("useShell mora biti unutar ShellProvider-a");
  return value;
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const [actionsSlot, setActionsSlot] = useState<HTMLElement | null>(null);
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const canSearch = status === "authenticated";

  useEffect(() => {
    if (!canSearch) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canSearch]);

  const value = useMemo(
    () => ({ actionsSlot, setActionsSlot, titleSlot, setTitleSlot, openPalette }),
    [actionsSlot, titleSlot, openPalette],
  );

  return (
    <ShellContext.Provider value={value}>
      {children}
      {canSearch ? <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} /> : null}
    </ShellContext.Provider>
  );
}

/** Akcije stranice u mobilnom headeru (desno od naslova). Na desktopu se ne prikazuju. */
export function HeaderActions({ children }: { children: React.ReactNode }) {
  const { actionsSlot } = useShell();
  return actionsSlot ? createPortal(children, actionsSlot) : null;
}

/** Naslov stranice u mobilnom headeru umesto podrazumevanog (npr. ime kupca na detalju). */
export function HeaderTitle({ children }: { children: React.ReactNode }) {
  const { titleSlot } = useShell();
  return titleSlot ? createPortal(children, titleSlot) : null;
}
