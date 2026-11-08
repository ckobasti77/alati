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
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/75 px-6 py-3 text-slate-800 shadow-2xl shadow-blue-500/25 ring-1 ring-white/70">
            <div className="rounded-full bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/40">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodas</p>
              <p className="text-xs text-slate-600">Drop radi gde god da spustis fajlove dok je modal otvoren.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
