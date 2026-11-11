"use client";


import { useState } from "react";
import { Archive, ArchiveRestore, ArrowUpRight, Pencil, ShoppingCart, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequireAuth } from "@/components/RequireAuth";
import { useIsDesktop } from "@/lib/useMediaQuery";
import type { Category, Product } from "@/types/order";
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
import { useEditFromUrl } from "./_hooks/useEditFromUrl";
import { InboxDropOverlay } from "./_components/InboxDropOverlay";
import { FormDropOverlay } from "./_components/FormDropOverlay";
import { ProductsPageHeader } from "./_components/ProductsPageHeader";
import { ProductFormDialog } from "./_components/ProductFormDialog";
import { ProductExitConfirm } from "./_components/ProductExitConfirm";
import { ProductPanels } from "./_components/ProductPanels";
import { ProductsCatalog } from "./_components/list/ProductsCatalog";
import type { ProductListApi } from "./_components/list/productListApi";
import { writeProductsViewPref } from "./_lib/productHelpers";
import { InboxContextMenu } from "./_components/InboxContextMenu";
import { ImageLightbox } from "./_components/ImageLightbox";

export default function ProductsPage() {
  return (
    <RequireAuth>
      <ProductsContent />
    </RequireAuth>
  );
}

function ProductsContent() {
  const { restore, router, pathname, searchParams, searchQuery, sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isDraggingFiles, setIsDraggingFiles, isAdDragActive, setIsAdDragActive, isInboxDragActive, setIsInboxDragActive, viewMode, setViewMode, archiveView, setArchiveView, setIsMobile, sortBy, setSortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isCreatingCategory, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, hasSeededCategories, setHasSeededCategories, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, hasSeededSuppliers, setHasSeededSuppliers, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxView, inboxContextMenu, setInboxContextMenu, showSupplierForm, setShowSupplierForm, variantUploadInputsRef, productUploadInputRef, adImageInputRef, inboxUploadInputRef, categoryIconInputRef, categoryDropdownRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, didRestoreRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, fileInputId, adUploadInputId, hiddenFileInputStyle, productList, productStats, createProduct, updateProduct, removeProduct, setProductArchived, categories, suppliers, inboxImages, createCategory, removeCategory, ensureDefaultCategories, createSupplier, removeSupplier, ensureDefaultSuppliers, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl } = useProductsState();

  const { resetProductsFeed, hasMoreProducts } = useProductsFeed({ restore, router, pathname, searchParams, searchQuery, sessionToken, viewMode, setViewMode, archiveView, setArchiveView, sortBy, setSortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, didRestoreRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, productList });

  const { form, categoryIds, supplierOffersField, publishIgSelected, resolvedProductType, normalizedVariants, normalizedSupplierOffers, supplierMap, bestSupplierForVariant, hasSupplierOffers } = useProductFormState({ sessionToken, setIsMobile, hasSeededCategories, setHasSeededCategories, hasSeededSuppliers, setHasSeededSuppliers, setShowSupplierForm, categories, suppliers, ensureDefaultCategories, ensureDefaultSuppliers });

  const { buildModalSnapshot, closeModal, openCreateModal, requestCloseModal, handleSubmit } = useProductFormSubmit({ sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, setIsUploadingAdImage, setIsDraggingFiles, setIsAdDragActive, categorySearch, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsUploadingCategoryIcon, variantUploadInputsRef, modalSnapshotRef, createProduct, updateProduct, resetProductsFeed, form });

  const { handleArchive, handleDelete, handleCreateSupplierEntry, handleRemoveSupplierEntry } = useProductAdminActions({ sessionToken, editingProduct, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, removeProduct, setProductArchived, createSupplier, removeSupplier, resetProductsFeed, closeModal });
  const { resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory } = useProductCategories({ sessionToken, setImageLightbox, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, createCategory, removeCategory, generateUploadUrl, form });

  const { categoryMap, filteredCategories, selectedCategories, variantsError, getBestSupplier, getMainImage, getSalesCount, sortedProducts, defaultVariantEntry, bestFormOffer, bestFormSupplierName, inboxWithPriceCount, inboxWithoutPriceCount, inboxSkipCount, inboxList, supplierCount, inboxTotalCount, inboxEmptyMessage, getPrimaryVariant, getProductPrice, getProfit } = useProductsView({ archiveView, sortBy, productSearch, productFeed, categorySearch, inboxView, inboxContextMenu, setInboxContextMenu, productStats, categories, suppliers, inboxImages, form, categoryIds, resolvedProductType, normalizedVariants, supplierMap, bestSupplierForVariant });

  const { handleProductTypeChange, handleAddVariant, handleAddVariantFromSingle, handleRemoveVariant, handleSetDefaultVariant, handleClearVariants, handleAddSupplierOffer, handleUpdateSupplierOffer, handleRemoveSupplierOffer } = useProductFormFields({ isModalOpen, setExitConfirmOpen, setVariantImages, variantUploadInputsRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, suppliers, form, resolvedProductType, hasSupplierOffers, buildModalSnapshot, bestFormOffer });

  const { openLightbox, handleAdImageChange, handleAdDrop, uploadInboxImages, handleInboxFilesSelected, handleDeleteInboxImage, handleMoveInboxImage, handleOpenInboxPreview, handleInboxContextMenu, handleCloseInboxContextMenu, handleDownloadInboxImage, handleAdDragOver, handleAdDragLeave, handleRemoveAdImage } = useProductMediaInbox({ sessionToken, adImage, setAdImage, setImageLightbox, setIsUploadingAdImage, setIsAdDragActive, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxContextMenu, inboxUploadInputRef, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl, inboxList });

  const { handleFilesSelected, handleDropFiles, handleVariantFilesSelected, handleDragEnter, handleDragOver, handleDragLeave, handleOpenVariantPicker, handleOpenProductPicker, handleSetMainImage, handleOpenImageGroup, handleStepLightbox, handleCloseLightbox, handleSetVariantMainImage, handleToggleImagePublish, handleToggleVariantImagePublish, handleRemoveImage, handleRemoveVariantImage } = useProductImages({ sessionToken, isModalOpen, images, setImages, setVariantImages, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, setIsDraggingFiles, setIsInboxDragActive, variantUploadInputsRef, productUploadInputRef, dialogScrollRef, generateUploadUrl, openLightbox, uploadInboxImages });

  const { handleStartEdit, handleRowClick, handleCreateOrderFromProduct } = useProductEdit({ router, setIsModalOpen, setEditingProduct, setImages, setVariantImages, setAdImage, categoryMenuOpen, setCategoryMenuOpen, categoryDropdownRef, form, resetNewCategoryState });

  useEditFromUrl({ sessionToken, searchParams, pathname, router, isModalOpen, handleStartEdit });
  const isDesktop = useIsDesktop();
  const [openPanel, setOpenPanel] = useState<"dobavljaci" | "slike" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const listApi: ProductListApi = {
    getName: (product) => product.kpName || product.name,
    getPrice: getProductPrice,
    getPurchase: (product) => {
      const best = getBestSupplier(product);
      if (best) return { price: best.price, supplierName: best.supplierName };
      return { price: getPrimaryVariant(product)?.nabavnaCena ?? product.nabavnaCena };
    },
    getSold: getSalesCount,
    getProfit,
    getImageUrl: (product) => getMainImage(product)?.url ?? undefined,
    getCategories: (product) => (product.categoryIds ?? []).map((id) => categoryMap.get(id)).filter((category): category is Category => Boolean(category)),
    menuFor: (product) => [
      { label: "Otvori", icon: ArrowUpRight, href: `/proizvodi/${product._id}` },
      { label: "Izmeni", icon: Pencil, onSelect: () => handleStartEdit(product) },
      { label: "Nova narudžbina", icon: ShoppingCart, disabled: Boolean(product.archivedAt), onSelect: () => handleCreateOrderFromProduct(product) },
      product.archivedAt
        ? { label: "Vrati iz arhive", icon: ArchiveRestore, separatorBefore: true, onSelect: () => void handleArchive(product, false) }
        : { label: "Arhiviraj", icon: Archive, separatorBefore: true, onSelect: () => void handleArchive(product, true) },
      { label: "Obriši trajno", icon: Trash2, destructive: true, onSelect: () => setDeleteTarget(product) },
    ],
  };

  return (
    <div className="relative mx-auto max-w-7xl space-y-4 md:space-y-6">
      <InboxDropOverlay isModalOpen={isModalOpen} isInboxDragActive={isInboxDragActive} />
      <FormDropOverlay isModalOpen={isModalOpen} isDraggingFiles={isDraggingFiles} />
      <ProductsPageHeader total={productPagination.total} supplierCount={supplierCount} inboxCount={inboxTotalCount} onCreate={openCreateModal} onOpenPanel={setOpenPanel} />
      <ProductFormDialog isKodMajstor={isKodMajstor} isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} editingProduct={editingProduct} images={images} variantImages={variantImages} adImage={adImage} isUploadingImages={isUploadingImages} isUploadingAdImage={isUploadingAdImage} isDraggingFiles={isDraggingFiles} isAdDragActive={isAdDragActive} categorySearch={categorySearch} setCategorySearch={setCategorySearch} categoryMenuOpen={categoryMenuOpen} setCategoryMenuOpen={setCategoryMenuOpen} isAddingCategory={isAddingCategory} setIsAddingCategory={setIsAddingCategory} newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName} newCategoryIcon={newCategoryIcon} isCreatingCategory={isCreatingCategory} isUploadingCategoryIcon={isUploadingCategoryIcon} showSupplierForm={showSupplierForm} setShowSupplierForm={setShowSupplierForm} variantUploadInputsRef={variantUploadInputsRef} productUploadInputRef={productUploadInputRef} adImageInputRef={adImageInputRef} categoryIconInputRef={categoryIconInputRef} categoryDropdownRef={categoryDropdownRef} dialogScrollRef={dialogScrollRef} fileInputId={fileInputId} adUploadInputId={adUploadInputId} hiddenFileInputStyle={hiddenFileInputStyle} categories={categories} suppliers={suppliers} form={form} categoryIds={categoryIds} supplierOffersField={supplierOffersField} publishIgSelected={publishIgSelected} resolvedProductType={resolvedProductType} normalizedVariants={normalizedVariants} normalizedSupplierOffers={normalizedSupplierOffers} supplierMap={supplierMap} hasSupplierOffers={hasSupplierOffers} requestCloseModal={requestCloseModal} handleSubmit={handleSubmit} resetNewCategoryState={resetNewCategoryState} handleSelectCategory={handleSelectCategory} handleRemoveCategory={handleRemoveCategory} handleCategoryIconChange={handleCategoryIconChange} handleCategoryIconDrop={handleCategoryIconDrop} handleCreateCategory={handleCreateCategory} handleRequestDeleteCategory={handleRequestDeleteCategory} filteredCategories={filteredCategories} selectedCategories={selectedCategories} variantsError={variantsError} defaultVariantEntry={defaultVariantEntry} bestFormOffer={bestFormOffer} bestFormSupplierName={bestFormSupplierName} handleProductTypeChange={handleProductTypeChange} handleAddVariant={handleAddVariant} handleAddVariantFromSingle={handleAddVariantFromSingle} handleRemoveVariant={handleRemoveVariant} handleSetDefaultVariant={handleSetDefaultVariant} handleClearVariants={handleClearVariants} handleAddSupplierOffer={handleAddSupplierOffer} handleUpdateSupplierOffer={handleUpdateSupplierOffer} handleRemoveSupplierOffer={handleRemoveSupplierOffer} handleAdImageChange={handleAdImageChange} handleAdDrop={handleAdDrop} handleAdDragOver={handleAdDragOver} handleAdDragLeave={handleAdDragLeave} handleRemoveAdImage={handleRemoveAdImage} handleFilesSelected={handleFilesSelected} handleDropFiles={handleDropFiles} handleVariantFilesSelected={handleVariantFilesSelected} handleDragEnter={handleDragEnter} handleDragOver={handleDragOver} handleDragLeave={handleDragLeave} handleOpenVariantPicker={handleOpenVariantPicker} handleOpenProductPicker={handleOpenProductPicker} handleSetMainImage={handleSetMainImage} handleOpenImageGroup={handleOpenImageGroup} handleSetVariantMainImage={handleSetVariantMainImage} handleToggleImagePublish={handleToggleImagePublish} handleToggleVariantImagePublish={handleToggleVariantImagePublish} handleRemoveImage={handleRemoveImage} handleRemoveVariantImage={handleRemoveVariantImage} />
      <ProductExitConfirm exitConfirmOpen={exitConfirmOpen} setExitConfirmOpen={setExitConfirmOpen} closeModal={closeModal} />

      <ProductPanels newSupplierName={newSupplierName} setNewSupplierName={setNewSupplierName} isCreatingSupplier={isCreatingSupplier} isUploadingInboxImages={isUploadingInboxImages} inboxView={inboxView} setInboxView={setInboxView} openPanel={openPanel} setOpenPanel={setOpenPanel} inboxUploadInputRef={inboxUploadInputRef} suppliers={suppliers} inboxImages={inboxImages} handleCreateSupplierEntry={handleCreateSupplierEntry} handleRemoveSupplierEntry={handleRemoveSupplierEntry} inboxWithPriceCount={inboxWithPriceCount} inboxWithoutPriceCount={inboxWithoutPriceCount} inboxSkipCount={inboxSkipCount} inboxList={inboxList} supplierCount={supplierCount} inboxTotalCount={inboxTotalCount} inboxEmptyMessage={inboxEmptyMessage} handleInboxFilesSelected={handleInboxFilesSelected} handleDeleteInboxImage={handleDeleteInboxImage} handleOpenInboxPreview={handleOpenInboxPreview} handleInboxContextMenu={handleInboxContextMenu} handleDownloadInboxImage={handleDownloadInboxImage} />

      <ProductsCatalog
        products={sortedProducts}
        api={listApi}
        total={productPagination.total}
        isDesktop={isDesktop}
        isLoading={productList === undefined}
        isLoadingMore={isLoadingMoreProducts}
        hasMore={hasMoreProducts}
        loaderRef={productsLoaderRef}
        search={productSearch}
        onSearch={(value) => {
          setProductSearch(value);
          resetProductsFeed();
        }}
        sortBy={sortBy}
        onSort={(value) => {
          setSortBy(value);
          resetProductsFeed();
        }}
        archiveView={archiveView}
        onArchiveView={setArchiveView}
        viewMode={viewMode}
        onViewMode={(value) => {
          setViewMode(value);
          writeProductsViewPref(value);
        }}
        onOpen={(product) => handleRowClick(product._id)}
        onCreate={openCreateModal}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        tone="danger"
        title="Trajno obrisati proizvod?"
        description={deleteTarget ? `${deleteTarget.kpName || deleteTarget.name}. Brisanje je trajno; arhiviranje ga samo sklanja iz liste.` : undefined}
        confirmLabel="Obriši trajno"
        onConfirm={async () => {
          if (!deleteTarget) return;
          // Neuspeh ostavlja dijalog otvoren (greška je već u toast-u).
          if (!(await handleDelete(deleteTarget._id))) throw new Error("Brisanje nije uspelo.");
          setDeleteTarget(null);
        }}
      />

      <InboxContextMenu inboxContextMenu={inboxContextMenu} handleMoveInboxImage={handleMoveInboxImage} handleCloseInboxContextMenu={handleCloseInboxContextMenu} />
      <ImageLightbox imageLightbox={imageLightbox} handleDeleteInboxImage={handleDeleteInboxImage} handleDownloadInboxImage={handleDownloadInboxImage} handleStepLightbox={handleStepLightbox} handleCloseLightbox={handleCloseLightbox} />
    </div>
  );
}

