"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { CloudUpload } from "lucide-react";
import type { useProductsState } from "../_hooks/useProductsState";

type FormDropOverlayProps = {
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  isDraggingFiles: ReturnType<typeof useProductsState>["isDraggingFiles"];
};

export function FormDropOverlay({ isModalOpen, isDraggingFiles }: FormDropOverlayProps) {
  return (
    <>
      {isModalOpen && isDraggingFiles && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-black/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface/75 px-6 py-3 text-text shadow-2xl shadow-black/25 ring-1 ring-border">
            <div className="rounded-full bg-accent p-2.5 text-accent-fg shadow-md">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodaš</p>
              <p className="text-xs text-text-muted">Drop radi gde god da spustiš fajlove dok je modal otvoren.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
