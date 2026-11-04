"use client";

import { Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrderPreview } from "./OrdersListContext";

const sizes = { 40: "size-10", 48: "size-12", 56: "size-14" } as const;

/** Sličica prve stavke. Više stavki = "naslagane" kartice iza (bez teksta preko slike). */
export function OrderThumb({ preview, size = 40, className }: { preview: OrderPreview; size?: keyof typeof sizes; className?: string }) {
  const box = sizes[size];
  return (
    <span className={cn("relative inline-flex shrink-0", box, preview.count > 1 && "mr-1", className)}>
      {preview.count > 1 ? (
        <span aria-hidden className={cn("absolute inset-0 translate-x-1 -translate-y-1 rounded-lg bg-surface-3 ring-1 ring-border")} />
      ) : null}
      {preview.url ? (
        // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL, bez Next optimizacije (kao i ranije)
        <img
          src={preview.url}
          alt=""
          loading="lazy"
          decoding="async"
          className={cn("relative rounded-lg bg-surface-2 object-cover ring-1 ring-border", box)}
        />
      ) : (
        <span className={cn("relative inline-flex items-center justify-center rounded-lg bg-surface-2 text-text-muted ring-1 ring-border", box)}>
          <Package className="size-4" aria-hidden />
        </span>
      )}
      {preview.count > 1 ? <span className="sr-only">{preview.count} proizvoda</span> : null}
    </span>
  );
}
