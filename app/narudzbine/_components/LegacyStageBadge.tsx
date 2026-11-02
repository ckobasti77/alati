"use client";

import { STAGES } from "@/lib/stages";
import type { OrderStage } from "@/types/order";

export const StageBadge = ({ stage }: { stage: OrderStage }) => {
  const meta = STAGES[stage] ?? { label: stage, tone: "" };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${
        meta.tone || "border-slate-200 bg-slate-100 text-slate-800"
      }`}
    >
      {meta.label}
    </span>
  );
};
