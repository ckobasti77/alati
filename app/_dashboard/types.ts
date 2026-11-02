import type { DashboardPeriod, DashboardTotals, PipelineEntry, SeriesPoint } from "@/lib/dashboard";
import type { OrderStage } from "@/types/order";

/** Izlaz `dashboard:overview` (convex/dashboard.ts). */
export type DashboardOverview = {
  todayKey: string;
  period: {
    key: DashboardPeriod;
    startKey: string | null;
    endKey: string | null;
    previous: { startKey: string; endKey: string } | null;
    bucket: "day" | "month";
    currentKey: string;
  };
  totals: DashboardTotals;
  previous: DashboardTotals | null;
  series: SeriesPoint[];
  allTime: DashboardTotals;
  pipeline: PipelineEntry[];
  actions: {
    late: number;
    awaitingShipment: number;
    refund: {
      period: { startDate: string; endDate: string } | null;
      pendingCount: number;
      pendingAmount: number;
    };
    restock: number;
  };
  latest: {
    _id: string;
    title: string;
    customerName: string;
    stage: OrderStage;
    kreiranoAt: number;
    prodajno: number;
    profit: number;
  }[];
};
