"use client";

import { useCallback, useState } from "react";
import type { useRouter } from "next/navigation";
import { useIsDesktop } from "@/lib/useMediaQuery";
import {
  DEFAULT_ORDER_COLUMNS,
  normalizeDensity,
  normalizeOrderColumns,
  otherView,
  resolveOrdersView,
  type OrderColumnKey,
  type OrdersDensity,
  type OrdersListView,
} from "../_lib/orderView";

const STORAGE = {
  desktop: "narudzbine:prikaz:desktop",
  phone: "narudzbine:prikaz:telefon",
  density: "narudzbine:gustina",
  columns: "narudzbine:kolone",
} as const;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Privatni režim / blokiran storage: izbor važi do osvežavanja.
  }
}

type UseOrdersViewParams = {
  basePath: string;
  router: ReturnType<typeof useRouter>;
  searchParamsString: string;
};

/**
 * Prikaz liste (Tabela/Kartice na desktopu, Kompaktno/Detaljno na telefonu), gustina i kolone tabele.
 * Pamti se u localStorage, a prikaz i u URL-u (`?prikaz=`). Stranica se renderuje samo na klijentu (RequireAuth).
 */
export function useOrdersView({ basePath, router, searchParamsString }: UseOrdersViewParams) {
  const isDesktop = useIsDesktop();
  const [stored, setStored] = useState(() => ({
    desktop: readStorage(STORAGE.desktop),
    phone: readStorage(STORAGE.phone),
  }));
  const [density, setDensityState] = useState<OrdersDensity>(() => normalizeDensity(readStorage(STORAGE.density)));
  const [columns, setColumnsState] = useState<OrderColumnKey[]>(() => {
    const raw = readStorage(STORAGE.columns);
    if (!raw) return DEFAULT_ORDER_COLUMNS;
    try {
      return normalizeOrderColumns(JSON.parse(raw));
    } catch {
      return DEFAULT_ORDER_COLUMNS;
    }
  });

  const urlView = new URLSearchParams(searchParamsString).get("prikaz");
  const view = resolveOrdersView({ isDesktop, url: urlView, stored: isDesktop ? stored.desktop : stored.phone });

  const setView = useCallback(
    (next: OrdersListView) => {
      const key = next === "tabela" || next === "kartice" ? "desktop" : "phone";
      writeStorage(STORAGE[key], next);
      setStored((prev) => ({ ...prev, [key]: next }));
      // Trenutni URL (ne render-time searchParams), da se ne pregazi filter upisan u istom tick-u.
      const params = new URLSearchParams(window.location.search);
      params.set("prikaz", next);
      router.replace(`${basePath}?${params.toString()}`, { scroll: false });
    },
    [basePath, router],
  );

  const toggleView = useCallback(() => setView(otherView(view)), [setView, view]);

  const setDensity = useCallback((next: OrdersDensity) => {
    writeStorage(STORAGE.density, next);
    setDensityState(next);
  }, []);

  const toggleColumn = useCallback((key: OrderColumnKey) => {
    setColumnsState((prev) => {
      const next = normalizeOrderColumns(prev.includes(key) ? prev.filter((entry) => entry !== key) : [...prev, key]);
      writeStorage(STORAGE.columns, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetColumns = useCallback(() => {
    writeStorage(STORAGE.columns, JSON.stringify(DEFAULT_ORDER_COLUMNS));
    setColumnsState(DEFAULT_ORDER_COLUMNS);
  }, []);

  return { isDesktop, view, setView, toggleView, density, setDensity, columns, toggleColumn, resetColumns };
}

export type OrdersViewState = ReturnType<typeof useOrdersView>;
