"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useConvexQuery } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/StatCard";
import { formatCurrency, formatDate } from "@/lib/format";
import { ukupnoNabavno, ukupnoProdajno, profit } from "@/lib/calc";
import type { Sale, SalesSummary } from "@/types/sale";

export default function DashboardPage() {
  const summary = useConvexQuery<SalesSummary>("sales:summary", {});
  const latest = useConvexQuery<Sale[]>("sales:latest", {});

  const rows = useMemo(() => latest ?? [], [latest]);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Moja evidencija</h1>
          <p className="text-sm text-slate-500">Brz pregled prodaje i profita (EUR).</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/prodaje">Prodaje</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/proizvodi">Proizvodi</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard title="Ukupno prodajno" value={formatCurrency(summary?.ukupnoProdajno ?? 0, "EUR")} />
        <StatCard title="Ukupno nabavno" value={formatCurrency(summary?.ukupnoNabavno ?? 0, "EUR")} />
        <StatCard
          title="Profit"
          value={formatCurrency(summary?.profit ?? 0, "EUR")}
          description={`${summary?.brojProdaja ?? 0} prodaja`}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Poslednje prodaje</CardTitle>
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
                <TableHead className="text-right">Profit (EUR)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-slate-500">
                    Jos nema prodaja.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((sale) => {
                  const prodajnoUkupno = ukupnoProdajno(sale.kolicina, sale.prodajnaCena);
                  const nabavnoUkupno = ukupnoNabavno(sale.kolicina, sale.nabavnaCena);
                  const prof = profit(prodajnoUkupno, nabavnoUkupno);

                  return (
                    <TableRow key={sale._id}>
                      <TableCell>{formatDate(sale.kreiranoAt)}</TableCell>
                      <TableCell className="font-medium text-slate-700">{sale.title}</TableCell>
                      <TableCell>{sale.kolicina}</TableCell>
                      <TableCell className="text-right">{formatCurrency(prodajnoUkupno, "EUR")}</TableCell>
                      <TableCell className="text-right">{formatCurrency(nabavnoUkupno, "EUR")}</TableCell>
                      <TableCell className="text-right font-semibold">
                        <span className={prof < 0 ? "text-red-600" : ""}>{formatCurrency(prof, "EUR")}</span>
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