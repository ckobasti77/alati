"use client";

import { useMemo } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexQuery } from "@/lib/convex";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingDots } from "@/components/LoadingDots";
import { formatCurrency } from "@/lib/format";
import type { ObracunSummary } from "@/types/order";

export default function ObracunPage() {
  return (
    <RequireAuth>
      <ObracunContent />
    </RequireAuth>
  );
}

function ObracunContent() {
  const { token } = useAuth();
  const sessionToken = token as string;
  const data = useConvexQuery<ObracunSummary>("orders:obracun", { token: sessionToken, scope: "default" });

  const aksBexRows = useMemo(() => data?.aksBex.byOwner ?? [], [data]);
  const postaRows = useMemo(() => data?.posta.byOwner ?? [], [data]);
  const totalAksBex = data?.aksBex.totalWithStarting ?? data?.aksBex.total ?? 0;
  const totalStarting = data?.aksBex.totalStarting ?? 0;
  const totalLegle = totalAksBex + (data?.posta.total ?? 0);

  if (data === undefined) {
    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Obracun</h1>
          <p className="text-sm text-slate-500">Pregled uplata koje su legle po racunima i posti.</p>
        </header>
        <Card>
          <CardContent className="flex items-center justify-center py-10 text-slate-500">
            <LoadingDots show label="Ucitavanje obracuna..." />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Obracun</h1>
        <p className="text-sm text-slate-500">Pregled uplata koje su legle po racunima i posti.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ukupno leglo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(totalLegle, "EUR")}</p>
            <p className="text-xs text-slate-500">{data.meta.ordersCount} narudzbina sa leglim parama</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Aks/Bex ukupno</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(totalAksBex, "EUR")}</p>
            <p className="text-xs text-slate-500">
              Aks: {formatCurrency(data.aksBex.totalAks, "EUR")} / Bex: {formatCurrency(data.aksBex.totalBex, "EUR")} / Pocetno:{" "}
              {formatCurrency(totalStarting, "EUR")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Posta ukupno</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">{formatCurrency(data.posta.total, "EUR")}</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Aks + Bex po racunima</CardTitle>
          </CardHeader>
          <CardContent>
            {aksBexRows.length === 0 ? (
              <p className="text-sm text-slate-500">Jos nema leglih uplata preko Aksa/Bexa.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Racun</TableHead>
                      <TableHead className="text-right">Ukupno</TableHead>
                      <TableHead className="text-right">Pocetno</TableHead>
                      <TableHead className="text-right">Leglo</TableHead>
                      <TableHead className="text-right">Aks</TableHead>
                      <TableHead className="text-right">Bex</TableHead>
                      <TableHead className="text-right">Br. narudzbina</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aksBexRows.map((row) => (
                      <TableRow key={row.owner}>
                        <TableCell className="font-medium text-slate-700">{row.owner}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.startingAmount ?? 0, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.ordersTotal ?? 0, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.aks ?? 0, "EUR")}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.bex ?? 0, "EUR")}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Posta po brojevima</CardTitle>
          </CardHeader>
          <CardContent>
            {postaRows.length === 0 ? (
              <p className="text-sm text-slate-500">Jos nema leglih uplata preko poste.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Broj</TableHead>
                      <TableHead className="text-right">Ukupno</TableHead>
                      <TableHead className="text-right">Br. narudzbina</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {postaRows.map((row) => (
                      <TableRow key={row.owner}>
                        <TableCell className="font-medium text-slate-700">{row.owner}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total, "EUR")}</TableCell>
                        <TableCell className="text-right">{row.count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

