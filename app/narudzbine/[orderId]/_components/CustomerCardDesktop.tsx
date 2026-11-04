"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { Copy, PhoneCall } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/format";
import { slanjeModes } from "../../_lib/types";
import { normalizeOwnerLookupKey } from "../../_lib/helpers";
import { StageBadge, InlineField } from "./LegacyFields";
import type { OrderWithProduct } from "@/types/order";
import type { useOrderDetailDerived } from "../_hooks/useOrderDetailDerived";
import type { useOrderDetailShare } from "../_hooks/useOrderDetailShare";
import type { useOrderDetailUpdates } from "../_hooks/useOrderDetailUpdates";

type CustomerCardDesktopProps = {
  order: OrderWithProduct;
  handleOrderFieldSave: ReturnType<typeof useOrderDetailUpdates>["handleOrderFieldSave"];
  handlePickupToggle: ReturnType<typeof useOrderDetailUpdates>["handlePickupToggle"];
  transport: ReturnType<typeof useOrderDetailDerived>["transport"];
  slanjeOwnerLabel: ReturnType<typeof useOrderDetailDerived>["slanjeOwnerLabel"];
  slanjeOwnerPlaceholder: ReturnType<typeof useOrderDetailDerived>["slanjeOwnerPlaceholder"];
  isAksBexMode: ReturnType<typeof useOrderDetailDerived>["isAksBexMode"];
  aksBexOwnerOptions: ReturnType<typeof useOrderDetailDerived>["aksBexOwnerOptions"];
  aksBexOwnerQuickOptions: ReturnType<typeof useOrderDetailDerived>["aksBexOwnerQuickOptions"];
  normalizedSlanjeOwnerLookupKey: ReturnType<typeof useOrderDetailDerived>["normalizedSlanjeOwnerLookupKey"];
  shipmentNumber: ReturnType<typeof useOrderDetailDerived>["shipmentNumber"];
  hasShipmentNumber: ReturnType<typeof useOrderDetailDerived>["hasShipmentNumber"];
  handleShipmentNumberCopy: ReturnType<typeof useOrderDetailShare>["handleShipmentNumberCopy"];
};

export function CustomerCardDesktop({ order, handleOrderFieldSave, handlePickupToggle, transport, slanjeOwnerLabel, slanjeOwnerPlaceholder, isAksBexMode, aksBexOwnerOptions, aksBexOwnerQuickOptions, normalizedSlanjeOwnerLookupKey, shipmentNumber, hasShipmentNumber, handleShipmentNumberCopy }: CustomerCardDesktopProps) {
  return (
    <Card className="hidden md:block">
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
        {hasShipmentNumber ? (
          <button
            type="button"
            className="group flex w-full items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left transition hover:border-blue-200 hover:bg-blue-100/60"
            onClick={() => void handleShipmentNumberCopy()}
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Broj posiljke</p>
              <p className="truncate font-mono text-sm font-semibold text-blue-900">{shipmentNumber}</p>
            </div>
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-700">
              <Copy className="h-4 w-4" />
            </span>
          </button>
        ) : null}
        <div className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Slanje</p>
          <div className="flex flex-wrap items-center gap-2">
            {slanjeModes.map((mode) => (
              <button
                key={mode}
                type="button"
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  order.slanjeMode === mode
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                }`}
                onClick={() => handleOrderFieldSave("slanjeMode", mode)}
              >
                {mode}
              </button>
            ))}
            <button
              type="button"
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                !order.slanjeMode
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
              onClick={() => handleOrderFieldSave("slanjeMode", "")}
            >
              Bez slanja
            </button>
          </div>
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{slanjeOwnerLabel}</p>
            <Input
              className="disabled:cursor-not-allowed disabled:bg-slate-100"
              value={order.slanjeOwner ?? ""}
              placeholder={slanjeOwnerPlaceholder}
              disabled={!order.slanjeMode}
              onChange={(event) => handleOrderFieldSave("slanjeOwner", event.target.value)}
            />
            {isAksBexMode && aksBexOwnerQuickOptions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {aksBexOwnerQuickOptions.map((option) => {
                  const isActive =
                    normalizeOwnerLookupKey(option.value) === normalizedSlanjeOwnerLookupKey;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                        isActive
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                      }`}
                      onClick={() => void handleOrderFieldSave("slanjeOwner", option.value)}
                    >
                      {option.value}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {isAksBexMode && aksBexOwnerOptions.length > aksBexOwnerQuickOptions.length ? (
              <p className="text-[11px] text-slate-500">
                Prikazano prvih {aksBexOwnerQuickOptions.length} od {aksBexOwnerOptions.length} sacuvanih.
              </p>
            ) : null}
          </div>
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
  );
}
