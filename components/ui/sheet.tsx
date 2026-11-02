"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { animateSheetIn, animateSheetOut } from "@/lib/motion";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";

const desktopWidths = {
  sm: "md:max-w-md",
  md: "md:max-w-lg",
  lg: "md:max-w-2xl",
  xl: "md:max-w-3xl",
} as const;

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Telefon: `auto` = sheet od dna (do 92% visine), `full` = ceo ekran. Od md je uvek modal. */
  size?: "auto" | "full";
  desktopWidth?: keyof typeof desktopWidths;
  /** Desktop: modal centriran ili pri vrhu (paleta). */
  placement?: "center" | "top";
  /** Bez trake sa naslovom (naslov ostaje za čitače ekrana); sadržaj sam nudi zatvaranje. */
  hideHeader?: boolean;
  headerActions?: React.ReactNode;
  /** Sticky dno: primarna akcija. */
  footer?: React.ReactNode;
  children?: React.ReactNode;
  bodyClassName?: string;
  onOpenAutoFocus?: (event: Event) => void;
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  size = "auto",
  desktopWidth = "md",
  placement = "center",
  hideHeader = false,
  headerActions,
  footer,
  children,
  bodyClassName,
  onOpenAutoFocus,
}: SheetProps) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  // `present` drži sheet u DOM-u dok traje izlazna animacija.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!present || !panel) return;
    const targets = { panel, overlay: overlayRef.current, fromBottom: !isDesktop };
    if (open) {
      const timeline = animateSheetIn(targets);
      return () => {
        timeline.kill();
      };
    }
    const timeline = animateSheetOut(targets, () => setPresent(false));
    return () => {
      timeline?.kill();
    };
  }, [open, present, isDesktop]);

  const isFull = size === "full";

  return (
    <DialogPrimitive.Root
      open={present}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <DialogPrimitive.Portal>
        <div
          className={cn(
            "pointer-events-none fixed inset-0 z-(--z-modal) flex justify-center md:p-6",
            placement === "top" ? "items-end md:items-start md:pt-[12vh]" : "items-end md:items-center",
          )}
        >
          <DialogPrimitive.Overlay
            ref={overlayRef}
            className="pointer-events-auto absolute inset-0 bg-overlay backdrop-blur-[2px]"
          />
          <DialogPrimitive.Content
            ref={panelRef}
            onOpenAutoFocus={onOpenAutoFocus}
            className={cn(
              "pointer-events-auto relative flex w-full flex-col overflow-hidden bg-surface text-text shadow-(--shadow-sheet) outline-none",
              isFull ? "h-dvh max-h-dvh" : "max-h-[92dvh] rounded-t-(--radius-sheet)",
              "md:h-auto md:max-h-[min(85dvh,56rem)] md:rounded-(--radius-sheet) md:ring-1 md:ring-border",
              desktopWidths[desktopWidth],
            )}
          >
            {!isFull && (
              <div aria-hidden className="mx-auto mt-2 h-1 w-9 shrink-0 rounded-full bg-border-strong md:hidden" />
            )}
            {hideHeader ? (
              <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
            ) : (
              <header
                className={cn(
                  "flex min-h-14 shrink-0 items-center gap-1 border-b py-1.5 pl-4 pr-2",
                  isFull && "pt-[max(0.375rem,env(safe-area-inset-top))] md:pt-1.5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <DialogPrimitive.Title className="truncate text-base font-semibold leading-6">{title}</DialogPrimitive.Title>
                  {description ? (
                    <DialogPrimitive.Description className="truncate text-[13px] leading-5 text-text-muted">
                      {description}
                    </DialogPrimitive.Description>
                  ) : null}
                </div>
                {headerActions}
                <DialogPrimitive.Close asChild>
                  <IconButton aria-label="Zatvori" size="lg" className="md:size-9">
                    <X />
                  </IconButton>
                </DialogPrimitive.Close>
              </header>
            )}
            {!description && <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>}
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4",
                !footer && "pb-[max(1rem,env(safe-area-inset-bottom))] md:pb-4",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <footer className="shrink-0 border-t bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:pb-3">
                {footer}
              </footer>
            ) : null}
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
