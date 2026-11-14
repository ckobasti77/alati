"use client";

import type { DragEvent, ReactNode } from "react";
import { CircleAlert, Check, Loader2, TriangleAlert, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Zajednički delovi tri stranice za uvoz (uvoz priznanica, WA uvoz, legle pare):
 * naslov, dropzona, bedž statusa, obaveštenje o obradi i traka sa primarnom akcijom.
 * Samo prezentacija — stanje i handleri ostaju na stranicama.
 */

export const selectClass =
  "h-11 w-full min-w-0 cursor-pointer rounded-xl bg-surface px-3 text-base text-text ring-1 ring-inset ring-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60 md:h-9 md:rounded-lg md:text-sm";

/** Klase za `Input` primitiv (zamenjuju slate/white): 16px na telefonu, kompaktno od md. */
export const fieldClass =
  "rounded-xl border-0 bg-surface text-text shadow-none ring-1 ring-inset ring-border-strong placeholder:text-text-muted md:h-9 md:rounded-lg";

export const outlineButtonClass =
  "rounded-xl border-0 bg-surface text-text ring-1 ring-inset ring-border-strong hover:bg-surface-2";

export const labelClass = "mb-1.5 block text-[13px] font-medium text-text-muted";

export function ImportHeader({ title, description, aside }: { title: string; description: string; aside?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="sr-only text-2xl font-semibold tracking-tight md:not-sr-only">{title}</h1>
        <p className="hidden text-sm text-text-muted md:mt-1 md:block">{description}</p>
      </div>
      {aside ? <div className="flex flex-wrap items-center gap-2">{aside}</div> : null}
    </header>
  );
}

type DropzoneProps = {
  isDragOver: boolean;
  onPick: () => void;
  onDragOver: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLElement>) => void;
  icon: LucideIcon;
  titlePhone: string;
  titleDesktop: string;
  hint: string;
  compact?: boolean;
};

export function Dropzone({ isDragOver, onPick, onDragOver, onDragLeave, onDrop, icon: Icon, titlePhone, titleDesktop, hint, compact }: DropzoneProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-11 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border-strong px-4 text-center transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        compact ? "py-6" : "py-8 md:py-12",
        isDragOver ? "bg-accent-soft ring-2 ring-inset ring-accent" : "bg-surface hover:bg-surface-2",
      )}
    >
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        <Icon className="size-6" aria-hidden />
      </span>
      <span className="text-base font-semibold text-text">
        <span className="md:hidden">{titlePhone}</span>
        <span className="max-md:hidden">{titleDesktop}</span>
      </span>
      <span className="max-w-[48ch] text-[13px] leading-5 text-text-muted">{hint}</span>
    </button>
  );
}

const toneClass = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-2 text-text-muted",
} as const;

const toneIcon: Record<keyof typeof toneClass, LucideIcon | null> = {
  success: Check,
  warning: TriangleAlert,
  danger: CircleAlert,
  neutral: null,
};

export type BadgeTone = keyof typeof toneClass;

/** Bedž statusa: soft par boja + ikonica + tekst (boja nikad nije jedini nosilac). */
export function StatusBadge({ tone, children, title }: { tone: BadgeTone; children: ReactNode; title?: string }) {
  const Icon = toneIcon[tone];
  return (
    <span
      title={title}
      className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", toneClass[tone])}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin", className)} aria-hidden />;
}

/** Red sa spinerom za obradu u toku (aria-live, da čitač ekrana javi napredak). */
export function ProgressNote({ children }: { children: ReactNode }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3 py-2.5 text-[13px] text-text-muted md:text-sm">
      <Spinner className="shrink-0 text-accent-text" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** Lista upozorenja (text-warning, sa ikonicom). */
export function WarningList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-[13px] leading-5 text-warning md:text-xs md:leading-4">
      {items.map((warning, index) => (
        <li key={index} className="flex items-start gap-1.5">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">{warning}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Primarna akcija. Telefon: fiksna traka iznad donje navigacije (+ razmak da sadržaj ne ostane skriven).
 * Od md: desno poravnata traka ispod tabele.
 */
export function ImportActionBar({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  return (
    <>
      <div
        data-action-bar
        className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-(--z-sticky) border-t border-border bg-raised px-4 py-3 md:static md:z-auto md:border-0 md:bg-transparent md:p-0"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-4">
          <p aria-live="polite" className="text-[13px] leading-5 text-text-muted md:text-sm">
            {summary}
          </p>
          <div className="md:shrink-0">{children}</div>
        </div>
      </div>
      <div aria-hidden className="h-32 md:hidden" />
    </>
  );
}

/** Jedna kartica reda na telefonu. */
export function RowCard({ children, className }: { children: ReactNode; className?: string }) {
  return <li className={cn("space-y-3 rounded-2xl bg-surface p-3 ring-1 ring-border", className)}>{children}</li>;
}

export const thClass =
  "sticky top-(--header-h) z-(--z-sticky) bg-surface px-3 py-2 text-left text-[11px] leading-4 font-medium uppercase tracking-[0.06em] text-text-muted shadow-[inset_0_-1px_0_var(--color-border)]";

export const tdClass = "border-b border-border px-3 py-3 align-top";
