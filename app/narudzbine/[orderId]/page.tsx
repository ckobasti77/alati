"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, Loader2, PenLine, PhoneCall, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency, formatDate } from "@/lib/format";
import { orderTotals } from "@/lib/calc";
import type { OrderStage, OrderWithProduct } from "@/types/order";

const stageOptions: { value: OrderStage; label: string; tone: string }[] = [
  { value: "poruceno", label: "Poruceno", tone: "border-amber-200 bg-amber-50 text-amber-800" },
  { value: "na_stanju", label: "Na stanju", tone: "border-indigo-200 bg-indigo-50 text-indigo-800" },
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

const resolveProfitPercent = (value?: number) =>
  typeof value === "number" && Number.isFinite(value) ? value : 100;

const formatPercent = (value: number) =>
  `${value.toLocaleString("sr-RS", { minimumFractionDigits: 0, maximumFractionDigits: 1 })}%`;

type InlineFieldProps = {
  label: string;
  value?: string | number | null;
  multiline?: boolean;
  formatter?: (value?: string | number | null) => string;
  renderDisplay?: (valueAsString: string) => ReactNode;
  onSave: (nextValue: string) => Promise<void>;
};

function InlineField({ label, value, multiline = false, formatter, renderDisplay, onSave }: InlineFieldProps) {
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
            <div className="text-base font-semibold text-slate-900">
              {renderDisplay ? renderDisplay(displayValue) : displayValue}
            </div>
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
  const pathname = usePathname();
  const isKalaba = pathname?.startsWith("/kalaba");
  const basePath = isKalaba ? "/kalaba" : "/narudzbine";
  const backLabel = isKalaba ? "Nazad na Kalaba" : "Nazad na narudzbine";
  const orderScope = isKalaba ? "kalaba" : "default";
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Nije prosledjen ID narudzbine.</p>
        <Button onClick={() => router.push(basePath)}>{backLabel}</Button>
      </div>
    );
  }

  return <OrderDetails orderId={orderId} basePath={basePath} backLabel={backLabel} orderScope={orderScope} />;
}

function OrderDetails({
  orderId,
  basePath,
  backLabel,
  orderScope,
}: {
  orderId: string;
  basePath: string;
  backLabel: string;
  orderScope: "default" | "kalaba";
}) {
  const router = useRouter();
  const { token } = useAuth();
  const sessionToken = token as string;
  const [isUpdatingStage, setIsUpdatingStage] = useState(false);
  const updateOrder = useConvexMutation("orders:update");
  const queryResult = useConvexQuery<OrderWithProduct | null>("orders:get", {
    token: sessionToken,
    id: orderId,
    scope: orderScope,
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
    scope: orderScope,
    stage: current.stage,
    productId: current.productId,
    supplierId: current.supplierId,
    variantId: current.variantId,
    variantLabel: current.variantLabel,
    title: current.title,
    kolicina: Math.max(current.kolicina ?? 1, 1),
    nabavnaCena: current.nabavnaCena,
    prodajnaCena: current.prodajnaCena,
    napomena: current.napomena,
    transportCost: current.transportCost,
    transportMode: current.transportMode,
    myProfitPercent: current.myProfitPercent,
    customerName: current.customerName,
    address: current.address,
    phone: current.phone,
    pickup: current.pickup ?? false,
    items: current.items?.map((item) => {
      const { product, ...rest } = item as any;
      return rest;
    }),
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
      | "myProfitPercent"
      | "customerName"
      | "address"
      | "phone"
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

    if (field === "myProfitPercent") {
      if (!trimmed) {
        toast.error("Unesi procenat profita.");
        throw new Error("Invalid percent");
      }
      const percent = parseNumber(trimmed);
      if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
        toast.error("Procenat mora biti izmedju 0 i 100.");
        throw new Error("Invalid percent");
      }
      await applyOrderUpdate((current) => ({ ...current, myProfitPercent: percent }), "Sacuvano.");
      return;
    }

    if (field === "transportMode") {
      const normalized = transportModes.find((mode) => mode.toLowerCase() === trimmed.toLowerCase());
      await applyOrderUpdate((current) => ({ ...current, transportMode: normalized }), "Sacuvano.");
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
      }),
      "Sacuvano.",
    );
  };

  const totals = order ? orderTotals(order) : null;
  const prodajnoUkupno = totals?.totalProdajno ?? 0;
  const nabavnoUkupno = totals?.totalNabavno ?? 0;
  const transport = totals?.transport ?? 0;
  const prof = totals?.profit ?? 0;
  const myProfitPercent = resolveProfitPercent(order?.myProfitPercent);
  const myProfit = prof * (myProfitPercent / 100);
  const telHref = order ? `tel:${order.phone.replace(/[^+\d]/g, "")}` : "";

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
        <Button onClick={() => router.push(basePath)}>{backLabel}</Button>
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
            onClick={() => router.push(basePath)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
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
        <CardHeader>
          <CardTitle>Stavke narudzbine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <InlineField label="Naziv narudzbine" value={order.title} onSave={(val) => handleOrderFieldSave("title", val)} />
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item) => {
                const images = (item as any).product?.images ?? [];
                const mainImage = images.find((image: any) => image.isMain) ?? images[0];
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {mainImage?.url ? (
                        <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mainImage.url} alt={item.title} className="h-full w-full object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                          N/A
                        </div>
                      )}
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                        {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                        <p className="text-xs text-slate-500">Kolicina: {item.kolicina}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Prodajna</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.prodajnaCena, "EUR")}</p>
                      <p className="text-xs text-slate-500">Nabavna {formatCurrency(item.nabavnaCena, "EUR")}</p>
                      {item.manualProdajna ? (
                        <span className="inline-flex justify-end text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                          Rucno uneta cena
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Narudzbina nema stavke.</p>
          )}
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
              <InlineField
                label="Telefon"
                value={order.phone}
                renderDisplay={(val) => (
                  <a
                    href={`tel:${val.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-2 text-blue-700 hover:underline"
                  >
                    <PhoneCall className="h-4 w-4" />
                    <span className="text-slate-900">{val || "-"}</span>
                  </a>
                )}
                onSave={(val) => handleOrderFieldSave("phone", val)}
              />
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
            <div className="grid gap-3 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Ukupna kolicina</p>
                <p className="text-base font-semibold text-slate-900">{totals?.totalQty ?? order.kolicina}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Prodajno ukupno</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(prodajnoUkupno, "EUR")}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Nabavno ukupno</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(nabavnoUkupno, "EUR")}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Transport</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(transport, "EUR")}</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <InlineField
                label="Moj procenat profita"
                value={myProfitPercent}
                formatter={(val) => formatPercent(Number(val ?? 0))}
                onSave={(val) => handleOrderFieldSave("myProfitPercent", val)}
              />
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs uppercase tracking-wide text-slate-500">Moj profit</p>
                <p className={`text-base font-semibold ${myProfit < 0 ? "text-red-600" : "text-slate-900"}`}>
                  {formatCurrency(myProfit, "EUR")}
                </p>
                <p className="text-xs text-slate-500">Ukupno {formatCurrency(prof, "EUR")}</p>
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
          <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <a href={telHref} className="inline-flex items-center gap-1 text-blue-700 hover:underline">
              <PhoneCall className="h-3.5 w-3.5" />
              {order.phone}
            </a>
            <span className="text-slate-400">·</span>
            <span>Adresa: {order.address}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
