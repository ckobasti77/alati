"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useConvexQuery } from "@/lib/convex";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import type { ObracunSummary, Order, OrdersSummary } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

/* ─── Sparkline seed data (deterministic visual flair) ─── */
const sparkSales = [12, 18, 14, 22, 19, 28, 32, 30, 35, 33, 38, 42];
const sparkPurchase = [10, 14, 11, 18, 16, 20, 24, 22, 26, 25, 28, 30];
const sparkTransport = [2, 3, 2, 4, 3, 3, 5, 4, 3, 4, 3, 4];
const sparkProfit = [2, 4, 3, 6, 5, 8, 10, 9, 11, 10, 12, 14];

function DashboardContent() {
  const { token } = useAuth();
  const sessionToken = token as string;
  const router = useRouter();
  const summary = useConvexQuery<OrdersSummary>("orders:summary", { token: sessionToken });
  const obracun = useConvexQuery<ObracunSummary>("orders:obracun", { token: sessionToken, scope: "default" });
  const latest = useConvexQuery<Order[]>("orders:latest", { token: sessionToken });

  const rows = useMemo(() => latest ?? [], [latest]);

  const handleRowClick = (id: string) => {
    router.push(`/narudzbine/${id}`);
  };

  const stageLabels: Record<string, string> = {
    poruceno: "Poruceno",
    aks: "Aks",
    na_stanju: "Na stanju",
    poslato: "Poslato",
    stiglo: "Stiglo",
    legle_pare: "Leglo",
    vraceno: "Vraćeno",
  };

  const {
    totalProdajno,
    totalNabavno,
    totalTransport,
    totalProfit,
    percentLabels,
  } = useMemo(() => {
    const prodajnoTotal = summary?.ukupnoProdajno ?? 0;
    const nabavnoTotal = summary?.ukupnoNabavno ?? 0;
    const transportTotal = summary?.ukupnoTransport ?? 0;
    const profitTotal = summary?.profit ?? 0;

    const formatPercent = (value: number) =>
      `${value.toLocaleString("sr-RS", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;
    const share = (part: number) => (prodajnoTotal > 0 ? (part / prodajnoTotal) * 100 : 0);

    return {
      totalProdajno: prodajnoTotal,
      totalNabavno: nabavnoTotal,
      totalTransport: transportTotal,
      totalProfit: profitTotal,
      percentLabels: {
        prodajno: `↑ ${formatPercent(100)}`,
        nabavno: `↓ ${formatPercent(share(nabavnoTotal))}`,
        transport: `↓ ${formatPercent(share(transportTotal))}`,
        profit: `↑ ${formatPercent(share(profitTotal))}`,
      },
    };
  }, [summary]);

  const {
    totalLeglo,
    legloOrdersCount,
    ownerCards,
  } = useMemo(() => {
    const aksBexRows = obracun?.aksBex.byOwner ?? [];
    const postaRows = obracun?.posta.byOwner ?? [];
    const totalAksBex = obracun?.aksBex.totalWithStarting ?? obracun?.aksBex.total ?? 0;
    const totalPosta = obracun?.posta.total ?? 0;
    const cards = [
      ...aksBexRows.map((row) => ({
        key: `aks-bex-${row.owner}`,
        title: `Aks/Bex - ${row.owner}`,
        value: row.total,
        description: `Aks ${formatCurrency(row.aks ?? 0, "EUR")} / Bex ${formatCurrency(row.bex ?? 0, "EUR")}${
          (row.startingAmount ?? 0) > 0 ? ` / Pocetno ${formatCurrency(row.startingAmount ?? 0, "EUR")}` : ""
        }`,
        count: row.count,
      })),
      ...postaRows.map((row) => ({
        key: `posta-${row.owner}`,
        title: `Posta - ${row.owner}`,
        value: row.total,
        description: "Posta uplata",
        count: row.count,
      })),
    ];
    const legloCount =
      aksBexRows.reduce((sum, row) => sum + row.count, 0) + postaRows.reduce((sum, row) => sum + row.count, 0);
    return {
      totalLeglo: totalAksBex + totalPosta,
      legloOrdersCount: legloCount,
      ownerCards: cards,
    };
  }, [obracun]);

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      {/* ─── Header ─── */}
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Moja evidencija</h1>
          <p className="mt-1 text-sm text-slate-500">Brz pregled narudzbina, faza i profita (EUR).</p>
        </div>
        <div className="flex gap-2">
          <Button
            asChild
            className="rounded-xl border text-slate-900 backdrop-blur-sm"
            style={{
              background: "var(--btn-glass-bg)",
              borderColor: "var(--btn-glass-border)",
            }}
          >
            <Link href="/narudzbine">Narudzbine</Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="rounded-xl bg-transparent text-slate-500 hover:text-slate-900"
            style={{ borderColor: "var(--btn-glass-border)" }}
          >
            <Link href="/proizvodi">Proizvodi</Link>
          </Button>
        </div>
      </section>

      {/* ─── Top 4 KPI Cards ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ukupno prodajno"
          value={formatCurrency(totalProdajno, "EUR")}
          percent={percentLabels.prodajno}
          sparkline={sparkSales}
          trend="up"
        />
        <StatCard
          title="Ukupno nabavno"
          value={formatCurrency(totalNabavno, "EUR")}
          percent={percentLabels.nabavno}
          sparkline={sparkPurchase}
          trend="down"
          accent="red"
        />
        <StatCard
          title="Ukupno transport"
          value={formatCurrency(totalTransport, "EUR")}
          percent={percentLabels.transport}
          sparkline={sparkTransport}
          trend="down"
          accent="red"
        />
        <StatCard
          title="Profit"
          value={formatCurrency(totalProfit, "EUR")}
          percent={percentLabels.profit}
          description={`${summary?.brojNarudzbina ?? 0} narudzbina · umanjeno za Omer ${formatCurrency(summary?.omerUkupno ?? 0, "EUR")}`}
          sparkline={sparkProfit}
          trend="up"
          accent="green"
        />
      </section>

      {/* ─── Secondary Stats ─── */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Ukupno leglo"
          value={formatCurrency(totalLeglo, "EUR")}
          description={`${legloOrdersCount} narudzbina u statusu Leglo`}
          accent="blue"
        />
        <StatCard
          title="Ukupno licno preuzimanje"
          value={formatCurrency(summary?.ukupnoLicnoPreuzimanje ?? 0, "EUR")}
          description={`${summary?.licnoPreuzimanjeBrojNarudzbina ?? 0} narudzbina`}
          accent="blue"
        />
        <StatCard
          title="Omer (Aks x 2.5)"
          value={formatCurrency(summary?.omerUkupno ?? 0, "EUR")}
          description={`${summary?.omerBrojPosiljki ?? 0} Aks posiljki`}
          accent="red"
        />
      </section>

      {/* ─── Owner Accounts ─── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Racuni i imena za postu
          </h2>
          <Button variant="ghost" size="sm" asChild className="text-slate-500 hover:text-slate-900">
            <Link href="/obracun">Detaljan obracun →</Link>
          </Button>
        </div>
        {ownerCards.length === 0 ? (
          <div
            className="rounded-2xl border p-6 text-sm text-slate-500"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--card-border)",
            }}
          >
            Jos nema porudzbina sa statusom Leglo i unetim racunom/imenom.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ownerCards.map((card) => (
              <StatCard
                key={card.key}
                title={card.title}
                value={formatCurrency(card.value, "EUR")}
                description={card.description}
                percent={`${card.count}x`}
                accent="blue"
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Latest Orders Table ─── */}
      <section
        className="overflow-hidden rounded-2xl border backdrop-blur-sm"
        style={{
          background: "var(--card-bg)",
          borderColor: "var(--card-border)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        <div
          className="flex items-center justify-between border-b px-6 py-5"
          style={{ borderColor: "var(--card-border)" }}
        >
          <h2 className="text-lg font-semibold text-slate-900">Poslednje narudzbine</h2>
        </div>

        {rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Jos nema narudzbina.
          </div>
        ) : (
          <>
            {/* ─── Mobile Cards ─── */}
            <div className="grid gap-3 p-4 md:hidden">
              {rows.map((order) => {
                const totals = orderTotals(order);
                return (
                  <button
                    key={order._id}
                    type="button"
                    onClick={() => handleRowClick(order._id)}
                    className="rounded-xl border p-4 text-left transition-all duration-200 hover:bg-slate-50"
                    style={{
                      background: "var(--card-bg)",
                      borderColor: "var(--card-border)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">{formatDate(order.kreiranoAt)}</p>
                        <p className="text-sm font-semibold text-slate-900">{order.title}</p>
                        {order.variantLabel ? (
                          <p className="text-xs text-slate-500">Tip: {order.variantLabel}</p>
                        ) : null}
                        <p className="text-xs text-slate-500">Kolicina: {totals.totalQty}</p>
                      </div>
                      <span
                        className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500"
                      >
                        {stageLabels[order.stage] ?? order.stage}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Prodajno</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(totals.totalProdajno, "EUR")}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Nabavno</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(totals.totalNabavno, "EUR")}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Transport</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(totals.transport, "EUR")}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-slate-500">Profit</p>
                        <p className={`font-semibold ${totals.profit < 0 ? "text-rose-400" : "text-emerald-500"}`}>
                          {formatCurrency(totals.profit, "EUR")}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ─── Desktop Table ─── */}
            <div className="hidden md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr
                    className="border-b"
                    style={{ borderColor: "var(--card-border)" }}
                  >
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">Datum</th>
                    <th className="px-6 py-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">Naslov</th>
                    <th className="px-6 py-3 text-center text-[11px] font-medium uppercase tracking-wider text-slate-500">Kolicina</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Prodajno</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Nabavno</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Transport</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-wider text-slate-500">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((order) => {
                    const totals = orderTotals(order);
                    return (
                      <tr
                        key={order._id}
                        className="cursor-pointer border-b transition-colors duration-150 hover:bg-slate-50"
                        style={{ borderColor: "var(--row-divider)" }}
                        onClick={() => handleRowClick(order._id)}
                      >
                        <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatDate(order.kreiranoAt)}</td>
                        <td className="px-6 py-4 font-medium text-slate-700">
                          <span className="inline-flex items-center gap-1.5">
                            {order.title}
                            <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center text-slate-500">{totals.totalQty}</td>
                        <td className="px-6 py-4 text-right text-slate-700">{formatCurrency(totals.totalProdajno, "EUR")}</td>
                        <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(totals.totalNabavno, "EUR")}</td>
                        <td className="px-6 py-4 text-right text-slate-500">{formatCurrency(totals.transport, "EUR")}</td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              totals.profit < 0
                                ? "bg-rose-500/10 text-rose-500"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {formatCurrency(totals.profit, "EUR")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
