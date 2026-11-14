"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { AlertCircle, Check, CloudUpload, Facebook, Images, Instagram, Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import type { useProductCategories } from "../_hooks/useProductCategories";
import type { useProductFormFields } from "../_hooks/useProductFormFields";
import type { useProductFormState } from "../_hooks/useProductFormState";
import type { useProductFormSubmit } from "../_hooks/useProductFormSubmit";
import type { useProductImages } from "../_hooks/useProductImages";
import type { useProductMediaInbox } from "../_hooks/useProductMediaInbox";
import type { useProductsState } from "../_hooks/useProductsState";
import type { useProductsView } from "../_hooks/useProductsView";

type ProductFormDialogProps = {
  isKodMajstor: ReturnType<typeof useProductsState>["isKodMajstor"];
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  setIsModalOpen: ReturnType<typeof useProductsState>["setIsModalOpen"];
  editingProduct: ReturnType<typeof useProductsState>["editingProduct"];
  images: ReturnType<typeof useProductsState>["images"];
  variantImages: ReturnType<typeof useProductsState>["variantImages"];
  adImage: ReturnType<typeof useProductsState>["adImage"];
  isUploadingImages: ReturnType<typeof useProductsState>["isUploadingImages"];
  isUploadingAdImage: ReturnType<typeof useProductsState>["isUploadingAdImage"];
  isDraggingFiles: ReturnType<typeof useProductsState>["isDraggingFiles"];
  isAdDragActive: ReturnType<typeof useProductsState>["isAdDragActive"];
  categorySearch: ReturnType<typeof useProductsState>["categorySearch"];
  setCategorySearch: ReturnType<typeof useProductsState>["setCategorySearch"];
  categoryMenuOpen: ReturnType<typeof useProductsState>["categoryMenuOpen"];
  setCategoryMenuOpen: ReturnType<typeof useProductsState>["setCategoryMenuOpen"];
  isAddingCategory: ReturnType<typeof useProductsState>["isAddingCategory"];
  setIsAddingCategory: ReturnType<typeof useProductsState>["setIsAddingCategory"];
  newCategoryName: ReturnType<typeof useProductsState>["newCategoryName"];
  setNewCategoryName: ReturnType<typeof useProductsState>["setNewCategoryName"];
  newCategoryIcon: ReturnType<typeof useProductsState>["newCategoryIcon"];
  isCreatingCategory: ReturnType<typeof useProductsState>["isCreatingCategory"];
  isUploadingCategoryIcon: ReturnType<typeof useProductsState>["isUploadingCategoryIcon"];
  showSupplierForm: ReturnType<typeof useProductsState>["showSupplierForm"];
  setShowSupplierForm: ReturnType<typeof useProductsState>["setShowSupplierForm"];
  variantUploadInputsRef: ReturnType<typeof useProductsState>["variantUploadInputsRef"];
  productUploadInputRef: ReturnType<typeof useProductsState>["productUploadInputRef"];
  adImageInputRef: ReturnType<typeof useProductsState>["adImageInputRef"];
  categoryIconInputRef: ReturnType<typeof useProductsState>["categoryIconInputRef"];
  categoryDropdownRef: ReturnType<typeof useProductsState>["categoryDropdownRef"];
  dialogScrollRef: ReturnType<typeof useProductsState>["dialogScrollRef"];
  fileInputId: ReturnType<typeof useProductsState>["fileInputId"];
  adUploadInputId: ReturnType<typeof useProductsState>["adUploadInputId"];
  hiddenFileInputStyle: ReturnType<typeof useProductsState>["hiddenFileInputStyle"];
  categories: ReturnType<typeof useProductsState>["categories"];
  suppliers: ReturnType<typeof useProductsState>["suppliers"];
  form: ReturnType<typeof useProductFormState>["form"];
  categoryIds: ReturnType<typeof useProductFormState>["categoryIds"];
  supplierOffersField: ReturnType<typeof useProductFormState>["supplierOffersField"];
  publishIgSelected: ReturnType<typeof useProductFormState>["publishIgSelected"];
  resolvedProductType: ReturnType<typeof useProductFormState>["resolvedProductType"];
  normalizedVariants: ReturnType<typeof useProductFormState>["normalizedVariants"];
  normalizedSupplierOffers: ReturnType<typeof useProductFormState>["normalizedSupplierOffers"];
  supplierMap: ReturnType<typeof useProductFormState>["supplierMap"];
  hasSupplierOffers: ReturnType<typeof useProductFormState>["hasSupplierOffers"];
  requestCloseModal: ReturnType<typeof useProductFormSubmit>["requestCloseModal"];
  handleSubmit: ReturnType<typeof useProductFormSubmit>["handleSubmit"];
  resetNewCategoryState: ReturnType<typeof useProductCategories>["resetNewCategoryState"];
  handleSelectCategory: ReturnType<typeof useProductCategories>["handleSelectCategory"];
  handleRemoveCategory: ReturnType<typeof useProductCategories>["handleRemoveCategory"];
  handleCategoryIconChange: ReturnType<typeof useProductCategories>["handleCategoryIconChange"];
  handleCategoryIconDrop: ReturnType<typeof useProductCategories>["handleCategoryIconDrop"];
  handleCreateCategory: ReturnType<typeof useProductCategories>["handleCreateCategory"];
  handleRequestDeleteCategory: ReturnType<typeof useProductCategories>["handleRequestDeleteCategory"];
  filteredCategories: ReturnType<typeof useProductsView>["filteredCategories"];
  selectedCategories: ReturnType<typeof useProductsView>["selectedCategories"];
  variantsError: ReturnType<typeof useProductsView>["variantsError"];
  defaultVariantEntry: ReturnType<typeof useProductsView>["defaultVariantEntry"];
  bestFormOffer: ReturnType<typeof useProductsView>["bestFormOffer"];
  bestFormSupplierName: ReturnType<typeof useProductsView>["bestFormSupplierName"];
  handleProductTypeChange: ReturnType<typeof useProductFormFields>["handleProductTypeChange"];
  handleAddVariant: ReturnType<typeof useProductFormFields>["handleAddVariant"];
  handleAddVariantFromSingle: ReturnType<typeof useProductFormFields>["handleAddVariantFromSingle"];
  handleRemoveVariant: ReturnType<typeof useProductFormFields>["handleRemoveVariant"];
  handleSetDefaultVariant: ReturnType<typeof useProductFormFields>["handleSetDefaultVariant"];
  handleClearVariants: ReturnType<typeof useProductFormFields>["handleClearVariants"];
  handleAddSupplierOffer: ReturnType<typeof useProductFormFields>["handleAddSupplierOffer"];
  handleUpdateSupplierOffer: ReturnType<typeof useProductFormFields>["handleUpdateSupplierOffer"];
  handleRemoveSupplierOffer: ReturnType<typeof useProductFormFields>["handleRemoveSupplierOffer"];
  handleAdImageChange: ReturnType<typeof useProductMediaInbox>["handleAdImageChange"];
  handleAdDrop: ReturnType<typeof useProductMediaInbox>["handleAdDrop"];
  handleAdDragOver: ReturnType<typeof useProductMediaInbox>["handleAdDragOver"];
  handleAdDragLeave: ReturnType<typeof useProductMediaInbox>["handleAdDragLeave"];
  handleRemoveAdImage: ReturnType<typeof useProductMediaInbox>["handleRemoveAdImage"];
  handleFilesSelected: ReturnType<typeof useProductImages>["handleFilesSelected"];
  handleDropFiles: ReturnType<typeof useProductImages>["handleDropFiles"];
  handleVariantFilesSelected: ReturnType<typeof useProductImages>["handleVariantFilesSelected"];
  handleDragEnter: ReturnType<typeof useProductImages>["handleDragEnter"];
  handleDragOver: ReturnType<typeof useProductImages>["handleDragOver"];
  handleDragLeave: ReturnType<typeof useProductImages>["handleDragLeave"];
  handleOpenVariantPicker: ReturnType<typeof useProductImages>["handleOpenVariantPicker"];
  handleOpenProductPicker: ReturnType<typeof useProductImages>["handleOpenProductPicker"];
  handleSetMainImage: ReturnType<typeof useProductImages>["handleSetMainImage"];
  handleOpenImageGroup: ReturnType<typeof useProductImages>["handleOpenImageGroup"];
  handleSetVariantMainImage: ReturnType<typeof useProductImages>["handleSetVariantMainImage"];
  handleToggleImagePublish: ReturnType<typeof useProductImages>["handleToggleImagePublish"];
  handleToggleVariantImagePublish: ReturnType<typeof useProductImages>["handleToggleVariantImagePublish"];
  handleRemoveImage: ReturnType<typeof useProductImages>["handleRemoveImage"];
  handleRemoveVariantImage: ReturnType<typeof useProductImages>["handleRemoveVariantImage"];
};

export function ProductFormDialog({ isKodMajstor, isModalOpen, setIsModalOpen, editingProduct, images, variantImages, adImage, isUploadingImages, isUploadingAdImage, isDraggingFiles, isAdDragActive, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, isCreatingCategory, isUploadingCategoryIcon, showSupplierForm, setShowSupplierForm, variantUploadInputsRef, productUploadInputRef, adImageInputRef, categoryIconInputRef, categoryDropdownRef, dialogScrollRef, fileInputId, adUploadInputId, hiddenFileInputStyle, categories, suppliers, form, categoryIds, supplierOffersField, publishIgSelected, resolvedProductType, normalizedVariants, normalizedSupplierOffers, supplierMap, hasSupplierOffers, requestCloseModal, handleSubmit, resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory, filteredCategories, selectedCategories, variantsError, defaultVariantEntry, bestFormOffer, bestFormSupplierName, handleProductTypeChange, handleAddVariant, handleAddVariantFromSingle, handleRemoveVariant, handleSetDefaultVariant, handleClearVariants, handleAddSupplierOffer, handleUpdateSupplierOffer, handleRemoveSupplierOffer, handleAdImageChange, handleAdDrop, handleAdDragOver, handleAdDragLeave, handleRemoveAdImage, handleFilesSelected, handleDropFiles, handleVariantFilesSelected, handleDragEnter, handleDragOver, handleDragLeave, handleOpenVariantPicker, handleOpenProductPicker, handleSetMainImage, handleOpenImageGroup, handleSetVariantMainImage, handleToggleImagePublish, handleToggleVariantImagePublish, handleRemoveImage, handleRemoveVariantImage }: ProductFormDialogProps) {
  return (
    <Sheet
      open={isModalOpen}
      onOpenChange={(open) => {
        if (open) {
          setIsModalOpen(true);
          return;
        }
        requestCloseModal();
      }}
      title={editingProduct ? "Izmeni proizvod" : "Novi proizvod"}
      description={editingProduct ? (editingProduct.kpName ?? editingProduct.name) : "Nabavna i prodajna cena su u evrima."}
      size="full"
      desktopWidth="xl"
      closeSide="start"
      headerActions={
        <Button type="submit" form="product-form" size="sm" disabled={form.formState.isSubmitting} className="h-11 rounded-xl px-4 md:h-9">
          Sačuvaj
        </Button>
      }
      footer={
        <Button type="submit" form="product-form" disabled={form.formState.isSubmitting} className="w-full gap-2">
          {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {editingProduct ? "Sačuvaj izmene" : "Sačuvaj proizvod"}
        </Button>
      }
    >
      <div ref={dialogScrollRef} className="space-y-4">


        <Form id="product-form" form={form} onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div>
              <FormLabel>Slike</FormLabel>
              <p className="text-sm text-slate-500">Dodaj vise slika i oznaci jednu kao glavnu.</p>
            </div>
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDropFiles}
              className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition duration-200 ${
                isDraggingFiles
                  ? "border-blue-500/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-[0_22px_60px_-34px_rgba(37,99,235,0.55)]"
                  : "border-slate-200/80 bg-slate-50/60 hover:border-slate-300 hover:shadow-[0_16px_50px_-40px_rgba(15,23,42,0.35)]"
              }`}
            >
              <input
                id={fileInputId}
                type="file"
                aria-label="Dodaj slike proizvoda"
                accept="image/*"
                multiple
                disabled={isUploadingImages}
                onChange={handleFilesSelected}
                tabIndex={-1}
                style={hiddenFileInputStyle}
                ref={productUploadInputRef}
              />
              <div className="relative flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 text-slate-700">
                  <div className="rounded-full bg-blue-100 p-3 text-blue-600 shadow-inner shadow-blue-200">
                    <CloudUpload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Prevuci ili izaberi slike</p>
                    <p className="text-xs text-slate-500">Podrzani su PNG, JPG, WebP i ostali standardni formati.</p>
                    {isUploadingImages && <p className="text-xs font-semibold text-blue-600">Otpremanje...</p>}
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 sm:items-end">
                  <Button
                    type="button"
                    onClick={handleOpenProductPicker}
                    className={`rounded-full px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                      isUploadingImages
                        ? "bg-slate-400 opacity-70"
                        : "bg-blue-600 hover:-translate-y-[1px] hover:bg-blue-700"
                    }`}
                    disabled={isUploadingImages}
                  >
                    Izaberi fajlove
                  </Button>
                  <div className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 ring-1 ring-slate-200">
                    <Images className="h-4 w-4 text-slate-400" />
                    Drag & Drop
                  </div>
                </div>
              </div>
              {isDraggingFiles && (
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/12 to-purple-500/20">
                  <div className="absolute inset-4 rounded-xl border border-blue-500/40 shadow-[0_0_0_1px_rgba(37,99,235,0.25)] blur-[0.5px]" />
                </div>
              )}
            </div>
            {!isUploadingImages && (
              <p className="text-xs text-slate-500">Prevuci slike iz Windows foldera ili klikni na dugme.</p>
            )}
            {images.length === 0 ? (
              <p className="text-sm italic text-slate-500">Jos nema dodatih slika.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {images.map((image) => {
                  const resolvedUrl = image.url ?? image.previewUrl;
                  const fbActive = image.publishFb ?? true;
                  const igActive = image.publishIg ?? true;
                  return (
                    <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                      <div
                        className={`relative aspect-video overflow-hidden rounded-md bg-slate-100 ${
                          resolvedUrl ? "cursor-pointer transition hover:opacity-95" : ""
                        }`}
                        onClick={() => handleOpenImageGroup(images, image.storageId)}
                      >
                        {resolvedUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolvedUrl} alt={image.fileName ?? "Product image"} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs uppercase text-slate-400">
                            Bez pregleda
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="-mx-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 font-medium text-text-muted md:min-h-8">
                            <input
                              type="radio"
                              name="main-image"
                              checked={image.isMain}
                              onChange={() => handleSetMainImage(image.storageId)}
                            />
                            Glavna
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                fbActive
                                  ? "bg-blue-600 text-white hover:bg-blue-700"
                                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                              }`}
                              onClick={() => handleToggleImagePublish(image.storageId, "publishFb", !fbActive)}
                            >
                              <Facebook className="h-3.5 w-3.5" />
                              FB
                            </button>
                            <button
                              type="button"
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                igActive
                                  ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                              }`}
                              onClick={() => handleToggleImagePublish(image.storageId, "publishIg", !igActive)}
                            >
                              <Instagram className="h-3.5 w-3.5" />
                              IG
                            </button>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveImage(image.storageId)}>
                          Ukloni
                        </Button>
                      </div>
                      {image.fileName && <p className="truncate text-xs text-slate-500">{image.fileName}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <FormLabel>Glavna slika za drustvene mreze</FormLabel>
                <p className="text-sm text-slate-500">Prva fotka koja ide uz FB / Instagram objave.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id={adUploadInputId}
                  ref={adImageInputRef}
                  type="file"
                  aria-label="Slika za društvene mreže"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleAdImageChange}
                  disabled={isUploadingAdImage}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  disabled={isUploadingAdImage}
                  onClick={() => adImageInputRef.current?.click()}
                >
                  <CloudUpload className="h-4 w-4" />
                  {adImage ? "Zameni sliku" : "Dodaj glavnu sliku"}
                </Button>
                {adImage ? (
                  <Button type="button" size="sm" variant="ghost" className="gap-1 text-red-600" onClick={handleRemoveAdImage}>
                    <X className="h-4 w-4" />
                    Ukloni
                  </Button>
                ) : null}
              </div>
            </div>
            <div
              className={`relative overflow-hidden rounded-xl border border-dashed transition ${
                isAdDragActive ? "border-blue-400 bg-blue-50/60" : "border-slate-200 bg-slate-50"
              }`}
              onDragEnter={handleAdDragOver}
              onDragOver={handleAdDragOver}
              onDragLeave={handleAdDragLeave}
              onDrop={handleAdDrop}
            >
              {(() => {
                const previewUrl = adImage?.previewUrl ?? adImage?.url;
                if (previewUrl) {
                  return (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white/60">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="Glavna slika za drustvene mreze"
                        className="h-[200px] w-full object-cover sm:h-[260px]"
                      />
                      <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow">
                        <Tag className="h-3 w-3 text-slate-500" />
                        Glavna za drustvene mreze
                      </div>
                      <div className="absolute right-3 top-3 hidden gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow sm:inline-flex">
                        <CloudUpload className="h-3.5 w-3.5 text-blue-600" />
                        Prevuci novu fotku da zamenis
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex min-h-[160px] items-center justify-between gap-3 p-4 sm:p-6">
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="rounded-full bg-blue-100 p-3 text-blue-600 shadow-inner shadow-blue-200">
                        <Images className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">Dodaj glavnu sliku</p>
                        <p className="text-xs text-slate-500">Prevuci je ovde ili klikni na dugme.</p>
                      </div>
                    </div>
                    <div className="hidden text-xs text-slate-500 sm:block">Koristi se kao prva na FB/IG.</div>
                  </div>
                );
              })()}
              {isAdDragActive ? (
                <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-blue-400/60 bg-blue-100/50" />
              ) : null}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              name="kpName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="pf-kpName">KP naziv (glavni na sajtu)</FormLabel>
                  <Input id="pf-kpName" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-kpName-greska" : undefined} placeholder="npr. Samohodni trimer" {...field} />
                  <FormMessage id="pf-kpName-greska">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="pf-name">FB / Insta naziv</FormLabel>
                  <Input id="pf-name" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-name-greska" : undefined} placeholder="npr. Trimer za FB/IG objavu" {...field} />
                  <FormMessage id="pf-name-greska">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              name="nabavnaCena"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="pf-nabavnaCena">Nabavna cena (EUR)</FormLabel>
                  <div className="space-y-2">
                    <Input id="pf-nabavnaCena" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-nabavnaCena-greska" : undefined}
                      ref={field.ref}
                      name={field.name}
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 11.90"
                      value={hasSupplierOffers ? bestFormOffer?.price ?? field.value : field.value}
                      disabled={hasSupplierOffers}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                    />
                    {hasSupplierOffers ? (
                      <div className="flex flex-wrap gap-2">
                        {normalizedSupplierOffers.map((offer) => {
                          const supplierName = supplierMap.get(offer.supplierId)?.name ?? "Dobavljac";
                          const isBest = bestFormOffer && offer.price === bestFormOffer.price;
                          return (
                            <span
                              key={`${offer.supplierId}-${offer.variantId ?? "base"}`}
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold shadow ${
                                isBest
                                  ? "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
                                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                              }`}
                            >
                              {supplierName}
                              <span className="text-xs font-bold">{formatCurrency(offer.price, "EUR")}</span>
                            </span>
                          );
                        })}
                      </div>
                    ) : null}
                    <FormMessage id="pf-nabavnaCena-greska">{fieldState.error?.message}</FormMessage>
                  </div>
                </FormItem>
              )}
            />
          <FormField
            name="prodajnaCena"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel htmlFor="pf-prodajnaCena">Prodajna cena (EUR)</FormLabel>
                  <Input id="pf-prodajnaCena" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-prodajnaCena-greska" : undefined}
                    ref={field.ref}
                    name={field.name}
                    type="text"
                    inputMode="decimal"
                    placeholder="npr. 15.50"
                    value={field.value}
                    onChange={(event) => field.onChange(event.target.value)}
                    onBlur={field.onBlur}
                  />
                  <FormMessage id="pf-prodajnaCena-greska">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            <FormField
              name="pickupAvailable"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                  <Switch
                    id="pickup-available"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                  <FormLabel htmlFor="pickup-available" className="m-0 flex min-h-11 flex-1 cursor-pointer items-center">
                    Licno preuzimanje
                  </FormLabel>
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-3 rounded-lg border border-blue-100 bg-slate-50/60 px-3 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <FormLabel>Dobavljaci i nabavne ponude</FormLabel>
                <p className="text-xs text-slate-600">Najniza ponuda postaje prava nabavna cena proizvoda.</p>
              </div>
              {!showSupplierForm && supplierOffersField.length === 0 ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowSupplierForm(true)}
                  disabled={suppliers === undefined}
                >
                  <Plus className="h-4 w-4" />
                  Dodaj dobavljaca
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSupplierOffer(defaultVariantEntry?.id)}
                  disabled={suppliers === undefined}
                >
                  <Plus className="h-4 w-4" />
                  Dodaj dobavljaca
                </Button>
              )}
            </div>
            {suppliers === undefined ? (
              <p className="text-sm text-slate-500">Ucitavanje dobavljaca...</p>
            ) : suppliers.length === 0 ? (
              <p className="text-sm text-slate-500">
                Dodaj dobavljace u kartici ispod, pa ih povezi sa proizvodima.
              </p>
            ) : showSupplierForm || supplierOffersField.length > 0 ? (
              <div className="space-y-2">
                {supplierOffersField.length === 0 ? (
                  <div className="rounded-md border border-dashed border-blue-200 bg-white px-3 py-2 text-sm text-slate-600">
                    Nema vezanih dobavljaca. Najnizu cenu iz ponude dobavljaca cuvamo kao nabavnu cenu.
                  </div>
                ) : (
                  supplierOffersField.map((offer, index) => {
                    const pathBase = `supplierOffers.${index}`;
                    const rowId = offer.id ?? `${offer.supplierId}-${offer.variantId ?? "base"}`;
                    return (
                      <div
                        key={rowId}
                        className="rounded-md border border-blue-200 bg-white px-3 py-3 shadow-sm ring-1 ring-blue-50"
                      >
                        <div className="grid gap-3 md:grid-cols-12 md:items-end">
                          <div className="md:col-span-4 space-y-1">
                            <FormLabel className="text-xs text-slate-500">Dobavljac</FormLabel>
                            <Select
                              value={offer.supplierId}
                              onValueChange={(value) => handleUpdateSupplierOffer(rowId, "supplierId", value)}
                            >
                              <SelectTrigger
                                name={`${pathBase}.supplierId`}
                                data-focus-target={`${pathBase}.supplierId`}
                              >
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
                          {resolvedProductType === "variant" ? (
                            <div className="md:col-span-4 space-y-1">
                              <FormLabel className="text-xs text-slate-500">Vazi za</FormLabel>
                              <Select
                                value={offer.variantId ?? "base"}
                                onValueChange={(value) =>
                                  handleUpdateSupplierOffer(rowId, "variantId", value === "base" ? undefined : value)
                                }
                              >
                                <SelectTrigger
                                  name={`${pathBase}.variantId`}
                                  data-focus-target={`${pathBase}.variantId`}
                                >
                                  <SelectValue placeholder="Svi tipovi" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="base">Svi tipovi</SelectItem>
                                  {normalizedVariants.map((variant) => (
                                    <SelectItem key={variant.id} value={variant.id}>
                                      {variant.label || "Tip"}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : null}
                          <div
                            className={`space-y-1 ${resolvedProductType === "variant" ? "md:col-span-3" : "md:col-span-6"}`}
                          >
                            <FormLabel className="text-xs text-slate-500">Cena (EUR)</FormLabel>
                            <Input
                              name={`${pathBase}.price`}
                              value={offer.price}
                              inputMode="decimal"
                              placeholder="npr. 10.50"
                              onChange={(event) => handleUpdateSupplierOffer(rowId, "price", event.target.value)}
                            />
                          </div>
                          <div className="md:col-span-1 flex justify-end">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveSupplierOffer(rowId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : null}
            {bestFormOffer ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                Najniza nabavna: {formatCurrency(bestFormOffer.price, "EUR")}{" "}
                {bestFormSupplierName ? `(${bestFormSupplierName})` : ""}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Kada dodelis dobavljaca, ova cena ce biti oznacena kao prava nabavna cena.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                className="w-full"
                variant={resolvedProductType === "single" ? "default" : "outline"}
                onClick={() => handleProductTypeChange("single")}
              >
                Obican proizvod
              </Button>
              <Button
                type="button"
                className="w-full"
                variant={resolvedProductType === "variant" ? "default" : "outline"}
                onClick={() => handleProductTypeChange("variant")}
              >
                Tipski proizvod
              </Button>
            </div>
            <p className="text-sm text-slate-500">
              Obican ima jednu cenu i KP / FB opis, tipski moze da ima vise tipova sa sopstvenim cenama i opisima.
            </p>
          </div>
          {resolvedProductType === "variant" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <FormLabel>Tipovi proizvoda</FormLabel>
                  <p className="text-sm text-slate-500">
                    Svaki tip ima svoje cene i opis. Glavni tip se koristi kao podrazumevani za liste i kalkulacije.
                  </p>
                </div>
                {normalizedVariants.length === 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddVariant}
                    data-focus-target="variants"
                    aria-describedby={variantsError ? "pf-variants-error" : undefined}
                  >
                    Dodaj tip
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={handleAddVariant}>
                      Dodaj jos tip
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClearVariants}>
                      Vrati na jednostavni
                    </Button>
                  </div>
                )}
              </div>
              {normalizedVariants.length === 0 ? (
                <p className="text-sm text-slate-500">Dodaj bar jedan tip da bi sacuvao tipski proizvod.</p>
              ) : (
                <div className="space-y-4">
                  {normalizedVariants.map((variant, index) => (
                    <div key={variant.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-600">Tip #{index + 1}</span>
                        <div className="flex items-center gap-3 text-xs">
                          <label className="-mx-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 font-medium text-text-muted md:min-h-8">
                            <input
                              type="radio"
                              name="default-variant"
                              checked={variant.isDefault}
                              onChange={() => handleSetDefaultVariant(variant.id)}
                            />
                            Glavni
                          </label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveVariant(variant.id)}>
                            Ukloni
                          </Button>
                        </div>
                      </div>
                      <FormField
                        name={`variants.${index}.label` as const}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Naziv tipa</FormLabel>
                            <Input placeholder="npr. 2 brzine" {...field} />
                            <FormMessage>{fieldState.error?.message}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        name={`variants.${index}.opis` as const}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Opis tipa (opciono)</FormLabel>
                            <Textarea rows={2} placeholder="npr. Bela boja, velicina M" autoResize {...field} />
                            <FormMessage>{fieldState.error?.message}</FormMessage>
                          </FormItem>
                        )}
                      />
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        name={`variants.${index}.nabavnaCena` as const}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Nabavna cena (EUR)</FormLabel>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              type="text"
                              inputMode="decimal"
                              placeholder="npr. 120.00"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              onBlur={field.onBlur}
                            />
                            <FormMessage>{fieldState.error?.message}</FormMessage>
                          </FormItem>
                        )}
                      />
                      <FormField
                        name={`variants.${index}.prodajnaCena` as const}
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel>Prodajna cena (EUR)</FormLabel>
                            <Input
                              ref={field.ref}
                              name={field.name}
                              type="text"
                              inputMode="decimal"
                              placeholder="npr. 150.00"
                              value={field.value}
                              onChange={(event) => field.onChange(event.target.value)}
                              onBlur={field.onBlur}
                            />
                            <FormMessage>{fieldState.error?.message}</FormMessage>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel>Slike tipa</FormLabel>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm shadow-slate-900/20 transition hover:bg-slate-800"
                            disabled={isUploadingImages}
                            onClick={() => handleOpenVariantPicker(variant.id)}
                            aria-controls={`variant-upload-${variant.id}`}
                          >
                            Dodaj slike
                          </Button>
                          <input
                            id={`variant-upload-${variant.id}`}
                            type="file"
                            aria-label="Dodaj slike tipa"
                            accept="image/*"
                            multiple
                            disabled={isUploadingImages}
                            onChange={(event) => handleVariantFilesSelected(variant.id, event)}
                            tabIndex={-1}
                            style={hiddenFileInputStyle}
                            ref={(node) => {
                              if (!node) {
                                delete variantUploadInputsRef.current[variant.id];
                                return;
                              }
                              variantUploadInputsRef.current[variant.id] = node;
                            }}
                          />
                        </div>
                      </div>
                      {variantImages[variant.id]?.length ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {variantImages[variant.id]?.map((image) => {
                            const resolvedUrl = image.url ?? image.previewUrl;
                            const fbActive = image.publishFb ?? true;
                            const igActive = image.publishIg ?? true;
                            return (
                              <div key={image.storageId} className="space-y-2 rounded-lg border border-slate-200 p-3">
                                <div
                                  className={`relative aspect-video overflow-hidden rounded-md bg-slate-100 ${
                                    resolvedUrl ? "cursor-pointer transition hover:opacity-95" : ""
                                  }`}
                                  onClick={() => handleOpenImageGroup(variantImages[variant.id] ?? [], image.storageId)}
                                >
                                  {resolvedUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={resolvedUrl} alt={image.fileName ?? "Variant image"} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-xs uppercase text-slate-400">
                                      Bez pregleda
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <label className="-mx-1 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 font-medium text-text-muted md:min-h-8">
                                      <input
                                        type="radio"
                                        name={`variant-main-${variant.id}`}
                                        checked={image.isMain}
                                        onChange={() => handleSetVariantMainImage(variant.id, image.storageId)}
                                      />
                                      Glavna
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                          fbActive
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        }`}
                                        onClick={() =>
                                          handleToggleVariantImagePublish(variant.id, image.storageId, "publishFb", !fbActive)
                                        }
                                      >
                                        <Facebook className="h-3.5 w-3.5" />
                                        FB
                                      </button>
                                      <button
                                        type="button"
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition ${
                                          igActive
                                            ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:from-pink-600 hover:to-rose-600"
                                            : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                        }`}
                                        onClick={() =>
                                          handleToggleVariantImagePublish(variant.id, image.storageId, "publishIg", !igActive)
                                        }
                                      >
                                        <Instagram className="h-3.5 w-3.5" />
                                        IG
                                      </button>
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveVariantImage(variant.id, image.storageId)}
                                  >
                                    Ukloni
                                  </Button>
                                </div>
                                {image.fileName && <p className="truncate text-xs text-slate-500">{image.fileName}</p>}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">Jos nema slika za ovaj tip.</p>
                      )}
                    </div>
                  </div>
                  ))}
                </div>
              )}
              {variantsError ? (
                <p id="pf-variants-error" role="alert" className="text-[13px] text-danger">
                  {variantsError}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <FormLabel>Tipovi proizvoda</FormLabel>
                  <p className="text-sm text-slate-500">Dodaj tip i proizvod se automatski prebacuje na tipski.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={handleAddVariantFromSingle}>
                  Dodaj tip
                </Button>
              </div>
            </div>
          )}
            <div className="space-y-2" ref={categoryDropdownRef}>
              <FormLabel>Kategorije</FormLabel>
              <p className="text-sm text-slate-500">Biraj postojecu ili napravi novu na licu mesta.</p>
              <div className="flex flex-wrap gap-2">
                {selectedCategories.length === 0 ? (
                  <span className="text-xs text-slate-500">Nema izabranih kategorija.</span>
              ) : (
                selectedCategories.map((category) => (
                  <span
                    key={category._id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
                  >
                    <Tag className="h-4 w-4 text-slate-500" />
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
                onFocus={() => {
                  setCategoryMenuOpen(true);
                }}
                onClick={() => setCategoryMenuOpen(true)}
              />
              <input
                ref={categoryIconInputRef}
                type="file"
                aria-label="Ikonica kategorije"
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
                      const isSelected = categoryIds.includes(category._id);
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
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              name="opisKp"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="pf-opisKp">KupujemProdajem opis</FormLabel>
                  <Textarea id="pf-opisKp" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-opisKp-greska" : undefined} rows={3} placeholder="Opis za KP" autoResize {...field} />
                  <FormMessage id="pf-opisKp-greska">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              name="opisFbInsta"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel htmlFor="pf-opisFbInsta">FB / Insta opis</FormLabel>
                  <Textarea id="pf-opisFbInsta" aria-invalid={Boolean(fieldState.error)} aria-describedby={fieldState.error ? "pf-opisFbInsta-greska" : undefined} rows={3} placeholder="Opis za drustvene mreze" autoResize {...field} />
                  <FormMessage id="pf-opisFbInsta-greska">{fieldState.error?.message}</FormMessage>
                </FormItem>
              )}
            />
          </div>
          {isKodMajstor ? (
            <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <FormField
                name="publishKp"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <Switch
                      id="publish-kp"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <FormLabel htmlFor="publish-kp" className="m-0 flex min-h-11 flex-1 items-center gap-2 cursor-pointer">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white shadow-sm ring-1 ring-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/kp.png" alt="KP" className="h-7 w-7 object-contain" />
                      </span>
                      <span className="text-sm font-semibold text-slate-800">KupujemProdajem</span>
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="publishFbProfile"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <Switch
                      id="publish-fb-profile"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <FormLabel
                      htmlFor="publish-fb-profile"
                      className="m-0 flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span>Kod Majstora</span>
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="publishIg"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <Switch
                      id="publish-ig"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <FormLabel
                      htmlFor="publish-ig"
                      className="m-0 flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm">
                        <Instagram className="h-4 w-4" />
                      </span>
                      <span>kod.majstora</span>
                    </FormLabel>
                  </FormItem>
                )}
              />
              <FormField
                name="publishMarketplace"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-md border border-slate-200 px-3 py-2">
                    <Switch
                      id="publish-marketplace"
                      checked={!!field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                    />
                    <FormLabel
                      htmlFor="publish-marketplace"
                      className="m-0 flex min-h-11 flex-1 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
                    >
                      <Facebook className="h-5 w-5 text-blue-600" />
                      <span>Marketplace</span>
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            {!editingProduct && publishIgSelected ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
                <AlertCircle className="mt-0.5 h-4 w-4" />
                <p className="leading-snug">Kada cekiras Instagram ovde, posle cuvanja novog proizvoda objava ide automatski na nalog kod.majstora.</p>
              </div>
            ) : null}
            </div>
          ) : null}
        </Form>
      </div>
    </Sheet>
  );
}
