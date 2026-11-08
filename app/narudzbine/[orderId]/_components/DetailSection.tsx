import { cn } from "@/lib/utils";

type DetailSectionProps = {
  id: string;
  title: string;
  /** Broj pored naslova (npr. broj stavki). */
  count?: number;
  /** Akcija desno od naslova ("Izmeni", "Dodaj"). */
  action?: React.ReactNode;
  /** Naslov samo za čitače ekrana (status kartica). */
  hideTitle?: boolean;
  /**
   * Sekcija u desnoj sticky kartici na desktopu: na telefonu je zasebna kartica, od md je deo jedne kartice
   * (bez sopstvenog okvira, razdvojena linijom).
   */
  aside?: boolean;
  className?: string;
  children: React.ReactNode;
};

/** Kartica sekcije detalja: naslov + opciona akcija, pa sadržaj. */
export function DetailSection({ id, title, count, action, hideTitle = false, aside = false, className, children }: DetailSectionProps) {
  const headingId = `${id}-naslov`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-[calc(var(--header-h)+12px)] rounded-2xl bg-surface p-4 ring-1 ring-border",
        aside ? "md:rounded-none md:bg-transparent md:p-0 md:py-4 md:ring-0 md:first:pt-0 md:last:pb-0" : "md:p-5",
        className,
      )}
    >
      {hideTitle ? (
        <h2 id={headingId} className="sr-only">
          {title}
        </h2>
      ) : (
        <header className="-mt-1.5 mb-1 flex min-h-11 items-center justify-between gap-2 md:min-h-9">
          <h2 id={headingId} className="text-base font-semibold text-text">
            {title}
            {count !== undefined ? <span className="ml-1.5 font-normal text-text-muted num">{count}</span> : null}
          </h2>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/** Tekstualno dugme u zaglavlju sekcije (Izmeni, Dodaj). 44px na telefonu. */
export function SectionAction({ label, ariaLabel, icon: Icon, onClick }: { label: string; ariaLabel?: string; icon?: React.ComponentType<{ className?: string }>; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="-mr-2 inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-accent-text transition-colors duration-(--duration-fast) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:h-9"
    >
      {Icon ? <Icon className="size-4" aria-hidden /> : null}
      {label}
    </button>
  );
}

/** Red „labela … vrednost“ u `<dl>` (novac, slanje). */
export function DetailRow({ label, children, emphasized = false, hint }: { label: React.ReactNode; children: React.ReactNode; emphasized?: boolean; hint?: React.ReactNode }) {
  return (
    <div className="flex min-h-10 items-baseline justify-between gap-4 py-2 md:min-h-0 md:py-1.5">
      <dt className={cn("text-[13px] leading-5", emphasized ? "font-medium text-text" : "text-text-muted")}>
        {label}
        {hint ? <span className="block text-xs text-text-muted">{hint}</span> : null}
      </dt>
      <dd className={cn("min-w-0 text-right text-sm text-text", emphasized ? "text-base font-semibold" : "font-medium")}>{children}</dd>
    </div>
  );
}
