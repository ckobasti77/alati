"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Copy, Loader2, PenLine, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
const transportModes = ["Kol", "Joe", "Posta", "Bex", "Aks"] as const;

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

type InlineFieldProps = {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
  formatter?: (value?: string | number | null) => string;
  onSave: (nextValue: string) => Promise<void>;
};

function InlineField({ label, value, multiline = false, formatter, onSave }: InlineFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<string>(value ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueAsString = value === null || value === undefined ? "" : String(value);

  useEffect(() => {
    if (isEditing) {
      const target = multiline ? textareaRef.current : inputRef.current;
      if (target) {
        requestAnimationFrame(() => {
          target.focus();
          try {
            target.setSelectionRange(0, target.value.length);
          } catch {
            // ignore
          }
        });
      }
    }
  }, [isEditing, multiline]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(valueAsString);
    }
  }, [isEditing, valueAsString]);

  const handleCopy = async () => {
    const copyValue = valueAsString || formatter?.(value) || "";
    if (!copyValue) {
      toast.info("Nema vrednosti za kopiranje.");
      return;
    }
    try {
      await navigator.clipboard.writeText(copyValue);
      toast.success("Kopirano.");
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await onSave(draft);
      setIsEditing(false);
    } catch {
      // greska se vec javlja kroz toast
    } finally {
      setIsSaving(false);
    }
  };

  const displayValue = formatter ? formatter(value) : valueAsString || "-";
  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key !== "Enter") return;
    event.preventDefault();
    void handleSave();
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm">
      <div className="flex w-full items-start justify-between gap-3">
        <div className="w-full space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          {isEditing ? (
            multiline ? (
              <Textarea
                ref={textareaRef}
                autoResize
                rows={3}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                className="w-full text-sm"
              />
            ) : (
              <Input
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleInputKeyDown}
                className="text-sm"
              />
            )
          ) : (
            <p className="text-base font-semibold text-slate-900">{displayValue}</p>
          )}
        </div>
        <div className="flex items-center gap-1 rounded-full bg-white/90 px-1 py-0.5 text-slate-500 shadow-sm opacity-100 transition md:absolute md:right-3 md:top-3 md:opacity-0 md:group-hover:opacity-100">
          {isEditing ? (
            <>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setDraft(valueAsString);
                  setIsEditing(false);
                }}
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full bg-blue-50 p-1 text-blue-700 hover:bg-blue-100"
                onClick={handleSave}
                disabled={isSaving}
                title="Sacuvaj"
              >
                <Check className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={() => {
                  setDraft(valueAsString);
                  setIsEditing(true);
                }}
                title="Izmeni"
              >
                <PenLine className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                onClick={handleCopy}
                title="Kopiraj vrednost"
              >
                <Copy className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

  const [order, setOrder] = useState<OrderWithProduct | null>(null);
  const isLoading = queryResult === undefined;

  useEffect(() => {
    if (queryResult !== undefined) {
      setOrder(queryResult);
    }
  }, [queryResult]);

  const buildOrderUpdatePayload = (current: OrderWithProduct) => ({
    token: sessionToken,
    id: current._id,
    stage: current.stage,
    productId: current.productId,
    variantId: current.variantId,
    variantLabel: current.variantLabel,
    title: current.title,
    kolicina: Math.max(current.kolicina ?? 1, 1),
    nabavnaCena: current.nabavnaCena,
    prodajnaCena: current.prodajnaCena,
    napomena: current.napomena,
    transportCost: current.pickup ? 0 : current.transportCost,
    transportMode: current.pickup ? undefined : current.transportMode,
    customerName: current.customerName,
    address: current.address,
    phone: current.phone,
    myProfitPercent: current.myProfitPercent,
    pickup: current.pickup ?? false,
  });

  const applyOrderUpdate = async (
    updater: (current: OrderWithProduct) => OrderWithProduct,
    successMessage?: string,
  ) => {
    if (!order) return;
    const previous = order;
    const next = updater(previous);
    setOrder(next);
    try {
      await updateOrder(buildOrderUpdatePayload(next));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      console.error(error);
      setOrder(previous);
      toast.error("Cuvanje nije uspelo.");
      throw error;
    }
  };

  const handleOrderFieldSave = async (
    field:
      | "title"
      | "variantLabel"
      | "kolicina"
      | "nabavnaCena"
      | "prodajnaCena"
      | "transportCost"
      | "transportMode"
      | "customerName"
      | "address"
      | "phone"
      | "myProfitPercent"
      | "napomena",
    value: string,
  ) => {
    if (!order) return;
    const trimmed = value.trim();

    const parseNumber = (input: string) => Number(input.replace(",", "."));

    if (field === "kolicina") {
      const qty = Number.parseInt(trimmed, 10);
      if (!Number.isFinite(qty) || qty < 1) {
        toast.error("Kolicina mora biti 1 ili vise.");
        throw new Error("Invalid quantity");
      }
      await applyOrderUpdate((current) => ({ ...current, kolicina: qty }), "Sacuvano.");
      return;
    }

    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const price = parseNumber(trimmed);
      if (!Number.isFinite(price) || price < 0) {
        toast.error("Cena mora biti 0 ili vise.");
        throw new Error("Invalid price");
      }
      await applyOrderUpdate((current) => ({ ...current, [field]: price }), "Sacuvano.");
      return;
    }

    if (field === "transportCost") {
      if (!trimmed) {
        await applyOrderUpdate((current) => ({ ...current, transportCost: undefined }), "Sacuvano.");
        return;
      }
      const cost = parseNumber(trimmed);
      if (!Number.isFinite(cost) || cost < 0) {
        toast.error("Transport mora biti 0 ili vise.");
        throw new Error("Invalid transport");
      }
      await applyOrderUpdate((current) => ({ ...current, transportCost: cost }), "Sacuvano.");
      return;
    }

    if (field === "transportMode") {
      const normalized = transportModes.find((mode) => mode.toLowerCase() === trimmed.toLowerCase());
      await applyOrderUpdate((current) => ({ ...current, transportMode: normalized }), "Sacuvano.");
      return;
    }

    if (field === "myProfitPercent") {
      if (!trimmed) {
        await applyOrderUpdate((current) => ({ ...current, myProfitPercent: undefined }), "Sacuvano.");
        return;
      }
      const percent = parseNumber(trimmed);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("Procenat mora biti izmedju 0 i 100.");
        throw new Error("Invalid percent");
      }
      await applyOrderUpdate((current) => ({ ...current, myProfitPercent: percent }), "Sacuvano.");
      return;
    }

    if (field === "napomena") {
      await applyOrderUpdate(
        (current) => ({
          ...current,
          napomena: trimmed.length === 0 ? undefined : trimmed,
        }),
        "Sacuvano.",
      );
      return;
    }

    if (field === "variantLabel") {
      await applyOrderUpdate((current) => ({ ...current, variantLabel: trimmed || undefined }), "Sacuvano.");
      return;
    }

    if (field === "title" || field === "customerName" || field === "address" || field === "phone") {
      if (trimmed.length < 2) {
        toast.error("Popuni polje.");
        throw new Error("Invalid field");
      }
      await applyOrderUpdate((current) => ({ ...current, [field]: trimmed }), "Sacuvano.");
    }
  };

  const handlePickupToggle = async (value: boolean) => {
    await applyOrderUpdate(
      (current) => ({
        ...current,
        pickup: value,
        transportCost: value ? 0 : current.transportCost,
        transportMode: value ? undefined : current.transportMode,
      }),
      "Sacuvano.",
    );
  };

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
  const transport = order?.pickup ? 0 : order?.transportCost ?? 0;
  const prof = profit(prodajnoUkupno, nabavnoUkupno, transport);
  const mojDeo = myProfitShare(prof, order?.myProfitPercent ?? 0);
  const shouldShowMyShare = order?.stage === "legle_pare" && order?.myProfitPercent !== undefined;

  const handleStageChange = async (nextStage: OrderStage) => {
    if (!order) return;
    setIsUpdatingStage(true);
    try {
      await applyOrderUpdate((current) => ({ ...current, stage: nextStage }), "Status narudzbine je azuriran.");
    } catch (error) {
      console.error(error);
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
    <div className="mx-auto space-y-6">
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
        <div className="w-full -mx-2 overflow-x-auto pb-2 sm:mx-0 sm:pb-0">
          <div className="flex min-w-max gap-2 px-2 sm:px-0">
            {stageOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={order.stage === option.value ? "default" : "outline"}
                className="min-w-[92px] whitespace-nowrap"
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
                    <img src={mainImage.url} alt={order.product.kpName ?? order.product.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                    N/A
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-wide text-slate-500">Proizvod</p>
                  <p className="text-lg font-semibold text-slate-900">{order.product.kpName ?? order.product.name}</p>
                  <p className="text-xs text-slate-500">FB / IG naziv: {order.product.name}</p>
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
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InlineField label="Naziv narudzbine" value={order.title} onSave={(val) => handleOrderFieldSave("title", val)} />
                <InlineField
                  label="Kolicina"
                  value={order.kolicina}
                  onSave={(val) => handleOrderFieldSave("kolicina", val)}
                />
                <InlineField
                  label="Oznaka tipa / varijante"
                  value={order.variantLabel ?? variantFromProduct?.label ?? ""}
                  onSave={(val) => handleOrderFieldSave("variantLabel", val)}
                />
              </div>
            </CardContent>
          </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Kupac i dostava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField
                label="Kupac"
                value={order.customerName}
                onSave={(val) => handleOrderFieldSave("customerName", val)}
              />
              <InlineField label="Telefon" value={order.phone} onSave={(val) => handleOrderFieldSave("phone", val)} />
              <InlineField
                label="Adresa"
                value={order.address}
                multiline
                onSave={(val) => handleOrderFieldSave("address", val)}
              />
              <InlineField
                label="Transport (EUR)"
                value={transport}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("transportCost", val)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {transportModes.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                    order.transportMode === mode
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                  }`}
                  onClick={() => handleOrderFieldSave("transportMode", mode)}
                >
                  {mode}
                </button>
              ))}
              <button
                type="button"
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 hover:border-slate-300"
                onClick={() => handleOrderFieldSave("transportMode", "")}
              >
                Bez kurira
              </button>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(order.pickup)}
                  onChange={(event) => handlePickupToggle(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Lično preuzimanje
              </label>
              <StageBadge stage={order.stage} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Finansije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField
                label="Prodajna cena (EUR)"
                value={order.prodajnaCena}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("prodajnaCena", val)}
              />
              <InlineField
                label="Nabavna cena (EUR)"
                value={order.nabavnaCena}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("nabavnaCena", val)}
              />
              <InlineField
                label="Kolicina"
                value={order.kolicina}
                onSave={(val) => handleOrderFieldSave("kolicina", val)}
              />
              <InlineField
                label="Moj procenat profita"
                value={order.myProfitPercent ?? ""}
                formatter={(val) => (val === undefined || val === null || val === "" ? "-" : `${val}%`)}
                onSave={(val) => handleOrderFieldSave("myProfitPercent", val)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Napomena</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <InlineField
            label="Napomena"
            value={order.napomena ?? ""}
            multiline
            onSave={(val) => handleOrderFieldSave("napomena", val)}
          />
          <p className="text-xs text-slate-500">Telefon: {order.phone} - Adresa: {order.address}</p>
        </CardContent>
      </Card>
    </div>
  );
}






