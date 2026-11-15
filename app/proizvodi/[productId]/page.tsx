"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowLeft, Facebook, Images, Instagram, Link2, Pencil, Share2, ShoppingCart, Trash2 } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { HeaderActions, HeaderTitle } from "@/components/shell/ShellProvider";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { ProductStats } from "@/types/order";
import { ProductGalleryView } from "./_components/view/ProductGalleryView";
import { ProductDescriptions, ProductKeyNumbers, ProductSupplierList, ProductVariantCards } from "./_components/view/ProductInfoViews";

import { RequireAuth } from "@/components/RequireAuth";
import { useProductDetailState } from "./_hooks/useProductDetailState";
import { useProductDetailShare } from "./_hooks/useProductDetailShare";
import { useProductDetailMeta } from "./_hooks/useProductDetailMeta";
import { useProductDetailUpdate } from "./_hooks/useProductDetailUpdate";
import { useProductDetailFields } from "./_hooks/useProductDetailFields";
import { useProductGalleryManager } from "./_hooks/useProductGalleryManager";
import { ProductOrdersCard } from "./_components/ProductOrdersCard";
import { GallerySection } from "./_components/GallerySection";
import { DetailLightbox } from "./_components/DetailLightbox";

export default function ProductDetailsPage() {
  return (
    <RequireAuth>
      <ProductDetailsContent />
    </RequireAuth>
  );
}

function ProductDetailsContent() {
  const { ensureMainImage, normalizeProductImages, sessionToken, isKodMajstor, router, handleBack, uploadInputId, adUploadInputId, categories, productOrders, updateProduct, generateUploadUrl, product, setProduct, productRef, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, publishing, setPublishing, isTouchDevice, setIsTouchDevice, adImageInputRef, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, setShareOpen, reorderEditingId, setReorderEditingId, reorderInputValue, setReorderInputValue, supplierMap, isLoading } = useProductDetailState();
  const { canShare, handleCopyShareLink, handleShareLink } = useProductDetailShare({ product, setShareOpen });
  const { productCategories, uploadTargetLabel, bestSupplierOffer } = useProductDetailMeta({ categories, product, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, setIsAdDropActive, isTouchDevice, setIsTouchDevice });
  const { applyUpdate } = useProductDetailUpdate({ normalizeProductImages, sessionToken, updateProduct, setProduct, productRef });
  const { publishNow } = useProductDetailFields({ sessionToken, isKodMajstor, productRef, setPublishing, applyUpdate });
  const { handleRemoveAllImages, handleAdImageChange, handleRemoveAdImage, handleRemoveSingleImage, handleSetAsMain, handleImagePublishToggle, touchDragActiveRef, handleGalleryDragStart, handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd, handleGalleryDragOver, handleGalleryDrop, handleGalleryDragEnd, handleGalleryTouchCancel, handleGalleryDragLeave, getGalleryGroup, handleOpenReorderInput, handleCancelReorderInput, handleConfirmReorderInput, getShiftClass, handleGalleryDropZoneDragEnter, handleGalleryDropZoneDragOver, handleGalleryDropZoneDragLeave, handleGalleryDropZoneDrop, handleAdDropZoneDragEnter, handleAdDropZoneDragOver, handleAdDropZoneDragLeave, handleAdDropZoneDrop, handleFilesSelected, handleDownloadImage, filteredGallery, handleOpenPreview, handleCloseLightbox, handleStepLightbox, draggingSameGroup, showGalleryDropOverlay, showAdDropOverlay } = useProductGalleryManager({ ensureMainImage, sessionToken, generateUploadUrl, product, productRef, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, isTouchDevice, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, setReorderEditingId, reorderInputValue, setReorderInputValue, applyUpdate });
  const stats = useConvexQuery<ProductStats[]>("products:stats", { token: sessionToken });
  const setArchived = useConvexMutation<{ id: string; token: string; archived: boolean }>("products:setArchived");
  const removeProduct = useConvexMutation<{ id: string; token: string }>("products:remove");
  const [imagesOpen, setImagesOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:gap-8" aria-busy="true" aria-label="Učitavanje proizvoda">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        title="Proizvod nije pronađen."
        description="Možda je obrisan. Vrati se na listu proizvoda."
        action={<Button onClick={handleBack}>Nazad na proizvode</Button>}
        className="mx-auto mt-16 max-w-md"
      />
    );
  }

  const current = product;
  const name = current.kpName || current.name;
  const defaultVariant = current.variants?.find((variant) => variant.isDefault) ?? current.variants?.[0];
  const price = defaultVariant?.prodajnaCena ?? current.prodajnaCena;
  const purchase = bestSupplierOffer
    ? { price: bestSupplierOffer.price, supplierName: supplierMap.get(String(bestSupplierOffer.supplierId))?.name }
    : { price: defaultVariant?.nabavnaCena ?? current.nabavnaCena };
  const productStats = stats?.find((entry) => String(entry.productId) === String(current._id));
  const variantPurchase = (variantId: string) => {
    const offers = (current.supplierOffers ?? []).filter((offer) => offer.variantId === variantId);
    return offers.length ? Math.min(...offers.map((offer) => offer.price)) : undefined;
  };
  const isArchived = Boolean(current.archivedAt);
  const editHref = "/proizvodi?izmeni=" + encodeURIComponent(current._id);
  const newOrder = () => {
    if (isArchived) {
      toast.error("Proizvod je u arhivi.");
      return;
    }
    router.push("/narudzbine?productId=" + encodeURIComponent(current._id));
  };
  const copy = (value: string) => {
    void navigator.clipboard?.writeText(value).then(
      () => toast.success("Kopirano."),
      () => toast.error("Kopiranje nije uspelo."),
    );
  };
  const archive = async (next: boolean) => {
    try {
      await setArchived({ id: current._id, token: sessionToken, archived: next });
      toast.success(next ? "Proizvod je arhiviran." : "Proizvod je vraćen iz arhive.");
    } catch (error) {
      console.error(error);
      toast.error("Ažuriranje arhive nije uspelo.");
    }
  };
  const menuItems: ActionMenuItem[] = [
    { label: "Uredi slike", icon: Images, onSelect: () => setImagesOpen(true) },
    ...(isKodMajstor
      ? [
          { label: "Objavi na Facebook", icon: Facebook, disabled: Boolean(publishing), onSelect: () => void publishNow("facebook"), separatorBefore: true },
          { label: "Objavi na Instagram", icon: Instagram, disabled: Boolean(publishing), onSelect: () => void publishNow("instagram") },
        ]
      : []),
    { label: "Kopiraj link", icon: Link2, onSelect: () => void handleCopyShareLink(), separatorBefore: true },
    ...(canShare ? [{ label: "Podeli link", icon: Share2, onSelect: () => void handleShareLink() }] : []),
    isArchived
      ? { label: "Vrati iz arhive", icon: ArchiveRestore, separatorBefore: true, onSelect: () => void archive(false) }
      : { label: "Arhiviraj", icon: Archive, separatorBefore: true, onSelect: () => void archive(true) },
    { label: "Obriši trajno", icon: Trash2, destructive: true, onSelect: () => setDeleteOpen(true) },
  ];

  return (
    <>
      <HeaderTitle>
        <h1 className="line-clamp-2 text-[15px] leading-[19px] font-semibold whitespace-normal">{name}</h1>
      </HeaderTitle>
      <HeaderActions>
        <ActionMenu items={menuItems} label="Akcije proizvoda" />
      </HeaderActions>

      <div className="mx-auto max-w-7xl">
        <Link
          href="/proizvodi"
          onClick={(event) => {
            event.preventDefault();
            handleBack();
          }}
          className="-ml-2 mb-3 hidden h-9 items-center gap-1.5 rounded-xl px-2 text-sm text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring md:inline-flex"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Proizvodi
        </Link>

        {/* DOM: galerija, podaci, ostalo (= redosled na telefonu i Tab-a). Desktop: galerija i ostalo levo, podaci desno (sticky). */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_400px] md:gap-8">
          <div className="md:col-start-1 md:row-start-1">
            <ProductGalleryView items={filteredGallery} name={name} onOpen={handleOpenPreview} />
          </div>

          <aside
            aria-label="Podaci o proizvodu"
            className="flex flex-col gap-4 md:sticky md:top-[calc(var(--header-h)+24px)] md:col-start-2 md:row-span-2 md:row-start-1 md:self-start"
          >
            <h1 className="hidden text-2xl font-semibold tracking-tight text-text md:block">{name}</h1>
            {isArchived ? <p className="rounded-xl bg-warning-soft px-3 py-2 text-[13px] text-warning">Proizvod je u arhivi.</p> : null}
            <ProductKeyNumbers product={current} price={price} purchase={purchase} sold={productStats?.salesCount} profit={productStats?.profit} categories={productCategories} />
            <div className="hidden gap-2 md:flex">
              <Button asChild variant="outline" className="flex-1 gap-2 rounded-xl">
                <Link href={editHref}>
                  <Pencil className="size-4" aria-hidden />
                  Izmeni
                </Link>
              </Button>
              <Button type="button" className="flex-1 gap-2 rounded-xl" disabled={isArchived} onClick={newOrder}>
                <ShoppingCart className="size-4" aria-hidden />
                Nova narudžbina
              </Button>
              <ActionMenu items={menuItems} label="Akcije proizvoda" />
            </div>
          </aside>

          <div className="flex flex-col gap-4 md:col-start-1 md:row-start-2">
            <ProductVariantCards product={current} purchaseFor={variantPurchase} />
            <ProductSupplierList product={current} supplierMap={supplierMap} />
            <ProductDescriptions product={current} onCopy={copy} />
      <ProductOrdersCard productOrders={productOrders} product={product} />
          </div>
        </div>
        <div aria-hidden className="h-20 md:hidden" />
      </div>

      <div
        role="region"
        aria-label="Brze akcije"
        data-action-bar
        data-probe-bottom-bar
        className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom))] z-(--z-sticky) border-t border-border bg-raised px-3 md:hidden"
      >
        <div className="mx-auto flex h-16 max-w-md items-center gap-2">
          <Button asChild variant="outline" className="flex-1 gap-2 rounded-xl">
            <Link href={editHref}>
              <Pencil className="size-4" aria-hidden />
              Izmeni
            </Link>
          </Button>
          <Button type="button" className="flex-[1.4] gap-2 rounded-xl" disabled={isArchived} onClick={newOrder}>
            <ShoppingCart className="size-4" aria-hidden />
            Nova narudžbina
          </Button>
          <ActionMenu items={menuItems} label="Više akcija proizvoda" />
        </div>
      </div>

      <Sheet
        open={imagesOpen}
        onOpenChange={(open) => {
          setImagesOpen(open);
          if (!open) handleCloseLightbox();
        }}
        title="Uredi slike" description={name} size="full" desktopWidth="xl">
      <GallerySection uploadInputId={uploadInputId} adUploadInputId={adUploadInputId} product={product} isUploadingImages={isUploadingImages} isUploadingAdImage={isUploadingAdImage} imageUploadTarget={imageUploadTarget} setImageUploadTarget={setImageUploadTarget} adImageInputRef={adImageInputRef} dragOverId={dragOverId} reorderEditingId={reorderEditingId} reorderInputValue={reorderInputValue} setReorderInputValue={setReorderInputValue} uploadTargetLabel={uploadTargetLabel} handleRemoveAllImages={handleRemoveAllImages} handleAdImageChange={handleAdImageChange} handleRemoveAdImage={handleRemoveAdImage} handleRemoveSingleImage={handleRemoveSingleImage} handleSetAsMain={handleSetAsMain} handleImagePublishToggle={handleImagePublishToggle} touchDragActiveRef={touchDragActiveRef} handleGalleryDragStart={handleGalleryDragStart} handleGalleryTouchStart={handleGalleryTouchStart} handleGalleryTouchMove={handleGalleryTouchMove} handleGalleryTouchEnd={handleGalleryTouchEnd} handleGalleryDragOver={handleGalleryDragOver} handleGalleryDrop={handleGalleryDrop} handleGalleryDragEnd={handleGalleryDragEnd} handleGalleryTouchCancel={handleGalleryTouchCancel} handleGalleryDragLeave={handleGalleryDragLeave} getGalleryGroup={getGalleryGroup} handleOpenReorderInput={handleOpenReorderInput} handleCancelReorderInput={handleCancelReorderInput} handleConfirmReorderInput={handleConfirmReorderInput} getShiftClass={getShiftClass} handleGalleryDropZoneDragEnter={handleGalleryDropZoneDragEnter} handleGalleryDropZoneDragOver={handleGalleryDropZoneDragOver} handleGalleryDropZoneDragLeave={handleGalleryDropZoneDragLeave} handleGalleryDropZoneDrop={handleGalleryDropZoneDrop} handleAdDropZoneDragEnter={handleAdDropZoneDragEnter} handleAdDropZoneDragOver={handleAdDropZoneDragOver} handleAdDropZoneDragLeave={handleAdDropZoneDragLeave} handleAdDropZoneDrop={handleAdDropZoneDrop} handleFilesSelected={handleFilesSelected} handleDownloadImage={handleDownloadImage} filteredGallery={filteredGallery} handleOpenPreview={handleOpenPreview} draggingSameGroup={draggingSameGroup} showGalleryDropOverlay={showGalleryDropOverlay} showAdDropOverlay={showAdDropOverlay} />
        <DetailLightbox inline imageLightbox={imageLightbox} handleCloseLightbox={handleCloseLightbox} handleStepLightbox={handleStepLightbox} />
      </Sheet>
      {imagesOpen ? null : <DetailLightbox imageLightbox={imageLightbox} handleCloseLightbox={handleCloseLightbox} handleStepLightbox={handleStepLightbox} />}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        tone="danger"
        title="Trajno obrisati proizvod?"
        description={name + ". Brisanje je trajno; arhiviranje ga samo sklanja iz liste."}
        confirmLabel="Obriši trajno"
        onConfirm={async () => {
          try {
            await removeProduct({ id: current._id, token: sessionToken });
          } catch (error) {
            console.error(error);
            toast.error("Brisanje nije uspelo.");
            throw error;
          }
          toast.success("Proizvod je trajno obrisan.");
          router.push("/proizvodi");
        }}
      />
    </>
  );
}
