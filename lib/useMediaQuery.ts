"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Isto kao Tailwind `md:`. */
export const DESKTOP_QUERY = "(min-width: 768px)";

/** Prati media query. Na serveru vraća `serverValue` (podrazumevano false = telefon). */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

export const useIsDesktop = () => useMediaQuery(DESKTOP_QUERY);
