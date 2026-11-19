"use client";

// SourceBadge — mala oznaka pored labele polja koje je popunjeno iz slike.
// "proveri" se doda kada je polje nesigurno (uncertain / nizak confidence).

import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function SourceBadge({ review = false, className }: { review?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 align-middle", className)}>
      <span className="inline-flex items-center rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium leading-4 text-accent-text">
        iz slike
      </span>
      {review ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium leading-4 text-warning">
          <TriangleAlert className="size-3" aria-hidden />
          proveri
        </span>
      ) : null}
    </span>
  );
}
