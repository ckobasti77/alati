"use client";


import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CloudUpload,
  Download,
  Facebook,
  Images,
  Instagram,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  Search,
  ShoppingBag,
  Share2,
  Tag,
  Trash2,
  UserRound,
  X,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingDots } from "@/components/LoadingDots";
import { formatCurrency } from "@/lib/format";
import type { Category, } from "@/types/order";
import { RequireAuth } from "@/components/RequireAuth";
import { type SortOption, } from "./_lib/productHelpers";
import { useProductsState } from "./_hooks/useProductsState";
import { useProductsFeed } from "./_hooks/useProductsFeed";
import { useProductFormState } from "./_hooks/useProductFormState";
import { useProductFormSubmit } from "./_hooks/useProductFormSubmit";
import { useProductAdminActions } from "./_hooks/useProductAdminActions";
import { useProductCategories } from "./_hooks/useProductCategories";
import { useProductsView } from "./_hooks/useProductsView";
import { useProductFormFields } from "./_hooks/useProductFormFields";
import { useProductMediaInbox } from "./_hooks/useProductMediaInbox";
import { useProductImages } from "./_hooks/useProductImages";
import { useProductEdit } from "./_hooks/useProductEdit";

export default function ProductsPage() {
  return (
    <RequireAuth>
      <ProductsContent />
    </RequireAuth>
  );
}

function ProductsContent() {
  const { router, pathname, searchParams, searchQuery, sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isDraggingFiles, setIsDraggingFiles, isAdDragActive, setIsAdDragActive, isInboxDragActive, setIsInboxDragActive, viewMode, setViewMode, archiveView, setArchiveView, isMobile, setIsMobile, sortBy, setSortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isCreatingCategory, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, hasSeededCategories, setHasSeededCategories, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, hasSeededSuppliers, setHasSeededSuppliers, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxView, inboxContextMenu, setInboxContextMenu, showSupplierForm, setShowSupplierForm, showUtilityPanels, setShowUtilityPanels, variantUploadInputsRef, productUploadInputRef, adImageInputRef, inboxUploadInputRef, categoryIconInputRef, categoryDropdownRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, didRestoreRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, fileInputId, adUploadInputId, hiddenFileInputStyle, productList, productStats, createProduct, updateProduct, removeProduct, setProductArchived, categories, suppliers, inboxImages, createCategory, removeCategory, ensureDefaultCategories, createSupplier, removeSupplier, ensureDefaultSuppliers, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl } = useProductsState();

  const { resetProductsFeed, hasMoreProducts } = useProductsFeed({ router, pathname, searchParams, searchQuery, sessionToken, viewMode, setViewMode, archiveView, setArchiveView, sortBy, setSortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, didRestoreRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, productList });

  const { form, variants, categoryIds, supplierOffersField, publishIgSelected, resolvedProductType, normalizedVariants, normalizedSupplierOffers, supplierMap, bestSupplierForVariant, hasSupplierOffers } = useProductFormState({ sessionToken, setViewMode, isMobile, setIsMobile, hasSeededCategories, setHasSeededCategories, hasSeededSuppliers, setHasSeededSuppliers, setShowSupplierForm, categories, suppliers, ensureDefaultCategories, ensureDefaultSuppliers });

  const { buildModalSnapshot, closeModal, openCreateModal, requestCloseModal, handleSubmit } = useProductFormSubmit({ sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, setIsUploadingAdImage, setIsDraggingFiles, setIsAdDragActive, categorySearch, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsUploadingCategoryIcon, variantUploadInputsRef, modalSnapshotRef, createProduct, updateProduct, resetProductsFeed, form, variants });

  const { handleArchive, handleDelete, handleCreateSupplierEntry, handleRemoveSupplierEntry } = useProductAdminActions({ sessionToken, editingProduct, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, removeProduct, setProductArchived, createSupplier, removeSupplier, resetProductsFeed, closeModal });
  const { resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory } = useProductCategories({ sessionToken, setImageLightbox, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, createCategory, removeCategory, generateUploadUrl, form });

  const { items, categoryMap, filteredCategories, hasProductSearch, selectedCategories, variantsError, getDisplayPrice, getBestSupplier, getMainImage, hasSocialMainImage, getSalesCount, sortedProducts, visibleProducts, defaultVariantEntry, bestFormOffer, bestFormSupplierName, inboxWithPriceCount, inboxWithoutPriceCount, inboxSkipCount, inboxList, supplierCount, inboxTotalCount, inboxEmptyMessage, emptyProductsMessage } = useProductsView({ images, archiveView, sortBy, productSearch, productFeed, categorySearch, inboxView, inboxContextMenu, setInboxContextMenu, productStats, categories, suppliers, inboxImages, form, categoryIds, resolvedProductType, normalizedVariants, supplierMap, bestSupplierForVariant });

  const { handleProductTypeChange, handleAddVariant, handleAddVariantFromSingle, handleRemoveVariant, handleSetDefaultVariant, handleClearVariants, handleAddSupplierOffer, handleUpdateSupplierOffer, handleRemoveSupplierOffer } = useProductFormFields({ isModalOpen, setExitConfirmOpen, setVariantImages, variantUploadInputsRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, suppliers, form, resolvedProductType, hasSupplierOffers, buildModalSnapshot, bestFormOffer });

  const { openLightbox, handleAdImageChange, handleAdDrop, uploadInboxImages, handleInboxFilesSelected, handleDeleteInboxImage, handleMoveInboxImage, handleOpenInboxPreview, handleInboxContextMenu, handleCloseInboxContextMenu, handleDownloadInboxImage, handleAdDragOver, handleAdDragLeave, handleRemoveAdImage } = useProductMediaInbox({ sessionToken, adImage, setAdImage, setImageLightbox, setIsUploadingAdImage, setIsAdDragActive, isMobile, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxContextMenu, inboxUploadInputRef, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl, items, inboxList });

  const { handleFilesSelected, handleDropFiles, handleVariantFilesSelected, handleDragEnter, handleDragOver, handleDragLeave, handleOpenVariantPicker, handleOpenProductPicker, handleSetMainImage, handleOpenImageGroup, handleStepLightbox, handleCloseLightbox, handleSetVariantMainImage, handleToggleImagePublish, handleToggleVariantImagePublish, handleRemoveImage, handleRemoveVariantImage } = useProductImages({ sessionToken, isModalOpen, images, setImages, setVariantImages, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, setIsDraggingFiles, setIsInboxDragActive, variantUploadInputsRef, productUploadInputRef, dialogScrollRef, generateUploadUrl, items, openLightbox, uploadInboxImages });

  const { handleStartEdit, handleRowClick, handleCreateOrderFromProduct } = useProductEdit({ router, setIsModalOpen, setEditingProduct, setImages, setVariantImages, setAdImage, categoryMenuOpen, setCategoryMenuOpen, categoryDropdownRef, form, resetNewCategoryState });

  return (
    <div className="relative mx-auto space-y-6">
      {!isModalOpen && isInboxDragActive && (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/80 px-6 py-3 text-slate-800 shadow-2xl shadow-blue-500/25 ring-1 ring-white/70">
            <div className="rounded-full bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/40">
              <Images className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodas u inbox</p>
              <p className="text-xs text-slate-600">Fajlovi se dodaju u sekciju &quot;Slike za ubacivanje&quot;.</p>
            </div>
          </div>
        </div>
      )}
      {isModalOpen && isDraggingFiles && (
        <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/75 px-6 py-3 text-slate-800 shadow-2xl shadow-blue-500/25 ring-1 ring-white/70">
            <div className="rounded-full bg-blue-600 p-2.5 text-white shadow-md shadow-blue-500/40">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Otpusti slike da ih dodas</p>
              <p className="text-xs text-slate-600">Drop radi gde god da spustis fajlove dok je modal otvoren.</p>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Proizvodi</h1>
          <p className="text-sm text-slate-500">Klikni na red za detalje ili otvori modal za novi unos.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            {items.length} proizvoda
          </div>
          <Button onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Dodaj novi proizvod
          </Button>
        </div>
      </header>

      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsModalOpen(true);
            return;
          }
          requestCloseModal();
        }}
      >
        <DialogContent className="max-w-5xl overflow-hidden p-0">
          <div
            ref={dialogScrollRef}
            className="max-h-[85vh] overflow-y-auto px-6 pb-6 pt-4 space-y-4"
          >
            <DialogHeader className="space-y-1">
              <DialogTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</DialogTitle>
              <p className="text-sm text-slate-500">
                {editingProduct
                  ? `Trenutno menjas: ${editingProduct.kpName ?? editingProduct.name}`
                  : "Sacuvaj nabavnu i prodajnu cenu u evrima."}
              </p>
            </DialogHeader>

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

      <div className="mx-auto w-full max-w-4xl">
        <Card className="w-full">
        <CardHeader>
          <CardTitle>{editingProduct ? "Izmeni proizvod" : "Novi proizvod"}</CardTitle>
          {editingProduct && (
            <p className="text-sm text-slate-500">
              Trenutno menjas:{" "}
              <span className="font-medium text-slate-700">{editingProduct.kpName ?? editingProduct.name}</span>
            </p>
          )}
        </CardHeader>
        <CardContent>
          <Form form={form} onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="kpName"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>KP naziv (glavni na sajtu)</FormLabel>
                    <Input placeholder="npr. Samohodni trimer" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>FB / Insta naziv</FormLabel>
                    <Input placeholder="npr. Trimer za FB/IG objavu" {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
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
                    <FormLabel>KupujemProdajem opis</FormLabel>
                    <Textarea rows={3} placeholder="Opis za KP" autoResize {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                name="opisFbInsta"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>FB / Insta opis</FormLabel>
                    <Textarea rows={3} placeholder="Opis za drustvene mreze" autoResize {...field} />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
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
                      <input
                        id="publish-kp"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel htmlFor="publish-kp" className="m-0 flex items-center gap-2 cursor-pointer">
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
                      <input
                        id="publish-fb-profile"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-fb-profile"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
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
                      <input
                        id="publish-ig"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-ig"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
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
                      <input
                        id="publish-marketplace"
                        type="checkbox"
                        checked={!!field.value}
                        onChange={(event) => field.onChange(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <FormLabel
                        htmlFor="publish-marketplace"
                        className="m-0 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-800"
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
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              <FormField
                name="pickupAvailable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                    <input
                      id="pickup-available"
                      type="checkbox"
                      checked={!!field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <FormLabel htmlFor="pickup-available" className="m-0 cursor-pointer">
                      Licno preuzimanje
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                name="nabavnaCena"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Nabavna cena (EUR)</FormLabel>
                    <div className="space-y-2">
                      <Input
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
                      <FormMessage>{fieldState.error?.message}</FormMessage>
                    </div>
                  </FormItem>
                )}
              />
            <FormField
              name="prodajnaCena"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Prodajna cena (EUR)</FormLabel>
                    <Input
                      ref={field.ref}
                      name={field.name}
                      type="text"
                      inputMode="decimal"
                      placeholder="npr. 15.50"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      onBlur={field.onBlur}
                    />
                    <FormMessage>{fieldState.error?.message}</FormMessage>
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
                            <label className="flex items-center gap-2 font-medium text-slate-600">
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
                                      <label className="flex items-center gap-2 font-medium text-slate-600">
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
                {variantsError && normalizedVariants.length > 0 && (
                  <p className="text-sm text-red-600">{variantsError}</p>
                )}
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
                            <label className="flex items-center gap-2 font-medium text-slate-600">
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
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={requestCloseModal}>
                {editingProduct ? "Otkazi izmene" : "Ponisti"}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {editingProduct ? "Azuriraj" : "Sacuvaj"}
              </Button>
            </div>
          </Form>
        </CardContent>
        </Card>
      </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={exitConfirmOpen} onOpenChange={setExitConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Napusti formu?</DialogTitle>
            <DialogDescription>Imas nesacuvane izmene. Ako izadjes, izgubices uneto.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setExitConfirmOpen(false)}>
              Ostani
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setExitConfirmOpen(false);
                closeModal();
              }}
            >
              Napusti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showUtilityPanels ? (
        <div className="w-full max-w-[100vw]">
          <div className="grid w-full max-w-full gap-4 overflow-hidden lg:grid-cols-3">
            <div className="lg:col-span-1">
              <Card className="h-full w-full">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Dobavljaci</CardTitle>
                    <p className="text-sm text-slate-500">Dodaj ili obrisi dobavljace. Ne mozes obrisati vezane za proizvode.</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowUtilityPanels(false)}>
                    Sakrij
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={newSupplierName}
                      onChange={(event) => setNewSupplierName(event.target.value)}
                      placeholder="npr. Petrit"
                    />
                    <Button
                      type="button"
                      onClick={handleCreateSupplierEntry}
                      disabled={isCreatingSupplier || !newSupplierName.trim()}
                      className="gap-2"
                    >
                      {isCreatingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Dodaj
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {suppliers === undefined ? (
                      <p className="text-sm text-slate-500">Ucitavanje dobavljaca...</p>
                    ) : suppliers.length === 0 ? (
                      <p className="text-sm text-slate-500">Nema dobavljaca. Dodaj Petrit i Menad za pocetak.</p>
                    ) : (
                      suppliers.map((supplier) => {
                        const usageProducts = supplier.usage?.products ?? 0;
                        const usageOrders = supplier.usage?.orders ?? 0;
                        const isLocked = usageProducts > 0 || usageOrders > 0;
                        return (
                          <div
                            key={supplier._id}
                            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 shadow-sm"
                          >
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{supplier.name}</p>
                              <p className="text-xs text-slate-500">
                                Proizvodi: {usageProducts} | Narudzbine: {usageOrders}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLocked ? <Badge variant="secondary">Vezan</Badge> : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={isLocked}
                                onClick={() => handleRemoveSupplierEntry(supplier._id, supplier.usage)}
                              >
                                Obrisi
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full w-full">
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>Slike za ubacivanje</CardTitle>
                    <p className="text-sm text-slate-500">Privremeni inbox za slike proizvoda koji tek treba da se dodaju.</p>
                  </div>
                  <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <div className="inline-flex flex-wrap items-center gap-1 rounded-3xl lg:rounded-full border border-slate-200 bg-slate-50 p-1 shadow-sm">
                      <Button
                        type="button"
                        variant={inboxView === "withPurchasePrice" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full px-3 w-full lg:w-auto"
                        onClick={() => setInboxView("withPurchasePrice")}
                      >
                        Sa nabavnom {inboxWithPriceCount ? `(${inboxWithPriceCount})` : ""}
                      </Button>
                      <Button
                        type="button"
                        variant={inboxView === "withoutPurchasePrice" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full px-3 w-full lg:w-auto"
                        onClick={() => setInboxView("withoutPurchasePrice")}
                      >
                        Bez nabavne {inboxWithoutPriceCount ? `(${inboxWithoutPriceCount})` : ""}
                      </Button>
                      <Button
                        type="button"
                        variant={inboxView === "skip" ? "default" : "ghost"}
                        size="sm"
                        className="rounded-full px-3 w-full lg:w-auto"
                        onClick={() => setInboxView("skip")}
                      >
                        Ne ubacivati {inboxSkipCount ? `(${inboxSkipCount})` : ""}
                      </Button>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowUtilityPanels(false)}>
                      Sakrij
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-slate-600">
                      Dodaj vise slika, pregledaj ih u punoj velicini i obrisi kada ih povezes sa proizvodom. Trenutno gledas{" "}
                      {inboxView === "withPurchasePrice"
                        ? "slike sa nabavnom cenom."
                        : inboxView === "withoutPurchasePrice"
                          ? "slike bez nabavne cene."
                          : "slike oznacene da se ne ubacuju."}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        ref={inboxUploadInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={handleInboxFilesSelected}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2"
                        onClick={() => inboxUploadInputRef.current?.click()}
                        disabled={isUploadingInboxImages}
                      >
                        {isUploadingInboxImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                        Dodaj slike
                      </Button>
                    </div>
                  </div>
                  {inboxImages === undefined ? (
                    <p className="text-sm text-slate-500">Ucitavanje slika...</p>
                  ) : inboxList.length === 0 ? (
                    <p className="text-sm text-slate-500">{inboxEmptyMessage}</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {inboxList.map((image, index) => {
                        const safeUrl = image.url ?? "";
                        return (
                          <div
                            key={image._id}
                            className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50 shadow-sm"
                            onContextMenu={(event) => handleInboxContextMenu(event, image._id)}
                          >
                            <button
                              type="button"
                              className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition hover:bg-white md:hidden"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleInboxContextMenu(event, image._id);
                              }}
                              aria-label="Opcije slike"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={safeUrl}
                              alt={image.fileName ?? "Inbox slika"}
                              className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                            />
                            <div
                              className="absolute inset-0 flex cursor-pointer flex-col justify-between bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity focus:opacity-100 focus-within:opacity-100 group-hover:opacity-100"
                              role="button"
                              tabIndex={0}
                              aria-label="Otvori pregled slike"
                              onClick={() => handleOpenInboxPreview(index)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                  event.preventDefault();
                                  handleOpenInboxPreview(index);
                                }
                              }}
                            >
                              <div className="flex items-center justify-end gap-1 p-2">
                                {safeUrl ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full bg-white/95 p-1 text-slate-700 shadow hover:bg-white"
                                    title="Preuzmi"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      void handleDownloadInboxImage(safeUrl, image.fileName);
                                    }}
                                    onKeyDown={(event) => event.stopPropagation()}
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center rounded-full bg-white/95 p-1 text-red-600 shadow hover:bg-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteInboxImage(image._id);
                                  }}
                                  onKeyDown={(event) => event.stopPropagation()}
                                  title="Obrisi"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="flex items-center justify-center gap-2 pb-3 text-sm font-semibold text-white drop-shadow">
                                <Images className="h-5 w-5" />
                                <span>Klik za pregled</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paneli</span>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowUtilityPanels(true)}>
            <UserRound className="h-4 w-4" />
            Dobavljaci {supplierCount ? `(${supplierCount})` : ""}
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={() => setShowUtilityPanels(true)}>
            <Images className="h-4 w-4" />
            Slike {inboxTotalCount ? `(${inboxTotalCount})` : ""}
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              Lista proizvoda (
              {hasProductSearch ? `${sortedProducts.length} od ${productPagination.total}` : productPagination.total || items.length}
              )
            </CardTitle>
            <p className="text-sm text-slate-500">
              {viewMode === "list"
                ? "Klikni na red da otvoris pregled proizvoda."
                : "Klikni na karticu da otvoris pregled proizvoda."}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
            <div className="flex flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-2">
              <div className="relative w-full md:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={productSearch}
                  onChange={(event) => {
                    setProductSearch(event.target.value);
                    resetProductsFeed();
                  }}
                  placeholder="Pretrazi proizvode"
                  className="pl-9"
                  aria-label="Pretraga proizvoda"
                />
              </div>
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as SortOption);
                  resetProductsFeed();
                }}
              >
                <SelectTrigger className="md:w-56 text-slate-100" aria-label="Sortiranje proizvoda">
                  <SelectValue className="text-slate-100 data-placeholder:text-slate-400" placeholder="Sortiraj" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_desc">Najnovije</SelectItem>
                  <SelectItem value="price_desc">Cena (vise prvo)</SelectItem>
                  <SelectItem value="price_asc">Cena (manje prvo)</SelectItem>
                  <SelectItem value="sales_desc">Najvise prodaja</SelectItem>
                  <SelectItem value="profit_desc">Najveci profit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <Button
                type="button"
                variant={archiveView === "active" ? "default" : "ghost"}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setArchiveView("active")}
              >
                Aktivni
              </Button>
              <Button
                type="button"
                variant={archiveView === "archived" ? "default" : "ghost"}
                size="sm"
                className="rounded-full px-3"
                onClick={() => setArchiveView("archived")}
              >
                Arhiva
              </Button>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          {sortedProducts.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
              {emptyProductsMessage}
            </div>
          ) : viewMode === "list" && !isMobile ? (
            <div className="space-y-2">
              {visibleProducts.map((product) => {
                const mainImage = getMainImage(product);
                const productCategories = (product.categoryIds ?? [])
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean) as Category[];
                const isVariantProduct = (product.variants ?? []).length > 0;
                const hasSocialImage = hasSocialMainImage(product);
                const hasFacebookTarget = Boolean(product.publishMarketplace || product.publishFbProfile);
                const hasSocialTargets = Boolean(product.publishIg || hasFacebookTarget);
                const salesCount = getSalesCount(product);
                const bestSupplier = getBestSupplier(product);
                const isArchived = Boolean(product.archivedAt);
                return (
                  <div
                    key={product._id}
                    className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                    onClick={() => handleRowClick(product._id)}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                        {mainImage?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mainImage.url} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                            Bez slike
                          </div>
                        )}
                        {isVariantProduct ? (
                          <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                            <Layers className="h-3 w-3" />
                            Tipski
                          </span>
                        ) : null}
                        {hasSocialImage ? (
                          <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow">
                            <Share2 className="h-3 w-3 text-blue-600" />
                            Social
                          </span>
                        ) : null}
                        {hasSocialTargets ? (
                          <div className="absolute bottom-1 right-1 flex gap-1">
                            {product.publishIg ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                <Instagram className="h-3 w-3" />
                                IG
                              </span>
                            ) : null}
                            {hasFacebookTarget ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                                <Facebook className="h-3 w-3" />
                                FB
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-slate-900">{product.kpName ?? product.name}</p>
                          <ArrowUpRight className="h-4 w-4 text-slate-400" />
                        </div>
                        {productCategories.length ? (
                          <div className="flex flex-wrap gap-1">
                            {productCategories.slice(0, 3).map((category) => (
                              <span
                                key={category._id}
                                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                              >
                                <Tag className="h-3 w-3 text-slate-500" />
                                {category.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
                            {getDisplayPrice(product)}
                          </span>
                          {bestSupplier ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow ring-1 ring-emerald-100">
                              {formatCurrency(bestSupplier.price, "EUR")}
                              {bestSupplier.supplierName ? (
                                <span className="text-[10px] font-medium text-emerald-700/90">- {bestSupplier.supplierName}</span>
                              ) : null}
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            Prodato: {salesCount}
                          </span>
                          {isArchived ? <Badge variant="yellow">Arhiva</Badge> : null}
                          {isVariantProduct ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                              <Layers className="h-3.5 w-3.5" />
                              Tipovi
                            </span>
                          ) : null}
                          {product.pickupAvailable ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                              <UserRound className="h-3.5 w-3.5" />
                              Licno
                            </span>
                          ) : null}
                          {product.publishIg ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
                              <Instagram className="h-3.5 w-3.5" />
                              IG
                            </span>
                          ) : null}
                          {hasFacebookTarget ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                              <Facebook className="h-3.5 w-3.5" />
                              FB
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleStartEdit(product);
                          }}
                        >
                          Izmeni
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleArchive(product, !isArchived);
                          }}
                        >
                          {isArchived ? "Vrati" : "Arhiviraj"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(product._id);
                          }}
                        >
                          Obrisi trajno
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleProducts.map((product) => {
                const mainImage = getMainImage(product);
                const productCategories = (product.categoryIds ?? [])
                  .map((id) => categoryMap.get(id))
                  .filter(Boolean) as Category[];
                const isVariantProduct = (product.variants ?? []).length > 0;
                const hasSocialImage = hasSocialMainImage(product);
                const hasFacebookTarget = Boolean(product.publishMarketplace || product.publishFbProfile);
                const salesCount = getSalesCount(product);
                const bestSupplier = getBestSupplier(product);
                const isArchived = Boolean(product.archivedAt);
                return (
                  <div
                    key={product._id}
                    role="button"
                    tabIndex={0}
                    className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                    onClick={() => handleRowClick(product._id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleRowClick(product._id);
                      }
                    }}
                  >
                    <button
                      type="button"
                      className="absolute left-1/2 top-1/2 z-30 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg opacity-0 transition group-hover:opacity-100 group-hover:shadow-xl group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleCreateOrderFromProduct(product);
                      }}
                    >
                      <ShoppingBag className="h-4 w-4 text-slate-800" />
                      Nova narudzbina
                    </button>
                    {mainImage?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mainImage.url}
                        alt={product.kpName ?? product.name}
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:blur-[1px]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Bez slike
                      </div>
                    )}
                    <div className="absolute inset-0 z-0 bg-black/35" />
                    <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-2">
                      <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-slate-900 shadow">
                        {getDisplayPrice(product)}
                      </span>
                      {bestSupplier ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow">
                          {formatCurrency(bestSupplier.price, "EUR")} {bestSupplier.supplierName ? `(${bestSupplier.supplierName})` : ""}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                        <ShoppingBag className="h-4 w-4" />
                        Prodato: {salesCount}
                      </span>
                      {hasSocialImage ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                          <Share2 className="h-4 w-4 text-blue-600" />
                          Social
                        </span>
                      ) : null}
                    </div>
                    {isVariantProduct || isArchived ? (
                      <div className="absolute left-2 top-2 z-20 flex flex-col gap-2">
                        {isVariantProduct ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold text-white shadow-lg">
                            <Layers className="h-5 w-5" />
                            Tipski
                          </span>
                        ) : null}
                        {isArchived ? (
                          <Badge variant="yellow" className="shadow">
                            Arhiva
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                    {product.pickupAvailable ? (
                      <span className="absolute left-2 bottom-2 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow">
                        <UserRound className="h-4 w-4" />
                        Licno
                      </span>
                    ) : null}
                    <div className="absolute right-2 bottom-2 z-30 flex gap-2">
                      {product.publishIg ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_0_16px_rgba(244,114,182,0.55)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                          <Instagram className="h-5 w-5 drop-shadow-[0_0_8px_rgba(244,114,182,0.55)]" />
                        </span>
                      ) : null}
                      {hasFacebookTarget ? (
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_16px_rgba(37,99,235,0.5)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                          <Facebook className="h-5 w-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                        </span>
                      ) : null}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pr-16 pb-6 pt-10 text-left">
                      {productCategories.length > 0 ? (
                        <div className="mb-1 flex flex-wrap gap-1 text-[11px] font-semibold text-slate-200 -translate-y-6">
                          {productCategories.slice(0, 2).map((category) => (
                            <span key={category._id} className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-start gap-2 -translate-y-6">
                        <p className="w-full wrap-break-word text-sm font-semibold leading-snug text-white">{product.kpName ?? product.name}</p>
                        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {sortedProducts.length > 0 ? (
            <div ref={productsLoaderRef} className="flex justify-center">
              <LoadingDots show={isLoadingMoreProducts && hasMoreProducts} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      {inboxContextMenu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={handleCloseInboxContextMenu} />
          <div
            className="fixed z-50 min-w-[190px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg shadow-slate-400/30"
            style={{ top: inboxContextMenu.y, left: inboxContextMenu.x }}
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => handleMoveInboxImage(inboxContextMenu.imageId, "withoutPurchasePrice")}
            >
              <Images className="h-4 w-4 text-slate-500" />
              Prebaci u &quot;Bez nabavne&quot;
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={() => handleMoveInboxImage(inboxContextMenu.imageId, "skip")}
            >
              <X className="h-4 w-4" />
              Prebaci u &quot;Ne ubacivati&quot;
            </button>
          </div>
        </>
      ) : null}

      {imageLightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={handleCloseLightbox}
        >
          {(() => {
            const item = imageLightbox.items[imageLightbox.index];
            const showDownload = Boolean(item?.downloadUrl);
            const showDelete = Boolean(item?.deleteId);
            if (!showDownload && !showDelete) return null;
            return (
              <div className="absolute right-4 top-4 z-50 flex items-center gap-2">
                {showDownload ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDownloadInboxImage(item?.downloadUrl, item?.downloadName);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Preuzmi
                  </Button>
                ) : null}
                {showDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (item?.deleteId) {
                        void handleDeleteInboxImage(item.deleteId);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Obrisi
                  </Button>
                ) : null}
              </div>
            );
          })()}
          <div
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-black/40 p-3 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
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

