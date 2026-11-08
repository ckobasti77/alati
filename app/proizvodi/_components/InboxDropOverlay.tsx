"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { Images } from "lucide-react";
import type { useProductsState } from "../_hooks/useProductsState";

type InboxDropOverlayProps = {
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  isInboxDragActive: ReturnType<typeof useProductsState>["isInboxDragActive"];
};

export function InboxDropOverlay({ isModalOpen, isInboxDragActive }: InboxDropOverlayProps) {
  return (
    <>
      {!isModalOpen && isInboxDragActive && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-6 py-3 text-slate-800 shadow-2xl shadow-blue-500/25 ring-1 ring-white/70">
            <div className="rounded-full bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/40">
              <Images className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodas u inbox</p>
              <p className="text-xs text-slate-600">Fajlovi se dodaju u sekciju &quot;Slike za ubacivanje&quot;.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
