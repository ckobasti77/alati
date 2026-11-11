"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, } from "@/components/ui/card";
import { RequireAuth } from "@/components/RequireAuth";
import { useProductDetailState } from "./_hooks/useProductDetailState";
import { useProductDetailShare } from "./_hooks/useProductDetailShare";
import { useProductDetailMeta } from "./_hooks/useProductDetailMeta";
import { useProductDetailUpdate } from "./_hooks/useProductDetailUpdate";
import { useProductSupplierOffers } from "./_hooks/useProductSupplierOffers";
import { useProductDetailCategories } from "./_hooks/useProductDetailCategories";
import { useProductDetailFields } from "./_hooks/useProductDetailFields";
import { useProductGalleryManager } from "./_hooks/useProductGalleryManager";
import { DetailShareDialog } from "./_components/DetailShareDialog";
import { DetailToolbar } from "./_components/DetailToolbar";
import { ProductOrdersCard } from "./_components/ProductOrdersCard";
import { GallerySection } from "./_components/GallerySection";
import { InfoSection } from "./_components/InfoSection";
import { VariantsCard } from "./_components/VariantsCard";
import { DeleteCategoryDialog } from "./_components/DeleteCategoryDialog";
import { DetailLightbox } from "./_components/DetailLightbox";

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
      <DetailShareDialog shareOpen={shareOpen} setShareOpen={setShareOpen} canShare={canShare} handleCopyShareLink={handleCopyShareLink} handleShareLink={handleShareLink} />
      <DetailToolbar router={router} productId={productId} handleBack={handleBack} product={product} setShareOpen={setShareOpen} />

      <ProductOrdersCard productOrders={productOrders} product={product} />

      <GallerySection uploadInputId={uploadInputId} adUploadInputId={adUploadInputId} product={product} isUploadingImages={isUploadingImages} isUploadingAdImage={isUploadingAdImage} imageUploadTarget={imageUploadTarget} setImageUploadTarget={setImageUploadTarget} adImageInputRef={adImageInputRef} dragOverId={dragOverId} reorderEditingId={reorderEditingId} reorderInputValue={reorderInputValue} setReorderInputValue={setReorderInputValue} uploadTargetLabel={uploadTargetLabel} handleRemoveAllImages={handleRemoveAllImages} handleAdImageChange={handleAdImageChange} handleRemoveAdImage={handleRemoveAdImage} handleRemoveSingleImage={handleRemoveSingleImage} handleSetAsMain={handleSetAsMain} handleImagePublishToggle={handleImagePublishToggle} touchDragActiveRef={touchDragActiveRef} handleGalleryDragStart={handleGalleryDragStart} handleGalleryTouchStart={handleGalleryTouchStart} handleGalleryTouchMove={handleGalleryTouchMove} handleGalleryTouchEnd={handleGalleryTouchEnd} handleGalleryDragOver={handleGalleryDragOver} handleGalleryDrop={handleGalleryDrop} handleGalleryDragEnd={handleGalleryDragEnd} handleGalleryTouchCancel={handleGalleryTouchCancel} handleGalleryDragLeave={handleGalleryDragLeave} getGalleryGroup={getGalleryGroup} handleOpenReorderInput={handleOpenReorderInput} handleCancelReorderInput={handleCancelReorderInput} handleConfirmReorderInput={handleConfirmReorderInput} getShiftClass={getShiftClass} handleGalleryDropZoneDragEnter={handleGalleryDropZoneDragEnter} handleGalleryDropZoneDragOver={handleGalleryDropZoneDragOver} handleGalleryDropZoneDragLeave={handleGalleryDropZoneDragLeave} handleGalleryDropZoneDrop={handleGalleryDropZoneDrop} handleAdDropZoneDragEnter={handleAdDropZoneDragEnter} handleAdDropZoneDragOver={handleAdDropZoneDragOver} handleAdDropZoneDragLeave={handleAdDropZoneDragLeave} handleAdDropZoneDrop={handleAdDropZoneDrop} handleFilesSelected={handleFilesSelected} handleDownloadImage={handleDownloadImage} gallery={gallery} filteredGallery={filteredGallery} handleOpenPreview={handleOpenPreview} draggingSameGroup={draggingSameGroup} showGalleryDropOverlay={showGalleryDropOverlay} showAdDropOverlay={showAdDropOverlay} />

      <InfoSection isKodMajstor={isKodMajstor} categories={categories} suppliers={suppliers} product={product} publishing={publishing} categorySearch={categorySearch} setCategorySearch={setCategorySearch} categoryMenuOpen={categoryMenuOpen} setCategoryMenuOpen={setCategoryMenuOpen} isAddingCategory={isAddingCategory} setIsAddingCategory={setIsAddingCategory} newCategoryName={newCategoryName} setNewCategoryName={setNewCategoryName} newCategoryIcon={newCategoryIcon} isUploadingCategoryIcon={isUploadingCategoryIcon} isCreatingCategory={isCreatingCategory} supplierMap={supplierMap} supplierEdits={supplierEdits} showAddSupplierForm={showAddSupplierForm} setShowAddSupplierForm={setShowAddSupplierForm} newSupplierId={newSupplierId} setNewSupplierId={setNewSupplierId} newSupplierVariantId={newSupplierVariantId} setNewSupplierVariantId={setNewSupplierVariantId} newSupplierPrice={newSupplierPrice} setNewSupplierPrice={setNewSupplierPrice} isSavingSupplierOffer={isSavingSupplierOffer} categoryIconInputRef={categoryIconInputRef} categoryDropdownRef={categoryDropdownRef} productCategories={productCategories} filteredCategories={filteredCategories} variantMap={variantMap} supplierOffers={supplierOffers} bestSupplierOffer={bestSupplierOffer} supplierOfferKey={supplierOfferKey} handleSupplierPriceChange={handleSupplierPriceChange} handleSupplierPriceSave={handleSupplierPriceSave} handleAddSupplierOffer={handleAddSupplierOffer} handleRemoveSupplierOffer={handleRemoveSupplierOffer} resetNewCategoryState={resetNewCategoryState} handleSelectCategory={handleSelectCategory} handleRemoveCategory={handleRemoveCategory} handleCategoryIconChange={handleCategoryIconChange} handleCategoryIconDrop={handleCategoryIconDrop} handleCreateCategory={handleCreateCategory} handleRequestDeleteCategory={handleRequestDeleteCategory} handleBaseFieldSave={handleBaseFieldSave} handlePublishToggle={handlePublishToggle} publishNow={publishNow} handleBasePurchaseRealityToggle={handleBasePurchaseRealityToggle} baseNabavnaIsReal={baseNabavnaIsReal} hasVariants={hasVariants} />

      <VariantsCard product={product} isAddingVariant={isAddingVariant} isSavingVariant={isSavingVariant} newVariantLabel={newVariantLabel} setNewVariantLabel={setNewVariantLabel} newVariantOpis={newVariantOpis} setNewVariantOpis={setNewVariantOpis} newVariantNabavna={newVariantNabavna} setNewVariantNabavna={setNewVariantNabavna} newVariantProdajna={newVariantProdajna} setNewVariantProdajna={setNewVariantProdajna} newVariantIsDefault={newVariantIsDefault} setNewVariantIsDefault={setNewVariantIsDefault} newVariantNabavnaIsReal={newVariantNabavnaIsReal} setNewVariantNabavnaIsReal={setNewVariantNabavnaIsReal} handleVariantFieldSave={handleVariantFieldSave} handleVariantPurchaseRealityToggle={handleVariantPurchaseRealityToggle} handleStartAddVariant={handleStartAddVariant} handleCancelAddVariant={handleCancelAddVariant} handleCreateVariant={handleCreateVariant} baseNabavnaIsReal={baseNabavnaIsReal} hasVariants={hasVariants} />

      <DeleteCategoryDialog categoryToDelete={categoryToDelete} setCategoryToDelete={setCategoryToDelete} isDeletingCategory={isDeletingCategory} handleConfirmDeleteCategory={handleConfirmDeleteCategory} />

      <DetailLightbox imageLightbox={imageLightbox} handleCloseLightbox={handleCloseLightbox} handleStepLightbox={handleStepLightbox} />
    </div>
  );
}
