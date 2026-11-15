"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton, type IconButtonProps } from "@/components/ui/icon-button";
import { COPY_CONFIRM, gsap, prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

type CopyButtonProps = Omit<IconButtonProps, "onClick" | "children"> & {
  /** Kopira i vraća da li je uspelo (npr. `copyText` iz hooka liste/detalja). */
  onCopy: () => Promise<boolean | void> | boolean | void;
};

/**
 * Dugme za kopiranje: posle uspeha ikonica morfuje u ✓ na `COPY_CONFIRM.holdMs` (1,2 s), pa nazad.
 * Morf je kratak scale + opacity (`COPY_CONFIRM.swap`); reduced motion = samo zamena ikonice.
 */
export function CopyButton({ onCopy, className, ...props }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const iconRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const firstRef = useRef(true);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    const icon = iconRef.current;
    if (!icon || prefersReducedMotion()) return;
    const tween = gsap.fromTo(icon, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: COPY_CONFIRM.swap, ease: COPY_CONFIRM.ease, clearProps: "transform,opacity" });
    return () => {
      tween.kill();
    };
  }, [copied]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  return (
    <IconButton
      {...props}
      className={cn(copied && "text-success", className)}
      onClick={async (event) => {
        event.stopPropagation();
        const result = await onCopy();
        if (result === false) return;
        setCopied(true);
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);
        timerRef.current = window.setTimeout(() => setCopied(false), COPY_CONFIRM.holdMs);
      }}
    >
      <span ref={iconRef} className="inline-flex">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Kopirano" : ""}
      </span>
    </IconButton>
  );
}
