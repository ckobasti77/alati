"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useConvexQuery } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { myProfitShare, profit, ukupnoNabavno, ukupnoProdajno } from "@/lib/calc";
import type { Order, OrdersSummary } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { token } = useAuth();
  const sessionToken = token as string;
  const router = useRouter();
  const summary = useConvexQuery<OrdersSummary>("orders:summary", { token: sessionToken });
  const latest = useConvexQuery<Order[]>("orders:latest", { token: sessionToken });

  const rows = useMemo(() => latest ?? [], [latest]);

  const handleRowClick = (id: string) => {
    router.push(`/narudzbine/${id}`);
  };

  const stageLabels: Record<string, string> = {
    poruceno: "Poruceno",
    poslato: "Poslato",
    stiglo: "Stiglo",
    legle_pare: "Leglo",
  };

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Moja evidencija</h1>
          <p className="text-sm text-slate-500">Brz pregled narudzbina, faza i profita (EUR).</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/narudzbine">Narudzbine</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/proizvodi">Proizvodi</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard title="Ukupno prodajno" value={formatCurrency(summary?.ukupnoProdajno ?? 0, "EUR")} />
        <StatCard title="Ukupno nabavno" value={formatCurrency(summary?.ukupnoNabavno ?? 0, "EUR")} />
        <StatCard
          title="Profit"
          value={formatCurrency(summary?.profit ?? 0, "EUR")}
          description={`${summary?.brojNarudzbina ?? 0} narudzbina`}
        />
        <StatCard
          title="Moj deo profita"
          value={formatCurrency(summary?.mojProfit ?? 0, "EUR")}
          description="Na osnovu unetog procenta"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Poslednje narudzbine</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-center text-sm text-slate-500">Jos nema narudzbina.</div>
          ) : (
            <>
              <div className="grid gap-3 md:hidden">
                {rows.map((order) => {
                  const prodajnoUkupno = ukupnoProdajno(order.kolicina, order.prodajnaCena);
                  const nabavnoUkupno = ukupnoNabavno(order.kolicina, order.nabavnaCena);
                  const transport = order.transportCost ?? 0;
                  const prof = profit(prodajnoUkupno, nabavnoUkupno, transport);
                  const moj = myProfitShare(prof, order.myProfitPercent ?? 0);
                  const shouldShowMyShare = order.stage === "legle_pare" && order.myProfitPercent !== undefined;
                  return (
                    <button
                      key={order._id}
                      type="button"
                      onClick={() => handleRowClick(order._id)}
                      className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-wide text-slate-500">{formatDate(order.kreiranoAt)}</p>
                          <p className="text-base font-semibold text-slate-900">{order.title}</p>
                          {order.variantLabel ? (
                            <p className="text-xs text-slate-500">Tip: {order.variantLabel}</p>
                          ) : null}
                          <p className="text-xs text-slate-500">Kolicina: {order.kolicina}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {stageLabels[order.stage] ?? order.stage}
                        </Badge>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Prodajno</p>
                          <p className="font-semibold">{formatCurrency(prodajnoUkupno, "EUR")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Nabavno</p>
                          <p className="font-semibold">{formatCurrency(nabavnoUkupno, "EUR")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Transport</p>
                          <p className="font-semibold">{formatCurrency(transport, "EUR")}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate-400">Profit</p>
                          <p className={`font-semibold ${prof < 0 ? "text-red-600" : "text-slate-900"}`}>
                            {formatCurrency(prof, "EUR")}
                          </p>
                        </div>
                        <div className="col-span-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                          <span className="text-[11px] uppercase tracking-wide text-slate-500">Moj deo</span>
                          {shouldShowMyShare ? (
                            <span className="text-sm font-semibold text-emerald-700">
                              {formatCurrency(moj, "EUR")}{" "}
                              <span className="text-xs text-slate-500">({order.myProfitPercent}%)</span>
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">Bice dostupno kada legne.</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 md:block hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Naslov</TableHead>
                      <TableHead>Kolicina</TableHead>
                      <TableHead className="text-right">Prodajno</TableHead>
                      <TableHead className="text-right">Nabavno</TableHead>
                      <TableHead className="text-right">Transport</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                      <TableHead className="text-right">Moj deo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((order) => {
                      const prodajnoUkupno = ukupnoProdajno(order.kolicina, order.prodajnaCena);
                      const nabavnoUkupno = ukupnoNabavno(order.kolicina, order.nabavnaCena);
                      const transport = order.transportCost ?? 0;
                      const prof = profit(prodajnoUkupno, nabavnoUkupno, transport);
                      const moj = myProfitShare(prof, order.myProfitPercent ?? 0);
                      const shouldShowMyShare = order.stage === "legle_pare" && order.myProfitPercent !== undefined;

                      return (
                        <TableRow
                          key={order._id}
                          className="cursor-pointer transition hover:bg-slate-50"
                          onClick={() => handleRowClick(order._id)}
                        >
                          <TableCell>{formatDate(order.kreiranoAt)}</TableCell>
                          <TableCell className="font-medium text-slate-700">
                            <span className="inline-flex items-center gap-1">
                              {order.title}
                              <ArrowUpRight className="h-4 w-4 text-slate-400" />
                            </span>
                          </TableCell>
                          <TableCell>{order.kolicina}</TableCell>
                          <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(transport, "EUR")}</TableCell>
                          <TableCell className="text-right font-semibold">
                            <span className={prof < 0 ? "text-red-600" : ""}>{formatCurrency(prof, "EUR")}</span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-emerald-700">
                            {shouldShowMyShare ? (
                              <span>
                                {formatCurrency(moj, "EUR")}{" "}
                                <span className="text-xs text-slate-500">({order.myProfitPercent}%)</span>
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
