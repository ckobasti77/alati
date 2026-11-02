"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { prefersReducedMotion } from "@/lib/motion";
import { cn } from "@/lib/utils";

const SHOW_AFTER_PX = 600;

/** Desktop: dugme "na vrh" u sticky headeru, pa ne pokriva sadržaj. Prostor je rezervisan (bez pomeranja headera). */
export function ScrollTopButton({ className }: { className?: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setVisible(window.scrollY > SHOW_AFTER_PX));
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <IconButton
      aria-label="Nazad na vrh"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })}
      className={cn(
        "transition-opacity duration-(--duration-fast)",
        visible ? "opacity-100" : "pointer-events-none invisible opacity-0",
        className,
      )}
    >
      <ArrowUp />
    </IconButton>
  );
}
