"use client";

import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react";
import { Toaster as Sonner } from "sonner";
import { useIsDesktop } from "@/lib/useMediaQuery";

/**
 * Obaveštenja (sonner) u tokenima obe teme. Telefon: gore na sredini, ispod safe-area (nikad preko donje
 * navigacije ni preko dugmadi na dnu). Desktop: gore desno, ispod headera.
 */
export function Toaster({ theme }: { theme: "light" | "dark" }) {
  const isDesktop = useIsDesktop();
  return (
    <Sonner
      theme={theme}
      position={isDesktop ? "top-right" : "top-center"}
      containerAriaLabel="Obaveštenja"
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 8px)", left: 12, right: 12 }}
      // Desktop: ispod sticky headera (dugmad za potvrdu su dole i ne smeju biti pokrivena).
      offset={{ top: "calc(var(--header-h) + 12px)", right: 24 }}
      gap={8}
      visibleToasts={3}
      style={{ zIndex: "var(--z-toast)" } as React.CSSProperties}
      icons={{
        success: <CircleCheck className="size-5 text-success" aria-hidden />,
        error: <CircleAlert className="size-5 text-danger" aria-hidden />,
        warning: <TriangleAlert className="size-5 text-warning" aria-hidden />,
        info: <Info className="size-5 text-accent-text" aria-hidden />,
        loading: <Loader2 className="size-5 animate-spin text-text-muted" aria-hidden />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-2xl bg-raised px-4 py-3 text-sm text-text shadow-lg ring-1 ring-border md:w-[356px]",
          title: "font-medium leading-5",
          description: "text-[13px] leading-5 text-text-muted",
          icon: "mt-px shrink-0",
          actionButton: "ml-auto shrink-0 rounded-lg bg-accent px-3 py-1.5 text-[13px] font-medium text-accent-fg",
          cancelButton: "shrink-0 rounded-lg bg-surface-2 px-3 py-1.5 text-[13px] font-medium text-text",
          closeButton: "text-text-muted",
        },
      }}
    />
  );
}
