"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAuth } from "@/lib/auth-client";
import { useConvexQuery } from "@/lib/convex";
import {
  belgradeTodayKey,
  DASHBOARD_PERIODS,
  DEFAULT_DASHBOARD_PERIOD,
  isDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard";
import type { ObracunSummary } from "@/types/order";
import { AccountsCard } from "./_dashboard/AccountsCard";
import { ActionList } from "./_dashboard/ActionList";
import { DashboardErrorBoundary } from "./_dashboard/DashboardErrorBoundary";
import { PERIOD_LABELS } from "./_dashboard/format";
import { Pipeline } from "./_dashboard/Pipeline";
import { ProfitChart } from "./_dashboard/ProfitChart";
import { ProfitHero } from "./_dashboard/ProfitHero";
import { RecentOrders } from "./_dashboard/RecentOrders";
import type { DashboardOverview } from "./_dashboard/types";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardErrorBoundary>
        <DashboardContent />
      </DashboardErrorBoundary>
    </RequireAuth>
  );
}

const PERIOD_STORAGE_KEY = "dashboard:period";

// RequireAuth ne renderuje sadrzaj na serveru, pa je citanje localStorage-a u inicijalizatoru bezbedno.
function readStoredPeriod(): DashboardPeriod {
  try {
    const stored = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    return isDashboardPeriod(stored) ? stored : DEFAULT_DASHBOARD_PERIOD;
  } catch {
    return DEFAULT_DASHBOARD_PERIOD;
  }
}

/** Danasnji dan u Beogradu; osvezava se kad se aplikacija vrati u fokus i svakog minuta. */
function useBelgradeToday() {
  const [today, setToday] = useState(() => belgradeTodayKey());
  useEffect(() => {
    const refresh = () => setToday(belgradeTodayKey());
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return today;
}

/** Zadrzava poslednji rezultat dok se novi period ucitava (bez treptanja skeletona). */
function useLastDefined<T>(value: T | undefined) {
  const [last, setLast] = useState(value);
  if (value !== undefined && value !== last) setLast(value);
  return { value: value ?? last, stale: value === undefined && last !== undefined };
}

const periodOptions = DASHBOARD_PERIODS.map((period) => ({
  value: period,
  label: (
    <>
      <span className="md:hidden">{PERIOD_LABELS[period].short}</span>
      <span className="max-md:hidden">{PERIOD_LABELS[period].long}</span>
    </>
  ),
}));

function DashboardContent() {
  const { token } = useAuth();
  const sessionToken = token as string;
  const today = useBelgradeToday();
  const [period, setPeriod] = useState<DashboardPeriod>(readStoredPeriod);

  const changePeriod = (next: DashboardPeriod) => {
    setPeriod(next);
    try {
      window.localStorage.setItem(PERIOD_STORAGE_KEY, next);
    } catch {
      // privatni prozor / blokiran storage: izbor vazi do osvezavanja
    }
  };

  const { value: overview, stale } = useLastDefined(
    useConvexQuery<DashboardOverview>("dashboard:overview", { token: sessionToken, period, today }),
  );
  const obracun = useConvexQuery<ObracunSummary>("orders:obracun", { token: sessionToken, scope: "default" });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <h1 className="sr-only md:not-sr-only md:text-2xl md:font-semibold md:tracking-tight md:text-text">Kontrolna tabla</h1>

      <ActionList actions={overview?.actions} />

      <div className="grid gap-3 md:grid-cols-12 md:gap-x-6 md:gap-y-4">
        <div className="md:col-span-12 md:flex md:items-center md:justify-between md:gap-4">
          <h2 className="sr-only md:not-sr-only md:text-base md:font-semibold md:text-text">Pregled perioda</h2>
          <SegmentedControl
            ariaLabel="Period"
            value={period}
            onChange={changePeriod}
            options={periodOptions}
            className="max-md:flex max-md:w-full max-md:[&>button]:flex-1"
          />
        </div>
        <div className="md:col-span-5">
          <ProfitHero period={period} data={overview} stale={stale} />
        </div>
        <div className="md:col-span-7">
          <ProfitChart data={overview} stale={stale} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-12 md:gap-6">
        <div className="md:col-span-5">
          <Pipeline pipeline={overview?.pipeline} />
        </div>
        <div className="md:col-span-7">
          <AccountsCard obracun={obracun} allTime={overview?.allTime} />
        </div>
      </div>

      <RecentOrders latest={overview?.latest} />
    </div>
  );
}
