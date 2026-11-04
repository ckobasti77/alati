"use client";

import { useCallback, } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, Download, Loader2, PhoneCall, Plus, Share2, Trash2, } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { STAGES, STAGE_OPTIONS } from "@/lib/stages";
import { resolveOrderShippingMode, getOrderEventTitle, getOrderEventDetail, } from "./_lib/detailHelpers";
import { deleteConfirmPhrase, slanjeModes } from "../_lib/types";
import { composeVariantLabel, formatPercent, formatRefundPeriodDate, getProductDisplayName, normalizeOwnerLookupKey, requiresDeleteConfirmation, resolveVariantPurchasePrice } from "../_lib/helpers";
import { StageBadge, InlineField, } from "./_components/LegacyFields";
import { useOrderDetailData } from "./_hooks/useOrderDetailData";
import { useOrderItemDraft } from "./_hooks/useOrderItemDraft";
import { useOrderDetailUpdates } from "./_hooks/useOrderDetailUpdates";
import { useOrderDetailDerived } from "./_hooks/useOrderDetailDerived";
import { useOrderDetailShare } from "./_hooks/useOrderDetailShare";
import { useOrderDetailDelete } from "./_hooks/useOrderDetailDelete";

export default function OrderDetailsPage() {
  return (
    <RequireAuth>
      <OrderDetailsContent />
    </RequireAuth>
  );
}

function OrderDetailsContent() {
  const params = useParams();
  const basePath = "/narudzbine";
  const backLabel = "Nazad na narudzbine";
  const orderScope = "default";
  const router = useRouter();
  const orderId = typeof params?.orderId === "string" ? params.orderId : "";
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);

  if (!orderId) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-semibold text-slate-800">Nije prosledjen ID narudzbine.</p>
        <Button onClick={handleBack}>{backLabel}</Button>
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
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push(basePath);
  }, [basePath, router]);
  const { sessionToken, updateOrder, setManualRefund100, deleteOrder, refundPeriodOverview, products, suppliers, shippingOwners, order, setOrder, isLoading, copyText } = useOrderDetailData({ orderId, orderScope });
  const { productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, productInputRef, supplierMap, filteredProducts, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption, resetItemDraft } = useOrderItemDraft({ products, suppliers });






  const { isUpdatingStage, isAddingItem, isManualRefundSaving, shipmentStageModalOpen, shipmentNumberDraft, setShipmentNumberDraft, isShipmentStageSaving, handleOrderFieldSave, handlePickupToggle, handleAddItem, handleRemoveItem, closeShipmentStageModal, handleShipmentStageSubmit, handleStageChange, handlePovratToggle, handleManualRefund100Toggle } = useOrderDetailUpdates({ orderScope, sessionToken, updateOrder, setManualRefund100, order, setOrder, itemVariantId, itemSupplierId, itemQuantity, useManualPurchasePrice, manualPurchasePrice, useManualSalePrice, manualSalePrice, productInputRef, supplierMap, selectedProduct, resetItemDraft });
  const { totals, prodajnoUkupno, nabavnoUkupno, transport, prof, slanjeOwnerLabel, slanjeOwnerPlaceholder, isAksBexMode, aksBexOwnerOptions, aksBexOwnerQuickOptions, normalizedSlanjeOwnerLookupKey, myProfitPercent, myProfit, profitShare, calculatedProfitShare, profitSharePercent, povrat, calculatedPovrat, isInRefundPeriod, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, telHref, shipmentNumber, hasShipmentNumber } = useOrderDetailDerived({ refundPeriodOverview, shippingOwners, order });
  const { shareOpen, setShareOpen, orderPdfMode, canShare, handleCopyShareLink, handleShareLink, isOrderPdfBusy, handleOrderPdf, handleShipmentNumberCopy } = useOrderDetailShare({ order, copyText, prodajnoUkupno, nabavnoUkupno, transport, prof, profitShare, profitSharePercent, povrat, calculatedPovrat, isManualRefund100, isFullRefund100, isExcludedBecauseReturned, shipmentNumber, hasShipmentNumber });
  const { deleteModalOpen, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, openDeleteModal, closeDeleteModal, handleDeleteModalOpenChange, handleDeleteOrder } = useOrderDetailDelete({ handleBack, orderScope, sessionToken, deleteOrder, order });
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
        <Button onClick={handleBack}>{backLabel}</Button>
      </div>
    );
  }

  const deleteRequiresConfirmation = requiresDeleteConfirmation(order.stage);
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);

  const mainImage = (() => {
    const images = order.product?.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  })();

  return (
    <div className="mx-auto space-y-6">
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Podeli narudzbinu</DialogTitle>
            <DialogDescription>Podeli PDF kroz sistemski share ili preuzmi fajl.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              type="button"
              className="w-full justify-start gap-2"
              onClick={() => void handleOrderPdf("share")}
              disabled={isOrderPdfBusy}
            >
              <Share2 className="h-4 w-4" />
              {orderPdfMode === "share" ? "Deljenje..." : "Podeli PDF"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => void handleOrderPdf("download")}
              disabled={isOrderPdfBusy}
            >
              <Download className="h-4 w-4" />
              {orderPdfMode === "download" ? "Izvoz..." : "Preuzmi PDF"}
            </Button>
            <Button type="button" className="w-full justify-start gap-2" onClick={handleCopyShareLink}>
              <Copy className="h-4 w-4" />
              Kopiraj link
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleShareLink}
              disabled={!canShare}
            >
              <Share2 className="h-4 w-4" />
              Podeli link
            </Button>
            <p className="text-xs text-slate-500">
              Na telefonu izaberi WhatsApp, Viber ili drugu aplikaciju iz share prozora. Ako deljenje fajlova nije
              podrzano, PDF ce biti preuzet.
            </p>
            {!canShare ? <p className="text-xs text-slate-500">Deljenje linka nije podrzano na ovom uredjaju.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteModalOpen} onOpenChange={handleDeleteModalOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Obrisi narudzbinu?</DialogTitle>
            <DialogDescription>Brisanje je trajno i ne moze da se vrati.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-900">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-600">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">Proveri pre brisanja.</p>
                <p className="text-xs text-rose-800">Ova akcija nepovratno uklanja narudzbinu.</p>
              </div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{order.title}</p>
              <p className="text-xs text-slate-500">
                {order.customerName} · Stage: {STAGES[order.stage]?.label ?? order.stage}
              </p>
            </div>
            {deleteRequiresConfirmation ? (
              <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <p className="text-sm font-semibold text-amber-900">Za nastavak unesi potvrdu.</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  placeholder={deleteConfirmPhrase}
                  autoComplete="off"
                />
                <p className="text-xs text-amber-900">
                  Upisi tacno: <span className="font-semibold">{deleteConfirmPhrase}</span>
                </p>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeDeleteModal} disabled={isDeletingOrder}>
              Otkazi
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteOrder} disabled={isDeleteDisabled}>
              {isDeletingOrder ? "Brisanje..." : "Obrisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={shipmentStageModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeShipmentStageModal();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Broj porudzbine</DialogTitle>
            <DialogDescription>
              Unesi broj porudzbine pre promene statusa na "Poslato"
              {order ? ` (${resolveOrderShippingMode(order) ?? "Slanje"})` : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="shipment-number-details">
              Broj porudzbine
            </label>
            <Input
              id="shipment-number-details"
              value={shipmentNumberDraft}
              placeholder="Unesi broj porudzbine"
              autoFocus
              onChange={(event) => setShipmentNumberDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleShipmentStageSubmit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={closeShipmentStageModal} disabled={isShipmentStageSaving}>
              Otkazi
            </Button>
            <Button type="button" onClick={() => void handleShipmentStageSubmit()} disabled={isShipmentStageSaving}>
              {isShipmentStageSaving ? "Cuvanje..." : "Sacuvaj i oznaci kao poslato"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleBack}
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
              {order.stage === "poslato" && order.kasni ? (
                <span className="rounded-full border border-orange-300 bg-orange-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-orange-800">
                  {`Kasni${order.slanjeMode ? ` · zovi ${order.slanjeMode}` : ""}`}
                </span>
              ) : null}
              {isFullRefund100 ? (
                <span
                  className={`rounded-full border px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                    isExcludedBecauseReturned
                      ? "border-slate-200 bg-slate-100 text-slate-600"
                      : "border-emerald-300 bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {isExcludedBecauseReturned
                    ? "Već vraćeno — ne računa se"
                    : isManualRefund100
                      ? "Povrat 100% · ručno"
                      : "Povrat 100%"}
                </span>
              ) : null}
            </div>
            {order.variantLabel ? <p className="text-sm text-slate-500">{order.variantLabel}</p> : null}
            <p className="text-xs text-slate-500">Kreirano {formatDate(order.kreiranoAt)}</p>
            <p className="text-xs text-slate-500">
              {order.stageChangedAt ? `Trenutni status od ${formatDate(order.stageChangedAt)}` : "Datum trenutnog statusa nije zabelezen"}
            </p>
          </div>
        </div>
        <div className="w-full -mx-2 overflow-x-auto pb-2 sm:mx-0 sm:pb-0">
            <div className="flex min-w-max gap-2 px-2 sm:px-0">
              {STAGE_OPTIONS.map((option) => (
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
              <Button type="button" size="sm" variant="destructive" onClick={openDeleteModal}>
                Obrisi
              </Button>
              <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
                <Share2 className="h-4 w-4" />
                Podeli
              </Button>
            </div>
          </div>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Tok narudzbine</CardTitle>
        </CardHeader>
        <CardContent>
          {(order.history ?? []).length > 0 ? (
            <ol className="space-y-4">
              {order.history?.map((event, index) => {
                const detail = getOrderEventDetail(event);
                return (
                  <li key={event._id} className="relative flex gap-3 pl-1">
                    {index < (order.history?.length ?? 0) - 1 ? (
                      <span className="absolute left-[7px] top-4 h-[calc(100%+12px)] w-px bg-slate-200" />
                    ) : null}
                    <span className={`relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white shadow-sm ${event.type === "povrat" ? "bg-emerald-500" : "bg-blue-500"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{getOrderEventTitle(event)}</p>
                      {detail ? <p className="mt-0.5 font-mono text-xs text-blue-700">{detail}</p> : null}
                      <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(event.createdAt)}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="text-sm text-slate-500">Istorija pocinje sa narednom stvarnom promenom.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Stavke narudzbine</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InlineField label="Naziv narudzbine" value={order.title} onSave={(val) => handleOrderFieldSave("title", val)} />
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item) => {
                const images = (item as any).product?.images ?? [];
                const mainImage = images.find((image: any) => image.isMain) ?? images[0];
                const isOnlyItem = (order.items?.length ?? 0) <= 1;
                const productMedia = mainImage?.url ? (
                  <div className="h-14 w-14 overflow-hidden rounded-md border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mainImage.url} alt={item.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-slate-200 text-[10px] uppercase text-slate-400">
                    N/A
                  </div>
                );
                const itemInfo = (
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                    {item.variantLabel ? <p className="text-xs text-slate-500">{item.variantLabel}</p> : null}
                    <p className="text-xs text-slate-500">Kolicina: {item.kolicina}</p>
                  </div>
                );
                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm md:flex-row md:items-center md:justify-between"
                  >
                    {item.productId ? (
                      <Link
                        href={`/proizvodi/${item.productId}`}
                        className="flex items-center gap-3 rounded-md p-1 -m-1 transition hover:bg-slate-50"
                      >
                        {productMedia}
                        {itemInfo}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3">
                        {productMedia}
                        {itemInfo}
                      </div>
                    )}
                    <div className="text-right text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Prodajna</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(item.prodajnaCena, "EUR")}</p>
                      <p className="text-xs text-slate-500">Nabavna {formatCurrency(item.nabavnaCena, "EUR")}</p>
                        {item.manualNabavna || item.manualProdajna ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            {item.manualNabavna ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                Rucno uneta nabavna
                              </span>
                            ) : null}
                            {item.manualProdajna ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                Rucno uneta prodajna
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                    </div>
                    <div className="flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isOnlyItem}
                        aria-label="Obrisi stavku"
                      >
                        <Trash2 className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-600">Narudzbina nema stavke.</p>
          )}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Dodaj jos proizvoda</p>
              <p className="text-xs text-slate-500">Odaberi proizvod, tip i kolicinu pa ga dodaj u narudzbinu.</p>
            </div>
            <div className="relative">
              <Input
                ref={productInputRef}
                name="productSearch"
                value={productInput}
                placeholder={products === undefined ? "Ucitavanje..." : "Pretrazi proizvod"}
                disabled={products === undefined || (products?.length ?? 0) === 0}
                onChange={(event) => {
                  const value = event.target.value;
                  setProductInput(value);
                  setProductSearch(value);
                  setProductMenuOpen(true);
                  if (!value) {
                    setItemProductId("");
                    setItemVariantId("");
                    setItemSupplierId("");
                  }
                }}
                onFocus={() => {
                  setProductMenuOpen(true);
                  setProductSearch("");
                }}
                onClick={() => {
                  setProductMenuOpen(true);
                  setProductSearch("");
                }}
                onBlur={() => {
                  setTimeout(() => setProductMenuOpen(false), 150);
                }}
              />
              {productMenuOpen && (
                <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                  {products === undefined ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                  ) : (
                    filteredProducts.map((product, productIndex) => {
                      const variants = product.variants ?? [];
                      const hasVariants = variants.length > 0;
                      const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
                      const displayPrice = defaultVariant?.prodajnaCena ?? product.prodajnaCena;
                      return (
                        <div
                          key={product._id}
                          className={`border-b border-slate-100 last:border-b-0 ${
                            productIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                          }`}
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-blue-50 hover:text-blue-700"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              setItemProductId(product._id);
                              setProductInput(getProductDisplayName(product));
                              setItemVariantId(defaultVariant?.id ?? "");
                              setItemSupplierId("");
                              setUseManualPurchasePrice(false);
                              setManualPurchasePrice("");
                              setUseManualSalePrice(false);
                              setManualSalePrice("");
                              setItemQuantity(1);
                              setProductMenuOpen(false);
                            }}
                          >
                            {(() => {
                              const images = product.images ?? [];
                              const mainImage = images.find((image) => image.isMain) ?? images[0];
                              const displayName = getProductDisplayName(product);
                              if (mainImage?.url) {
                                return (
                                  <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                                  </div>
                                );
                              }
                              return <div className="h-12 w-12 flex-shrink-0 rounded-md border border-dashed border-slate-200" />;
                            })()}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-slate-800">{getProductDisplayName(product)}</p>
                                {hasVariants ? (
                                  <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                                    Tipski
                                  </span>
                                ) : null}
                              </div>
                              {hasVariants ? (
                                <p className="text-[11px] text-slate-500">
                                  {variants.length} tip{variants.length === 1 ? "" : "a"} dostupno
                                </p>
                              ) : null}
                            </div>
                            <div className="text-right">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Cena</p>
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(displayPrice, "EUR")}
                              </p>
                            </div>
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {selectedProduct ? (
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className="flex items-center gap-3">
                  {(() => {
                    const images = selectedProduct.images ?? [];
                    const mainImage = images.find((image) => image.isMain) ?? images[0];
                    const displayName = getProductDisplayName(selectedProduct);
                    if (mainImage?.url) {
                      return (
                        <div className="h-12 w-12 overflow-hidden rounded-md border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={mainImage.url} alt={displayName} className="h-full w-full object-cover" />
                        </div>
                      );
                    }
                    return (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400">
                        N/A
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{getProductDisplayName(selectedProduct)}</p>
                    {selectedVariantForPreview ? (
                      <p className="text-xs text-slate-600">{selectedVariantForPreview.label}</p>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Prodajna cena</p>
                  <p className="text-base font-semibold text-slate-900">
                    {formatCurrency(selectedVariantForPreview?.prodajnaCena ?? selectedProduct.prodajnaCena, "EUR")}
                  </p>
                </div>
              </div>
            ) : null}

            {selectedVariants.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Tip / varijanta</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {selectedVariants.map((variant) => {
                    const isActive = itemVariantId === variant.id;
                    const composedLabel = selectedProduct ? composeVariantLabel(selectedProduct, variant) : variant.label;
                    const purchasePrice = selectedProduct ? resolveVariantPurchasePrice(selectedProduct, variant) : variant.nabavnaCena;
                    return (
                      <label
                        key={variant.id}
                        className={`cursor-pointer rounded-md border px-3 py-2 text-sm transition ${
                          isActive ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="variantId"
                          value={variant.id}
                          checked={isActive}
                          onChange={() => {
                            setItemVariantId(variant.id);
                            if (selectedProduct) {
                              setProductInput(composedLabel);
                            }
                            setProductMenuOpen(false);
                          }}
                          className="sr-only"
                        />
                        <span className={`font-medium ${isActive ? "text-blue-800" : "text-slate-800"}`}>
                          {composedLabel}
                        </span>
                        <span className={`text-xs ${isActive ? "text-blue-700" : "text-slate-500"}`}>
                          Nabavna {formatCurrency(purchasePrice, "EUR")} / Prodajna{" "}
                          {formatCurrency(variant.prodajnaCena, "EUR")}
                        </span>
                        {variant.isDefault ? (
                          <span className="text-[11px] font-semibold text-emerald-600">Podrazumevano</span>
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {selectedProduct && supplierOptionsWithNames.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-slate-700">Dobavljac</p>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
                  name="supplierId"
                  value={itemSupplierId}
                  onChange={(event) => setItemSupplierId(event.target.value)}
                >
                  <option value="">
                    {bestSupplierOption
                      ? `Najpovoljniji (${formatCurrency(bestSupplierOption.price, "EUR")})`
                      : "Najpovoljniji"}
                  </option>
                  {supplierOptionsWithNames.map((option) => (
                    <option key={option.supplierId} value={option.supplierId}>
                      {(option.supplierName ?? "Dobavljac") + " - " + formatCurrency(option.price, "EUR")}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">Ako ne izaberes, racunamo najpovoljniju ponudu.</p>
              </div>
            ) : null}

            {selectedProduct ? (
              <div className="grid gap-3 md:grid-cols-4 md:items-end">
                <div>
                  <p className="text-sm font-medium text-slate-700">Kolicina</p>
                  <Input
                    name="itemQuantity"
                    type="number"
                    min={1}
                    required
                    value={itemQuantity}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (Number.isNaN(next)) {
                        setItemQuantity(1);
                        return;
                      }
                      setItemQuantity(Math.max(Math.round(next), 1));
                    }}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={useManualPurchasePrice}
                      onChange={(event) => {
                        setUseManualPurchasePrice(event.target.checked);
                        if (!event.target.checked) {
                          setManualPurchasePrice("");
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Rucno unosim nabavnu cenu
                  </label>
                  <Input
                    name="manualPurchasePrice"
                    type="number"
                    step="0.01"
                    min={0}
                    disabled={!useManualPurchasePrice}
                    required={useManualPurchasePrice}
                    value={manualPurchasePrice}
                    onChange={(event) => setManualPurchasePrice(event.target.value)}
                    placeholder="npr. 80"
                    className={!useManualPurchasePrice ? "bg-slate-100" : undefined}
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={useManualSalePrice}
                      onChange={(event) => {
                        setUseManualSalePrice(event.target.checked);
                        if (!event.target.checked) {
                          setManualSalePrice("");
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Rucno unosim prodajnu cenu
                  </label>
                  <Input
                    name="manualSalePrice"
                    type="number"
                    step="0.01"
                    min={0}
                    disabled={!useManualSalePrice}
                    required={useManualSalePrice}
                    value={manualSalePrice}
                    onChange={(event) => setManualSalePrice(event.target.value)}
                    placeholder="npr. 120"
                    className={!useManualSalePrice ? "bg-slate-100" : undefined}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={handleAddItem} className="gap-2" disabled={isAddingItem}>
                    <Plus className="h-4 w-4" />
                    {isAddingItem ? "Dodavanje..." : "Dodaj u narudzbinu"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetItemDraft} disabled={isAddingItem}>
                    Ponisti izbor
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="md:hidden">
          <CardHeader>
            <CardTitle>Kupac i dostava</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              <InlineField
                label="Ime"
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
              <InlineField
                label="Transport (EUR)"
                value={transport}
                formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                onSave={(val) => handleOrderFieldSave("transportCost", val)}
              />
            </div>
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
                Licno preuzimanje
              </label>
              <StageBadge stage={order.stage} />
            </div>
          </CardContent>
        </Card>
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

        <Card>
          <CardHeader>
            <CardTitle>Finansije</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isInRefundPeriod || isManualRefund100 ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-white px-3 py-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Ručno uključi povrat 100%</p>
                  <p className="text-xs text-slate-500">Porudžbina koristi ceo profit bez obzira na datum kreiranja.</p>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-emerald-900">
                  <input
                    type="checkbox"
                    checked={Boolean(order.manualRefund100)}
                    disabled={isManualRefundSaving}
                    onChange={(event) => void handleManualRefund100Toggle(event.target.checked)}
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-600"
                  />
                  {isManualRefundSaving ? "Čuvanje..." : order.manualRefund100 ? "Ručno uključeno" : "Uključi"}
                </label>
              </div>
            ) : null}
            {isFullRefund100 ? (
              <div
                className={`rounded-lg border px-3 py-2 ${
                  isExcludedBecauseReturned
                    ? "border-slate-200 bg-slate-50 text-slate-800"
                    : "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                }`}
              >
                <p className="text-sm font-semibold">
                  {isExcludedBecauseReturned
                    ? "Povrat je već vraćen i ne ulazi u zbir"
                    : isManualRefund100
                      ? "Porudžbina je ručno uključena u 100% povrat"
                      : "Porudžbina je u periodu 100% povrata"}
                </p>
                {isInRefundPeriod && refundPeriodOverview?.period ? (
                  <p className="mt-0.5 text-xs">
                    Period: {formatRefundPeriodDate(refundPeriodOverview.period.startDate)} –{" "}
                    {formatRefundPeriodDate(refundPeriodOverview.period.endDate)}
                  </p>
                ) : null}
                <p className="mt-0.5 text-xs">Povrat: nabavna cena + 100% ukupnog profita − transport.</p>
                {isExcludedBecauseReturned ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Obračunati iznos je {formatCurrency(calculatedPovrat, "EUR")}, a preostalo za vraćanje 0.
                  </p>
                ) : null}
              </div>
            ) : null}
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
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Povrat</p>
                <p className="text-base font-semibold text-slate-900">{formatCurrency(povrat, "EUR")}</p>
                <p className="text-xs text-slate-500">
                  {isFullRefund100
                    ? isExcludedBecauseReturned
                      ? `Obračunati profit (100%): ${formatCurrency(calculatedProfitShare, "EUR")} — već vraćeno`
                      : `Ukupan profit (100%): ${formatCurrency(profitShare, "EUR")}`
                    : `Profit (50%): ${formatCurrency(profitShare, "EUR")} (${formatPercent(profitSharePercent)})`}
                </p>
              </div>
              <div className="text-right">
                <label className="flex items-center justify-end gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(order.povratVracen)}
                    onChange={(event) => handlePovratToggle(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Povrat vracen
                </label>
                {order.povratVracen ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {order.povratVracenAt ? `Vracen ${formatDate(order.povratVracenAt)}` : "Datum nije zabelezen"}
                  </p>
                ) : null}
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
