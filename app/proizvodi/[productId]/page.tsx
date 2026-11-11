"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Facebook,
  GripVertical,
  ImageOff,
  Instagram,
  Loader2,
  Maximize2,
  Plus,
  Share2,
  ShoppingBag,
  Tag,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RequireAuth } from "@/components/RequireAuth";
import { formatCurrency, formatDate } from "@/lib/format";
import { parsePrice, } from "../_lib/productHelpers";
import { OrderStageBadge, InlineField, } from "./_components/LegacyFields";
import { useProductDetailState } from "./_hooks/useProductDetailState";
import { useProductDetailShare } from "./_hooks/useProductDetailShare";
import { useProductDetailMeta } from "./_hooks/useProductDetailMeta";
import { useProductDetailUpdate } from "./_hooks/useProductDetailUpdate";
import { useProductSupplierOffers } from "./_hooks/useProductSupplierOffers";
import { useProductDetailCategories } from "./_hooks/useProductDetailCategories";
import { useProductDetailFields } from "./_hooks/useProductDetailFields";
import { useProductGalleryManager } from "./_hooks/useProductGalleryManager";

export default function ProductDetailsPage() {
  return (
    <RequireAuth>
      <ProductDetailsContent />
    </RequireAuth>
  );
}

function ProductDetailsContent() {
  const { ensureMainImage, normalizeProductImages, sessionToken, isKodMajstor, router, productId, handleBack, uploadInputId, adUploadInputId, categories, suppliers, productOrders, updateProduct, createCategory, removeCategory, generateUploadUrl, product, setProduct, productRef, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, publishing, setPublishing, isTouchDevice, setIsTouchDevice, adImageInputRef, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, shareOpen, setShareOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isUploadingCategoryIcon, setIsUploadingCategoryIcon, isCreatingCategory, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, isDeletingCategory, setIsDeletingCategory, reorderEditingId, setReorderEditingId, reorderInputValue, setReorderInputValue, isAddingVariant, setIsAddingVariant, isSavingVariant, setIsSavingVariant, newVariantLabel, setNewVariantLabel, newVariantOpis, setNewVariantOpis, newVariantNabavna, setNewVariantNabavna, newVariantProdajna, setNewVariantProdajna, newVariantIsDefault, setNewVariantIsDefault, newVariantNabavnaIsReal, setNewVariantNabavnaIsReal, supplierMap, supplierEdits, setSupplierEdits, showAddSupplierForm, setShowAddSupplierForm, newSupplierId, setNewSupplierId, newSupplierVariantId, setNewSupplierVariantId, newSupplierPrice, setNewSupplierPrice, isSavingSupplierOffer, setIsSavingSupplierOffer, categoryIconInputRef, categoryDropdownRef, isLoading } = useProductDetailState();
  const { canShare, handleCopyShareLink, handleShareLink } = useProductDetailShare({ product, setShareOpen });
  const { productCategories, filteredCategories, variantMap, uploadTargetLabel, supplierOffers, bestSupplierOffer } = useProductDetailMeta({ categories, suppliers, product, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, setIsAdDropActive, isTouchDevice, setIsTouchDevice, categorySearch, setSupplierEdits, showAddSupplierForm, setShowAddSupplierForm, newSupplierId, setNewSupplierId, newSupplierVariantId, setNewSupplierVariantId });
  const { applyUpdate } = useProductDetailUpdate({ normalizeProductImages, sessionToken, updateProduct, setProduct, productRef });
  const { supplierOfferKey, handleSupplierPriceChange, handleSupplierPriceSave, handleAddSupplierOffer, handleRemoveSupplierOffer } = useProductSupplierOffers({ product, supplierEdits, setSupplierEdits, newSupplierId, newSupplierVariantId, newSupplierPrice, setNewSupplierPrice, setIsSavingSupplierOffer, applyUpdate });
  const { resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory, handleConfirmDeleteCategory } = useProductDetailCategories({ sessionToken, createCategory, removeCategory, generateUploadUrl, setProduct, productRef, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isUploadingCategoryIcon, setIsUploadingCategoryIcon, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, categoryDropdownRef, applyUpdate });
  const { handleBaseFieldSave, handlePublishToggle, publishNow, handleVariantFieldSave, handleBasePurchaseRealityToggle, handleVariantPurchaseRealityToggle, handleStartAddVariant, handleCancelAddVariant, handleCreateVariant } = useProductDetailFields({ sessionToken, isKodMajstor, product, productRef, setPublishing, setIsAddingVariant, setIsSavingVariant, newVariantLabel, setNewVariantLabel, newVariantOpis, setNewVariantOpis, newVariantNabavna, setNewVariantNabavna, newVariantProdajna, setNewVariantProdajna, newVariantIsDefault, setNewVariantIsDefault, newVariantNabavnaIsReal, setNewVariantNabavnaIsReal, applyUpdate });
  const { handleRemoveAllImages, handleAdImageChange, handleRemoveAdImage, handleRemoveSingleImage, handleSetAsMain, handleImagePublishToggle, touchDragActiveRef, handleGalleryDragStart, handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd, handleGalleryDragOver, handleGalleryDrop, handleGalleryDragEnd, handleGalleryTouchCancel, handleGalleryDragLeave, getGalleryGroup, handleOpenReorderInput, handleCancelReorderInput, handleConfirmReorderInput, getShiftClass, handleGalleryDropZoneDragEnter, handleGalleryDropZoneDragOver, handleGalleryDropZoneDragLeave, handleGalleryDropZoneDrop, handleAdDropZoneDragEnter, handleAdDropZoneDragOver, handleAdDropZoneDragLeave, handleAdDropZoneDrop, handleFilesSelected, handleDownloadImage, gallery, filteredGallery, handleOpenPreview, handleCloseLightbox, handleStepLightbox, targetIndex, draggingSameGroup, baseNabavnaIsReal, hasVariants, showGalleryDropOverlay, showAdDropOverlay } = useProductGalleryManager({ ensureMainImage, sessionToken, generateUploadUrl, product, productRef, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, isTouchDevice, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, setReorderEditingId, reorderInputValue, setReorderInputValue, applyUpdate });
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Ucitavanje proizvoda...</span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          Nazad na proizvode
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-slate-600">Proizvod nije pronadjen.</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Podeli proizvod</DialogTitle>
            <DialogDescription>Prvo kopiraj link, pa podeli preko aplikacije.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
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
            {!canShare ? <p className="text-xs text-slate-500">Share nije podrzan na ovom uredjaju.</p> : null}
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" className="gap-2" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
          Nazad na listu
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => router.push(`/narudzbine?productId=${encodeURIComponent(product._id)}`)}
        >
          <ShoppingBag className="h-4 w-4" />
          Nova narudzbina
        </Button>
        <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
          <Share2 className="h-4 w-4" />
          Podeli
        </Button>
        <Badge variant="blue">ID: {product._id}</Badge>
        <Badge variant="green">Azurirano: {formatDate(product.updatedAt)}</Badge>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Porudzbine sa ovim proizvodom
            <Badge variant="default">{productOrders?.length ?? 0}</Badge>
          </CardTitle>
          <p className="text-sm text-slate-500">Klikom otvaras pojedinacnu narudzbinu.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {productOrders === undefined ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Ucitavanje porudzbina...
            </div>
          ) : productOrders.length === 0 ? (
            <p className="text-sm text-slate-500">Jos nema porudzbina za ovaj proizvod.</p>
          ) : (
            <div className="space-y-2">
              {productOrders.map((order) => {
                const matchedItems = (order.items ?? []).filter(
                  (item) => String(item.productId) === String(product._id),
                );
                const matchedQty = matchedItems.reduce((sum, item) => sum + item.kolicina, 0);
                const displayQty = matchedQty > 0 ? matchedQty : order.kolicina;
                const matchedLabels = matchedItems
                  .map((item) => item.variantLabel || item.title)
                  .filter((label) => Boolean(label && label.trim().length > 0));
                const primaryLabel = matchedLabels[0] ?? "";
                const secondaryLabels = matchedLabels.slice(1, 3);
                const remainingCount = matchedLabels.length > 3 ? matchedLabels.length - 3 : 0;
                const orderHref = `/narudzbine/${order._id}`;

                return (
                  <Link
                    key={order._id}
                    href={orderHref}
                    className="group block space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{order.title}</p>
                        <p className="text-xs text-slate-500">
                          Kupac: {order.customerName} - Kreirano {formatDate(order.kreiranoAt)}
                        </p>
                        {primaryLabel ? (
                          <p className="text-xs text-slate-500">
                            {primaryLabel}
                            {secondaryLabels.length > 0 ? ` / ${secondaryLabels.join(" / ")}` : ""}
                            {remainingCount > 0 ? ` +${remainingCount}` : ""}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <OrderStageBadge stage={order.stage} />
                        <ChevronRight className="h-4 w-4 text-slate-400 transition group-hover:text-slate-600" />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        Kolicina: {displayQty}
                      </span>
                      {order.items && order.items.length > 1 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                          {order.items.length} stavki
                        </span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Galerija slika
                <Badge variant="default">{filteredGallery.length}</Badge>
              </CardTitle>
              <p className="text-sm text-slate-500">Kreativan grid sa slikama proizvoda i tipova.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={imageUploadTarget} onValueChange={setImageUploadTarget}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Gde dodati slike" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="product">Slike proizvoda</SelectItem>
                  {(product.variants ?? []).map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.label || "Tip"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                id={uploadInputId}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFilesSelected}
                disabled={isUploadingImages}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isUploadingImages}
                onClick={() => document.getElementById(uploadInputId)?.click()}
              >
                <Plus className="h-4 w-4" />
                {isUploadingImages ? "Dodavanje..." : "Dodaj slike"}
              </Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleRemoveAllImages}>
                <Trash2 className="h-4 w-4" />
                Obrisi sve slike
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-slate-500">
              Dodavanje novih fajlova ide na {uploadTargetLabel}.
            </p>
            <div
              className={`relative rounded-xl border border-transparent transition ${
                showGalleryDropOverlay ? "border-2 border-dashed border-blue-300 bg-blue-50/60" : ""
              }`}
              onDragEnter={handleGalleryDropZoneDragEnter}
              onDragOver={handleGalleryDropZoneDragOver}
              onDragLeave={handleGalleryDropZoneDragLeave}
              onDrop={handleGalleryDropZoneDrop}
            >
              {showGalleryDropOverlay ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-100/80 backdrop-blur-sm">
                  <div className="flex items-center gap-3 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    <UploadCloud className="h-4 w-4" />
                    <span>Otpusti da dodas slike za {uploadTargetLabel}</span>
                  </div>
                </div>
              ) : null}
              {filteredGallery.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-slate-500">
                  <ImageOff className="h-8 w-8" />
                  <p className="text-sm">Trenutno nema slika za ovaj izbor.</p>
                  <p className="text-xs text-slate-500">Prevuci fotografije ovde ili klikni na dugme iznad.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                  {filteredGallery.map((item, index) => {
                  const shiftClass = getShiftClass(item, index);
                  const isDragOver = dragOverId === item.id && draggingSameGroup;
                  const fbActive = item.publishFb ?? true;
                  const igActive = item.publishIg ?? true;
                  const groupItems = getGalleryGroup(item);
                  const position = groupItems.findIndex((candidate) => candidate.id === item.id);
                  const currentPosition = position >= 0 ? position + 1 : 1;
                  const totalInGroup = groupItems.length || 1;
                  const isReorderEditing = reorderEditingId === item.id;
                  return (
                    <div
                      key={item.id}
                      data-gallery-id={item.id}
                      className={`group relative aspect-[4/3] cursor-grab overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition-all duration-200 hover:shadow-md ${shiftClass} ${
                        isDragOver ? "ring-1 ring-blue-200" : ""
                      }`}
                      draggable
                      onDragStart={(event) => handleGalleryDragStart(event, item)}
                      onDragOver={(event) => handleGalleryDragOver(event, item)}
                      onDrop={(event) => handleGalleryDrop(event, item)}
                      onDragEnd={handleGalleryDragEnd}
                      onDragLeave={() => handleGalleryDragLeave(item)}
                      onTouchStart={(event) => handleGalleryTouchStart(event, item)}
                      onTouchMove={handleGalleryTouchMove}
                      onTouchEnd={handleGalleryTouchEnd}
                      onTouchCancel={handleGalleryTouchCancel}
                      onClick={() => {
                        if (touchDragActiveRef.current) return;
                        handleOpenPreview(item);
                      }}
                    >
                      <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                          title="Otvori pregled"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleOpenPreview(item);
                          }}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-slate-900"
                          title="Preuzmi sliku"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleDownloadImage(item.url, item.fileName ?? `${item.id}.jpg`);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-2 py-1 text-xs font-semibold transition ${
                            item.isMain
                              ? "bg-emerald-50 text-emerald-700 shadow-[0_1px_0_rgba(16,185,129,0.25)]"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                          disabled={item.isMain}
                          title={item.isMain ? "Vec je glavna" : "Postavi kao glavnu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetAsMain(item);
                          }}
                        >
                          Glavna
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1 hover:bg-slate-100 hover:text-red-600"
                          title="Obrisi sliku"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveSingleImage(item);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.alt}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02] group-hover:brightness-95"
                      />
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-slate-900/60 px-3 py-2 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          <Maximize2 className="h-4 w-4" />
                          <span>Povecaj</span>
                        </div>
                      </div>
                      <div className="absolute left-2 top-2 inline-flex items-center gap-2 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        <GripVertical className="h-3 w-3 text-slate-500" />
                        {item.label}
                      </div>
                      <div className="absolute left-2 bottom-2 z-10 flex gap-1">
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                            fbActive
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "bg-white/90 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                          }`}
                          title={fbActive ? "Ukloni iz FB objave" : "Uključi u FB objavu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleImagePublishToggle(item, "publishFb", !fbActive);
                          }}
                        >
                          <Facebook className="h-3.5 w-3.5" />
                          FB
                        </button>
                        <button
                          type="button"
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                            igActive
                              ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                              : "bg-white/90 text-slate-700 ring-1 ring-slate-200 hover:bg-white"
                          }`}
                          title={igActive ? "Ukloni iz IG objave" : "Uključi u IG objavu"}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleImagePublishToggle(item, "publishIg", !igActive);
                          }}
                        >
                          <Instagram className="h-3.5 w-3.5" />
                          IG
                        </button>
                      </div>
                      <div className="absolute bottom-2 right-2 z-10">
                        <div
                          className={`flex items-center gap-1 overflow-hidden rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm transition-all duration-300 ${
                            isReorderEditing ? "w-36" : "w-auto"
                          }`}
                        >
                          {isReorderEditing ? (
                            <>
                              <input
                                type="number"
                                min={1}
                                max={totalInGroup}
                                value={reorderInputValue}
                                onChange={(event) => setReorderInputValue(event.target.value)}
                                className="h-8 w-14 rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-300"
                                onClick={(event) => event.stopPropagation()}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    void handleConfirmReorderInput(item);
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    handleCancelReorderInput();
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-2 text-white transition hover:bg-blue-700"
                                title="Promeni redosled"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void handleConfirmReorderInput(item);
                                }}
                              >
                                OK
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-8 items-center justify-center rounded-md px-2 text-slate-500 transition hover:text-slate-800"
                                title="Zatvori"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleCancelReorderInput();
                                }}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1 text-white transition hover:bg-slate-900"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleOpenReorderInput(item);
                              }}
                              title="Promeni poziciju slike"
                            >
                              <GripVertical className="h-3 w-3 text-white/80" />
                              #{currentPosition}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Glavna slika za drustvene mreze
                {product.adImage ? <Badge variant="green">Postavljena</Badge> : <Badge variant="default">Nije dodata</Badge>}
              </CardTitle>
              <p className="text-sm text-slate-500">Fotografija koja ide kao prva na FB / Instagram oglasima.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id={adUploadInputId}
                ref={adImageInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAdImageChange}
                disabled={isUploadingAdImage}
              />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={isUploadingAdImage}
                onClick={() => document.getElementById(adUploadInputId)?.click()}
              >
                <UploadCloud className="h-4 w-4" />
                {isUploadingAdImage ? "Dodavanje..." : "Dodaj glavnu sliku"}
              </Button>
              {product.adImage ? (
                <Button variant="ghost" size="sm" className="gap-2 text-red-600" onClick={handleRemoveAdImage}>
                  <Trash2 className="h-4 w-4" />
                  Obrisi glavnu sliku
                </Button>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`relative rounded-xl border border-transparent transition ${
                showAdDropOverlay ? "border-2 border-dashed border-blue-300 bg-blue-50/60" : ""
              }`}
              onDragEnter={handleAdDropZoneDragEnter}
              onDragOver={handleAdDropZoneDragOver}
              onDragLeave={handleAdDropZoneDragLeave}
              onDrop={handleAdDropZoneDrop}
            >
              {showAdDropOverlay ? (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-blue-100/80 backdrop-blur-sm">
                  <div className="flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-blue-700 shadow">
                    <UploadCloud className="h-4 w-4" />
                    <span>Otpusti da postavis glavnu</span>
                  </div>
                </div>
              ) : null}
              {product.adImage ? (
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.adImage.url ?? ""}
                    alt="Glavna slika za drustvene mreze"
                    className="h-[260px] w-full object-cover sm:h-[320px]"
                  />
                  <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow">
                    <Tag className="h-3 w-3 text-slate-500" />
                    Glavna za drustvene mreze
                  </div>
                  {product.adImage.url ? (
                    <button
                      type="button"
                      onClick={() =>
                        void handleDownloadImage(
                          product.adImage?.url ?? "",
                          product.adImage?.fileName ?? `${product._id}-ad.jpg`,
                        )
                      }
                      className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow hover:bg-slate-100"
                    >
                      <Download className="h-4 w-4" />
                      Preuzmi
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-500">
                  <UploadCloud className="h-8 w-8" />
                  <p className="text-sm font-semibold text-slate-700">Nema glavne slike za drustvene mreze</p>
                  <p className="text-xs text-slate-500">Prevuci je ovde ili iskoristi dugme iznad.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {product.kpName ?? product.name}
                {product.variants && product.variants.length > 0 ? (
                  <Badge variant="yellow">Tipski</Badge>
                ) : (
                  <Badge variant="green">Obican</Badge>
                )}
              </CardTitle>
              <p className="text-sm text-slate-500">Textualni podaci su editabilni na licu mesta.</p>
              <p className="text-xs text-slate-500">FB / Insta naziv: {product.name}</p>
              <div className="flex flex-wrap gap-2">
                {productCategories.length ? (
                  productCategories.map((category) => (
                    <span
                      key={category._id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                    >
                      <Tag className="h-3 w-3 text-slate-500" />
                      {category.name}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InlineField
                label="KP naziv (glavni)"
                value={product.kpName ?? product.name}
                onSave={(val) => handleBaseFieldSave("kpName", val)}
              />
              <InlineField label="FB / Insta naziv" value={product.name} onSave={(val) => handleBaseFieldSave("name", val)} />
              <div
                className="space-y-2"
                ref={categoryDropdownRef}
                onMouseDown={(event) => event.stopPropagation()}
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategorije</p>
                <div className="flex flex-wrap gap-2">
                  {productCategories.length === 0 ? (
                    <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
                  ) : (
                    productCategories.map((category) => (
                      <span
                        key={category._id}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                      >
                        <Tag className="h-3 w-3 text-slate-500" />
                        {category.name}
                        <button
                          type="button"
                          className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                          onClick={() => handleRemoveCategory(category._id)}
                          title="Ukloni kategoriju"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <div className="relative">
                  <Input
                    value={categorySearch}
                    placeholder={categories === undefined ? "Ucitavanje kategorija..." : "Pretrazi ili dodaj kategoriju"}
                    disabled={categories === undefined}
                    onChange={(event) => {
                      setCategorySearch(event.target.value);
                      setCategoryMenuOpen(true);
                    }}
                    onFocus={() => setCategoryMenuOpen(true)}
                    onClick={() => setCategoryMenuOpen(true)}
                  />
                  <input
                    ref={categoryIconInputRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleCategoryIconChange}
                  />
                  {categoryMenuOpen && (
                    <div
                      className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <div className="border-b border-slate-100 bg-slate-50/60">
                        {isAddingCategory ? (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <div
                              className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                categoryIconInputRef.current?.click();
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={handleCategoryIconDrop}
                              title="Prevuci ili izaberi ikonicu"
                            >
                              {isUploadingCategoryIcon ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : newCategoryIcon?.previewUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={newCategoryIcon.previewUrl} alt="Ikonica" className="h-full w-full object-cover" />
                              ) : (
                                <Tag className="h-4 w-4" />
                              )}
                            </div>
                            <Input
                              value={newCategoryName}
                              placeholder="Naziv kategorije"
                              onChange={(event) => setNewCategoryName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  handleCreateCategory();
                                }
                              }}
                            />
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="sm"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  handleCreateCategory();
                                }}
                                disabled={isCreatingCategory}
                                className="gap-1"
                              >
                                {isCreatingCategory ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                                Sacuvaj
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  resetNewCategoryState();
                                }}
                              >
                                Odustani
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setIsAddingCategory(true);
                            setCategoryMenuOpen(true);
                          }}
                        >
                            <Plus className="h-4 w-4" />
                            Dodaj novu kategoriju
                          </button>
                        )}
                      </div>
                      {categories === undefined ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                      ) : filteredCategories.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                      ) : (
                        filteredCategories.map((category, idx) => {
                          const isSelected = (product.categoryIds ?? []).includes(category._id);
                          const usageCount = category.productCount ?? 0;
                          return (
                            <button
                              key={category._id}
                              type="button"
                              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                              } ${isSelected ? "text-blue-700" : "text-slate-800"} hover:bg-blue-50`}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              handleSelectCategory(category._id);
                            }}
                          >
                              {category.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={category.iconUrl} alt={category.name} className="h-8 w-8 rounded-md object-cover" />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                  <Tag className="h-4 w-4" />
                                </div>
                              )}
                            <div className="flex-1">
                              <p className="font-semibold">{category.name}</p>
                              {isSelected ? <p className="text-[11px] text-emerald-600">Izabrana</p> : null}
                              {usageCount > 0 ? (
                                <p className="text-[11px] text-amber-600">{usageCount} proizvoda vezano</p>
                              ) : null}
                            </div>
                            <div className="flex items-center gap-2">
                              {isSelected ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                              <span
                                role="button"
                                aria-label="Obrisi kategoriju"
                                className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                onMouseDown={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setCategoryMenuOpen(false);
                                  handleRequestDeleteCategory(category);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </span>
                            </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>
            <InlineField
              label="Prodajna cena (EUR)"
              value={product.prodajnaCena}
              formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
              onSave={(val) => handleBaseFieldSave("prodajnaCena", val)}
            />
            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavka</p>
                  <p className="text-xs text-slate-600">Najniza ponuda dobavljaca postaje prava nabavna cena.</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={showAddSupplierForm ? "ghost" : "outline"}
                  className="gap-2"
                  onClick={() => setShowAddSupplierForm((prev) => !prev)}
                  disabled={suppliers === undefined}
                >
                  {showAddSupplierForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {showAddSupplierForm ? "Zatvori" : "Dodaj dobavljaca"}
                </Button>
              </div>

              {showAddSupplierForm ? (
                suppliers === undefined ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Ucitavanje dobavljaca...
                  </div>
                ) : suppliers.length === 0 ? (
                  <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Dodaj dobavljace na glavnoj listi pa ih povezi ovde.
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed border-blue-200 bg-white/90 px-3 py-3 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-12 md:items-end">
                      <div className="space-y-1 md:col-span-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dobavljac</p>
                        <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Izaberi dobavljaca" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier._id} value={supplier._id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {hasVariants ? (
                        <div className="space-y-1 md:col-span-4">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vazi za</p>
                          <Select value={newSupplierVariantId} onValueChange={(value) => setNewSupplierVariantId(value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Svi tipovi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="base">Svi tipovi</SelectItem>
                              {(product.variants ?? []).map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.label || "Tip"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                      <div className={`space-y-1 ${hasVariants ? "md:col-span-3" : "md:col-span-6"}`}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cena (EUR)</p>
                        <Input
                          value={newSupplierPrice}
                          inputMode="decimal"
                          placeholder="npr. 10.50"
                          onChange={(event) => setNewSupplierPrice(event.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <Button
                          type="button"
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleAddSupplierOffer}
                          disabled={isSavingSupplierOffer || !newSupplierId}
                        >
                          {isSavingSupplierOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                          Sacuvaj
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              ) : null}

              {supplierOffers.length === 0 ? (
                <>
                  <InlineField
                    label="Nabavna cena (EUR)"
                    value={product.nabavnaCena}
                    formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                    onSave={(val) => handleBaseFieldSave("nabavnaCena", val)}
                  />
                  <label className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                    <div className="flex flex-col">
                      <span>{baseNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                      <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={baseNabavnaIsReal}
                      onChange={(event) => handleBasePurchaseRealityToggle(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </>
              ) : supplierOffers.length === 1 ? (
                <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-slate-500">Nabavna cena</p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatCurrency(supplierOffers[0].price, "EUR")}
                        </p>
                      </div>
                      {hasVariants ? (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                          {supplierOffers[0].variantId
                            ? variantMap.get(supplierOffers[0].variantId)?.label ?? "Tip"
                            : "Svi tipovi"}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {supplierMap.get(supplierOffers[0].supplierId)?.name ?? "Dobavljac"}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSupplierOffer(supplierOffers[0])}
                        title="Ukloni ponudu"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {(() => {
                    const offer = supplierOffers[0];
                    const key = supplierOfferKey(offer);
                    const editValue = supplierEdits[key] ?? String(offer.price);
                    const isChanged = parsePrice(editValue) !== offer.price;
                    return (
                      <div className="flex items-center gap-2">
                        <Input
                          value={editValue}
                          inputMode="decimal"
                          className="h-9"
                          onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!isChanged}
                          onClick={() => handleSupplierPriceSave(offer)}
                        >
                          Sacuvaj
                        </Button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-2">
                  {supplierOffers.map((offer) => {
                    const supplierName = supplierMap.get(offer.supplierId)?.name ?? "Dobavljac";
                    const isBest = bestSupplierOffer && offer.price === bestSupplierOffer.price;
                    const key = supplierOfferKey(offer);
                    const editValue = supplierEdits[key] ?? String(offer.price);
                    const isChanged = parsePrice(editValue) !== offer.price;
                    const variantLabel = hasVariants
                      ? offer.variantId
                        ? variantMap.get(offer.variantId)?.label ?? "Tip"
                        : "Svi tipovi"
                      : null;
                    return (
                      <div
                        key={`${offer.supplierId}-${offer.variantId ?? "base"}`}
                        className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${
                          isBest
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-white text-slate-800"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{supplierName}</span>
                            {variantLabel ? (
                              <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                                {variantLabel}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{formatCurrency(offer.price, "EUR")}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveSupplierOffer(offer)}
                              title="Ukloni ponudu"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Input
                            value={editValue}
                            inputMode="decimal"
                            className="h-9"
                            onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!isChanged}
                            onClick={() => handleSupplierPriceSave(offer)}
                          >
                            Sacuvaj
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          <div className="space-y-3">
            {isKodMajstor ? (
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[240px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishKp)}
                  onChange={(event) => handlePublishToggle("publishKp", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src="/kp.png" alt="KP" className="h-28 w-28 object-cover" />
                        </span> 
                  <span className="text-sm font-semibold text-slate-800">KupujemProdajem</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishFbProfile)}
                  onChange={(event) => handlePublishToggle("publishFbProfile", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span>Kod Majstora</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishIg)}
                  onChange={(event) => handlePublishToggle("publishIg", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm">
                    <Instagram className="h-4 w-4" />
                  </span>
                  <span>kod.majstora</span>
                </span>
              </label>
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.publishMarketplace)}
                  onChange={(event) => handlePublishToggle("publishMarketplace", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="flex items-center gap-2 font-semibold text-slate-800">
                  <Facebook className="h-5 w-5 text-blue-600" />
                  <span>Marketplace</span>
                </span>
              </label>
            </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
                <input
                  type="checkbox"
                  checked={Boolean(product.pickupAvailable)}
                  onChange={(event) => handlePublishToggle("pickupAvailable", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Lično preuzimanje
              </label>
            </div>
          </div>
          {isKodMajstor ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                className="gap-2"
                onClick={() => publishNow("facebook")}
                disabled={publishing !== null}
              >
                {publishing === "facebook" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Facebook className="h-4 w-4" />
                )}
                {publishing === "facebook" ? "Objavljivanje..." : "Okaci na Facebook"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => publishNow("instagram")}
                disabled={publishing !== null}
              >
                {publishing === "instagram" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Instagram className="h-4 w-4" />
                )}
                {publishing === "instagram" ? "Objavljivanje..." : "Okaci na Instagram"}
              </Button>
            </div>
          ) : null}
              <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Kreirano</p>
                  <p className="font-medium text-slate-800">{formatDate(product.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Azurirano</p>
                  <p className="font-medium text-slate-800">{formatDate(product.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">Opisi proizvoda</CardTitle>
              <p className="text-sm text-slate-500">Posebni tekstovi za KupujemProdajem i drustvene mreze.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <InlineField
                label="KupujemProdajem opis"
                value={product.opisKp ?? ""}
                multiline
                onSave={(val) => handleBaseFieldSave("opisKp", val)}
              />
              <InlineField
                label="FB / Insta opis"
                value={product.opisFbInsta ?? product.opis ?? ""}
                multiline
                onSave={(val) => handleBaseFieldSave("opisFbInsta", val)}
              />
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">Tipovi proizvoda</CardTitle>
            <p className="text-sm text-slate-500">
              Edit dugme otvara input sa selektovanim tekstom, copy kopira vrednost polja.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant={isAddingVariant ? "ghost" : "outline"}
            className="gap-2"
            onClick={isAddingVariant ? handleCancelAddVariant : handleStartAddVariant}
            disabled={isSavingVariant}
          >
            {isAddingVariant ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isAddingVariant ? "Zatvori" : "Dodaj tip"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isAddingVariant ? (
            <div className="space-y-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Naziv tipa</p>
                  <Input
                    value={newVariantLabel}
                    onChange={(event) => setNewVariantLabel(event.target.value)}
                    placeholder="npr. 18V bez baterije"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prodajna cena (EUR)</p>
                  <Input
                    value={newVariantProdajna}
                    onChange={(event) => setNewVariantProdajna(event.target.value)}
                    placeholder="Prodajna cena"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavna cena (EUR)</p>
                  <Input
                    value={newVariantNabavna}
                    onChange={(event) => setNewVariantNabavna(event.target.value)}
                    placeholder="Nabavna cena"
                    inputMode="decimal"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Opis tipa (opciono)
                  </p>
                  <Textarea
                    autoResize
                    rows={3}
                    value={newVariantOpis}
                    onChange={(event) => setNewVariantOpis(event.target.value)}
                    placeholder="Kratak opis koji razlikuje ovaj tip."
                  />
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                  <div className="flex flex-col">
                    <span>{newVariantNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                    <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newVariantNabavnaIsReal}
                    onChange={(event) => setNewVariantNabavnaIsReal(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                  <div className="flex flex-col">
                    <span>Postavi kao glavni tip</span>
                    <span className="text-xs font-normal text-slate-500">
                      Glavni tip se koristi za KP i kalkulacije.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newVariantIsDefault || !hasVariants}
                    onChange={(event) => setNewVariantIsDefault(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    disabled={!hasVariants}
                  />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" className="gap-2" onClick={handleCreateVariant} disabled={isSavingVariant}>
                  {isSavingVariant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Sacuvaj tip
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelAddVariant}
                  disabled={isSavingVariant}
                >
                  Odustani
                </Button>
              </div>
            </div>
          ) : null}
          {(product.variants ?? []).length === 0 ? (
            isAddingVariant ? null : (
              <p className="text-sm text-slate-600">
                Ovaj proizvod nema dodatne tipove. Dodaj prvi tip da ga pretvoris u tipski.
              </p>
            )
          ) : (
            product.variants?.map((variant) => {
              const variantNabavnaIsReal =
                variant.nabavnaCenaIsReal ?? product.nabavnaCenaIsReal ?? baseNabavnaIsReal;
              return (
                <div
                  key={variant.id}
                  className="rounded-lg border border-slate-200/80 bg-white/60 p-3 shadow-sm shadow-slate-100"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={variant.isDefault ? "green" : "default"}>
                        {variant.isDefault ? "Glavni tip" : "Tip"}
                      </Badge>
                      <span className="text-sm font-semibold text-slate-800">{variant.label}</span>
                    </div>
                    <span className="text-xs uppercase tracking-wide text-slate-400">ID: {variant.id}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <InlineField
                      label="Naziv tipa"
                      value={variant.label}
                      onSave={(val) => handleVariantFieldSave(variant.id, "label", val)}
                    />
                    <InlineField
                      label="Prodajna cena (EUR)"
                      value={variant.prodajnaCena}
                      formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                      onSave={(val) => handleVariantFieldSave(variant.id, "prodajnaCena", val)}
                    />
                    <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
                      <InlineField
                        label="Nabavna cena (EUR)"
                        value={variant.nabavnaCena}
                        formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                        onSave={(val) => handleVariantFieldSave(variant.id, "nabavnaCena", val)}
                      />
                      <label className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                        <span>{variantNabavnaIsReal ? "Prava nabavna" : "Procenjena nabavna"}</span>
                        <input
                          type="checkbox"
                          checked={variantNabavnaIsReal}
                          onChange={(event) => handleVariantPurchaseRealityToggle(variant.id, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </label>
                    </div>
                    <div className="md:col-span-2">
                      <InlineField
                        label="Opis tipa"
                        value={variant.opis ?? ""}
                        multiline
                        onSave={(val) => handleVariantFieldSave(variant.id, "opis", val)}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(categoryToDelete)} onOpenChange={(open) => (!open ? setCategoryToDelete(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Obrisi kategoriju</DialogTitle>
            <DialogDescription>
              {categoryToDelete?.productCount && categoryToDelete.productCount > 0
                ? `Kategorija "${categoryToDelete.name}" je vezana za ${categoryToDelete.productCount} proizvoda. Brisanjem ce biti uklonjena sa svih.`
                : `Obrisi kategoriju "${categoryToDelete?.name}"?`}
            </DialogDescription>
          </DialogHeader>
          {categoryToDelete?.productCount && categoryToDelete.productCount > 0 ? (
            <div className="flex items-start gap-3 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Ova kategorija je dodeljena na {categoryToDelete.productCount} proizvod
                {categoryToDelete.productCount === 1 ? "" : "a"}. Potvrdom ce biti skinuta sa svih proizvoda i obrisana.
              </p>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setCategoryToDelete(null)} disabled={isDeletingCategory}>
              Odustani
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDeleteCategory} disabled={isDeletingCategory}>
              {isDeletingCategory ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Obrisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageLightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseLightbox}
        >
          {imageLightbox.items.length > 1 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-4">
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepLightbox(-1);
                }}
                aria-label="Prethodna slika"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow hover:bg-white"
                onClick={(event) => {
                  event.stopPropagation();
                  handleStepLightbox(1);
                }}
                aria-label="Sledeca slika"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          ) : null}
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold text-white/80">
              <span>
                {imageLightbox.index + 1} / {imageLightbox.items.length}
              </span>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleCloseLightbox();
                }}
                className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow"
              >
                Zatvori
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageLightbox.items[imageLightbox.index]?.url}
              alt={imageLightbox.items[imageLightbox.index]?.alt ?? "Pregled slike"}
              className="mx-auto max-h-[82vh] w-auto rounded-xl object-contain"
              onClick={(event) => {
                event.stopPropagation();
                if (imageLightbox.items.length > 1) {
                  handleStepLightbox(1);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
