/**
 * Kuda vratiti fokus kad se zatvori dijalog/sheet koji je otvoren iz menija ili drugog sheet-a.
 * U trenutku otvaranja okidač (⋯ meni, stavka u sheet-u) često više ne postoji ili fokus već stoji na <body>,
 * pa okidač unapred prijavljuje rezervni cilj (npr. dugme ⋯).
 */
let pending: HTMLElement | null = null;

export function setFocusReturn(element: HTMLElement | null | undefined) {
  pending = element ?? null;
}

/** Poziva se pri otvaranju: vraća trenutni fokus (ako ima smisla) i rezervni cilj; rezerva se troši. */
export function captureFocusReturn(): { primary: HTMLElement | null; fallback: HTMLElement | null } {
  const active = typeof document !== "undefined" ? document.activeElement : null;
  const fallback = pending;
  pending = null;
  const usable = active instanceof HTMLElement && active !== document.body && !active.closest("[role='menu']");
  return { primary: usable ? active : null, fallback };
}

/** Poziva se pri zatvaranju: fokus na okidač, a ako ga više nema, na rezervni cilj. */
export function restoreFocus(target: { primary: HTMLElement | null; fallback: HTMLElement | null } | null) {
  if (!target) return;
  if (target.primary?.isConnected) target.primary.focus();
  else if (target.fallback?.isConnected) target.fallback.focus();
}
