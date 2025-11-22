"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import { myProfitShare, profit, ukupnoNabavno, ukupnoProdajno } from "@/lib/calc";
import type { OrderStage, OrderWithProduct, ProductVariant } from "@/types/order";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "poslato", label: "Poslato", tone: "border-blue-200 bg-blue-50 text-blue-800" },
  { value: "stiglo", label: "Stiglo", tone: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  { value: "legle_pare", label: "Leglo", tone: "border-slate-200 bg-slate-100 text-slate-900" },
];

const stageLabels = stageOptions.reduce((acc, item) => {
  acc[item.value] = { label: item.label, tone: item.tone };
  return acc;
}, {} as Record<OrderStage, { label: string; tone: string }>);

const StageBadge = ({ stage }: { stage: OrderStage }) => {
  const meta = stageLabels[stage] ?? { label: stage, tone: "" };
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

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}

function OrderDetailsContent() {
  const params = useParams();
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Nije prosledjen ID narudzbine.</p>
        <Button onClick={() => router.push("/narudzbine")}>Nazad na narudzbine</Button>
      </div>
    );
  }

  return <OrderDetails orderId={orderId} />;
}

function OrderDetails({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const sessionToken = token as string;
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const updateOrder = useConvexMutation("orders:update");
  const queryResult = useConvexQuery<OrderWithProduct | null>("orders:get", {
    token: sessionToken,
    id: orderId,
  });

  const isLoading = queryResult === undefined;
  const order = queryResult ?? null;

  const variantFromProduct: ProductVariant | undefined = useMemo(() => {
    if (!order?.product) return undefined;
    const variants = order.product.variants ?? [];
    if (variants.length === 0) return undefined;
    if (order.variantId) {
      const match = variants.find((variant) => variant.id === order.variantId);
      if (match) return match;
    }
    return variants.find((variant) => variant.isDefault) ?? variants[0];
  }, [order]);

  const prodajnoUkupno = order ? ukupnoProdajno(order.kolicina, order.prodajnaCena) : 0;
  const nabavnoUkupno = order ? ukupnoNabavno(order.kolicina, order.nabavnaCena) : 0;
  const transport = order?.transportCost ?? 0;
  const prof = profit(prodajnoUkupno, nabavnoUkupno, transport);
  const mojDeo = myProfitShare(prof, order?.myProfitPercent ?? 0);
  const shouldShowMyShare = order?.stage === "legle_pare" && order?.myProfitPercent !== undefined;

  const handleStageChange = async (nextStage: OrderStage) => {
    if (!order) return;
    setIsUpdatingStage(true);
    try {
      await updateOrder({
        token: sessionToken,
        id: order._id,
        stage: nextStage,
        productId: order.productId,
        variantId: order.variantId,
        variantLabel: order.variantLabel,
        title: order.title,
        kolicina: order.kolicina,
        nabavnaCena: order.nabavnaCena,
        prodajnaCena: order.prodajnaCena,
        napomena: order.napomena,
        transportCost: order.transportCost,
        transportMode: order.transportMode,
        customerName: order.customerName,
        address: order.address,
        phone: order.phone,
        myProfitPercent: order.myProfitPercent,
      });
      toast.success("Status narudzbine je azuriran.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce promeniti status.");
    } finally {
      setIsUpdatingStage(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          <span className="text-sm text-slate-600">Ucitavanje narudzbine...</span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Narudzbina nije pronadjena.</p>
        <p className="text-sm text-slate-500">Proveri link ili se vrati na listu narudzbina.</p>
        <Button onClick={() => router.push("/narudzbine")}>Nazad na narudzbine</Button>
      </div>
    );
  }

  const mainImage = (() => {
    const images = order.product?.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  })();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/narudzbine")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Nazad
          </Button>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Narudzbina</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{order.title}</h1>
              <StageBadge stage={order.stage} />
            </div>
            {order.variantLabel ? <p className="text-sm text-slate-500">{order.variantLabel}</p> : null}
            <p className="text-xs text-slate-500">Kreirano {formatDate(order.kreiranoAt)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stageOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={order.stage === option.value ? "default" : "outline"}
              className="min-w-[92px]"
              disabled={isUpdatingStage || order.stage === option.value}
              onClick={() => handleStageChange(option.value)}
            >
              {isUpdatingStage && order.stage !== option.value ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Proizvod i tip</CardTitle>
          {order.productId ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => router.push(`/proizvodi/${order.productId}`)}
            >
              Otvori proizvod
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {order.product ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                {mainImage?.url ? (
                  <div className="h-16 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage.url} alt={order.product.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                    N/A
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-wide text-slate-500">Proizvod</p>
                  <p className="text-lg font-semibold text-slate-900">{order.product.name}</p>
                  {variantFromProduct ? (
                    <p className="text-sm text-slate-600">{variantFromProduct.label}</p>
                  ) : null}
                  <p className="text-xs text-slate-500">Kolicina: {order.kolicina}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-slate-500">Prodajna cena</p>
                <p className="text-xl font-semibold text-slate-900">
                  {formatCurrency(variantFromProduct?.prodajnaCena ?? order.prodajnaCena, "EUR")}
                </p>
                <p className="text-xs text-slate-500">
                  Nabavna {formatCurrency(variantFromProduct?.nabavnaCena ?? order.nabavnaCena, "EUR")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-600">Narudzbina nije vezana za proizvod. Naslov: {order.title}</p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kupac i dostava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Kupac</p>
              <p className="text-base font-semibold text-slate-900">{order.customerName}</p>
              <p className="text-sm text-slate-600">{order.phone}</p>
              <p className="text-sm text-slate-600">{order.address}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Transport</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
                {order.transportMode ? <p className="text-xs text-slate-500">{order.transportMode}</p> : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Stage</p>
                <StageBadge stage={order.stage} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finansije</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Prodajno ukupno</p>
              <p className="text-base font-semibold text-slate-900">{formatCurrency(prodajnoUkupno, "EUR")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Nabavno ukupno</p>
              <p className="text-base font-semibold text-slate-900">{formatCurrency(nabavnoUkupno, "EUR")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Profit</p>
              <p className={`text-base font-semibold ${prof < 0 ? "text-red-600" : "text-slate-900"}`}>
                {formatCurrency(prof, "EUR")}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Moj deo</p>
              {shouldShowMyShare ? (
                <p className="text-base font-semibold text-emerald-700">
                  {formatCurrency(mojDeo, "EUR")} <span className="text-xs text-slate-500">({order.myProfitPercent}%)</span>
                </p>
              ) : (
                <p className="text-sm text-slate-500">Bice dostupno kada stage bude "legle pare".</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Napomena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-700">{order.napomena || "Nema dodatnih napomena."}</p>
          <p className="text-xs text-slate-500">Telefon: {order.phone} ? Adresa: {order.address}</p>
        </CardContent>
      </Card>
    </div>
  );
}
