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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Naslov</TableHead>
                <TableHead>Kolicina</TableHead>
                <TableHead className="text-right">Prodajno (EUR)</TableHead>
                <TableHead className="text-right">Nabavno (EUR)</TableHead>
                <TableHead className="text-right">Transport (EUR)</TableHead>
                <TableHead className="text-right">Profit (EUR)</TableHead>
                <TableHead className="text-right">Moj deo (EUR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-slate-500">
                    Jos nema narudzbina.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((order) => {
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
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
