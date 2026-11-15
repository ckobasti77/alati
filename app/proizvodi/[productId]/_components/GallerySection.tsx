"use client";

import { useState } from "react";
import { Check, Download, Facebook, GripVertical, ImageOff, Instagram, Loader2, Plus, Star, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailMeta } from "../_hooks/useProductDetailMeta";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";

type GallerySectionProps = {
  uploadInputId: ReturnType<typeof useProductDetailState>["uploadInputId"];
  adUploadInputId: ReturnType<typeof useProductDetailState>["adUploadInputId"];
  product: ProductWithUrls;
  isUploadingImages: ReturnType<typeof useProductDetailState>["isUploadingImages"];
  isUploadingAdImage: ReturnType<typeof useProductDetailState>["isUploadingAdImage"];
  imageUploadTarget: ReturnType<typeof useProductDetailState>["imageUploadTarget"];
  setImageUploadTarget: ReturnType<typeof useProductDetailState>["setImageUploadTarget"];
  adImageInputRef: ReturnType<typeof useProductDetailState>["adImageInputRef"];
  dragOverId: ReturnType<typeof useProductDetailState>["dragOverId"];
  reorderEditingId: ReturnType<typeof useProductDetailState>["reorderEditingId"];
  reorderInputValue: ReturnType<typeof useProductDetailState>["reorderInputValue"];
  setReorderInputValue: ReturnType<typeof useProductDetailState>["setReorderInputValue"];
  uploadTargetLabel: ReturnType<typeof useProductDetailMeta>["uploadTargetLabel"];
  handleRemoveAllImages: ReturnType<typeof useProductGalleryManager>["handleRemoveAllImages"];
  handleAdImageChange: ReturnType<typeof useProductGalleryManager>["handleAdImageChange"];
  handleRemoveAdImage: ReturnType<typeof useProductGalleryManager>["handleRemoveAdImage"];
  handleRemoveSingleImage: ReturnType<typeof useProductGalleryManager>["handleRemoveSingleImage"];
  handleSetAsMain: ReturnType<typeof useProductGalleryManager>["handleSetAsMain"];
  handleImagePublishToggle: ReturnType<typeof useProductGalleryManager>["handleImagePublishToggle"];
  touchDragActiveRef: ReturnType<typeof useProductGalleryManager>["touchDragActiveRef"];
  handleGalleryDragStart: ReturnType<typeof useProductGalleryManager>["handleGalleryDragStart"];
  handleGalleryTouchStart: ReturnType<typeof useProductGalleryManager>["handleGalleryTouchStart"];
  handleGalleryTouchMove: ReturnType<typeof useProductGalleryManager>["handleGalleryTouchMove"];
  handleGalleryTouchEnd: ReturnType<typeof useProductGalleryManager>["handleGalleryTouchEnd"];
  handleGalleryDragOver: ReturnType<typeof useProductGalleryManager>["handleGalleryDragOver"];
  handleGalleryDrop: ReturnType<typeof useProductGalleryManager>["handleGalleryDrop"];
  handleGalleryDragEnd: ReturnType<typeof useProductGalleryManager>["handleGalleryDragEnd"];
  handleGalleryTouchCancel: ReturnType<typeof useProductGalleryManager>["handleGalleryTouchCancel"];
  handleGalleryDragLeave: ReturnType<typeof useProductGalleryManager>["handleGalleryDragLeave"];
  getGalleryGroup: ReturnType<typeof useProductGalleryManager>["getGalleryGroup"];
  handleOpenReorderInput: ReturnType<typeof useProductGalleryManager>["handleOpenReorderInput"];
  handleCancelReorderInput: ReturnType<typeof useProductGalleryManager>["handleCancelReorderInput"];
  handleConfirmReorderInput: ReturnType<typeof useProductGalleryManager>["handleConfirmReorderInput"];
  getShiftClass: ReturnType<typeof useProductGalleryManager>["getShiftClass"];
  handleGalleryDropZoneDragEnter: ReturnType<typeof useProductGalleryManager>["handleGalleryDropZoneDragEnter"];
  handleGalleryDropZoneDragOver: ReturnType<typeof useProductGalleryManager>["handleGalleryDropZoneDragOver"];
  handleGalleryDropZoneDragLeave: ReturnType<typeof useProductGalleryManager>["handleGalleryDropZoneDragLeave"];
  handleGalleryDropZoneDrop: ReturnType<typeof useProductGalleryManager>["handleGalleryDropZoneDrop"];
  handleAdDropZoneDragEnter: ReturnType<typeof useProductGalleryManager>["handleAdDropZoneDragEnter"];
  handleAdDropZoneDragOver: ReturnType<typeof useProductGalleryManager>["handleAdDropZoneDragOver"];
  handleAdDropZoneDragLeave: ReturnType<typeof useProductGalleryManager>["handleAdDropZoneDragLeave"];
  handleAdDropZoneDrop: ReturnType<typeof useProductGalleryManager>["handleAdDropZoneDrop"];
  handleFilesSelected: ReturnType<typeof useProductGalleryManager>["handleFilesSelected"];
  handleDownloadImage: ReturnType<typeof useProductGalleryManager>["handleDownloadImage"];
  filteredGallery: ReturnType<typeof useProductGalleryManager>["filteredGallery"];
  handleOpenPreview: ReturnType<typeof useProductGalleryManager>["handleOpenPreview"];
  draggingSameGroup: ReturnType<typeof useProductGalleryManager>["draggingSameGroup"];
  showGalleryDropOverlay: ReturnType<typeof useProductGalleryManager>["showGalleryDropOverlay"];
  showAdDropOverlay: ReturnType<typeof useProductGalleryManager>["showAdDropOverlay"];
};

type GalleryItem = ReturnType<typeof useProductGalleryManager>["filteredGallery"][number];

/** Posle izmene pozicije fokus se vraća na dugme „#n“ te slike (pločica se možda pomerila). */
const focusPositionButton = (id: string) =>
  requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-gallery-id="${CSS.escape(id)}"] [data-position-button]`)?.focus());
type ConfirmTarget = { kind: "one"; item: GalleryItem } | { kind: "all" } | { kind: "ad" } | null;

/** FB/IG uključivanje slike u objavu: uključeno = akcenat, isključeno = prigušeno (uz aria-pressed). */
const toggleClass = (active: boolean) =>
  cn(
    "inline-flex h-11 cursor-pointer items-center gap-1 rounded-xl px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring md:h-9",
    active ? "bg-accent-soft text-accent-text" : "text-text-muted ring-1 ring-inset ring-border-strong hover:bg-surface-2",
  );

/** „Uredi slike“: pločice sa kontrolama ispod slike (mete 44px na telefonu), potvrda pre svakog brisanja. */
export function GallerySection({ uploadInputId, adUploadInputId, product, isUploadingImages, isUploadingAdImage, imageUploadTarget, setImageUploadTarget, adImageInputRef, dragOverId, reorderEditingId, reorderInputValue, setReorderInputValue, uploadTargetLabel, handleRemoveAllImages, handleAdImageChange, handleRemoveAdImage, handleRemoveSingleImage, handleSetAsMain, handleImagePublishToggle, touchDragActiveRef, handleGalleryDragStart, handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd, handleGalleryDragOver, handleGalleryDrop, handleGalleryDragEnd, handleGalleryTouchCancel, handleGalleryDragLeave, getGalleryGroup, handleOpenReorderInput, handleCancelReorderInput, handleConfirmReorderInput, getShiftClass, handleGalleryDropZoneDragEnter, handleGalleryDropZoneDragOver, handleGalleryDropZoneDragLeave, handleGalleryDropZoneDrop, handleAdDropZoneDragEnter, handleAdDropZoneDragOver, handleAdDropZoneDragLeave, handleAdDropZoneDrop, handleFilesSelected, handleDownloadImage, filteredGallery, handleOpenPreview, draggingSameGroup, showGalleryDropOverlay, showAdDropOverlay }: GallerySectionProps) {
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);
  const variantCount = product.variants?.length ?? 0;

  return (
    <div className="@container flex flex-col gap-4 md:gap-6">
      <section aria-labelledby="galerija-naslov" className="rounded-2xl bg-surface ring-1 ring-border">
        <div className="flex flex-col gap-3 px-4 pt-4 md:px-5">
          <div className="flex items-center gap-2">
            <h2 id="galerija-naslov" className="text-base font-semibold text-text">
              Slike
            </h2>
            <span className="num rounded-full bg-surface-2 px-2 text-xs font-medium text-text-muted">{filteredGallery.length}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {variantCount > 0 ? (
              <Select value={imageUploadTarget} onValueChange={setImageUploadTarget}>
                <SelectTrigger className="w-full @md:w-[200px]" aria-label="Gde se dodaju nove slike">
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
            ) : null}
            <input
              id={uploadInputId}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label="Izaberi slike za dodavanje"
              onChange={handleFilesSelected}
              disabled={isUploadingImages}
            />
            <Button type="button" variant="outline" className="gap-2" disabled={isUploadingImages} onClick={() => document.getElementById(uploadInputId)?.click()}>
              {isUploadingImages ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              {isUploadingImages ? "Dodavanje…" : "Dodaj slike"}
            </Button>
            {filteredGallery.length > 0 ? (
              <Button type="button" variant="ghost" className="ml-auto gap-2 text-danger" onClick={() => setConfirm({ kind: "all" })}>
                <Trash2 className="size-4" aria-hidden />
                Obriši sve
              </Button>
            ) : null}
          </div>
          <p className="text-[13px] text-text-muted">Nove slike idu u: {uploadTargetLabel}. Prevuci sliku za novi redosled ili upiši poziciju (#).</p>
        </div>

        <div
          className={cn("relative m-4 mt-3 rounded-xl md:m-5 md:mt-3", showGalleryDropOverlay && "ring-2 ring-inset ring-accent")}
          onDragEnter={handleGalleryDropZoneDragEnter}
          onDragOver={handleGalleryDropZoneDragOver}
          onDragLeave={handleGalleryDropZoneDragLeave}
          onDrop={handleGalleryDropZoneDrop}
        >
          {showGalleryDropOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-(--z-raised) flex items-center justify-center rounded-xl bg-accent-soft/90">
              <span className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                <UploadCloud className="size-4" aria-hidden />
                Otpusti da dodaš slike u: {uploadTargetLabel}
              </span>
            </div>
          ) : null}
          {filteredGallery.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-8 text-center text-text-muted">
              <ImageOff className="size-7" aria-hidden />
              <p className="text-sm font-medium text-text">Nema slika za ovaj izbor</p>
              <p className="text-[13px]">Prevuci fotografije ovde ili „Dodaj slike“.</p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 @xl:grid-cols-2 @4xl:grid-cols-3">
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
                  <li
                    key={item.id}
                    data-gallery-id={item.id}
                    className={cn("flex flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-border transition-all duration-200", shiftClass, isDragOver && "ring-2 ring-accent")}
                  >
                    <div
                      className="group relative aspect-[4/3] cursor-grab bg-surface-2"
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
                    >
                      <button
                        type="button"
                        aria-label={`Otvori pregled: ${item.label}`}
                        className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                        onClick={() => {
                          if (touchDragActiveRef.current) return;
                          handleOpenPreview(item);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL */}
                        <img src={item.url} alt={item.alt} className="size-full object-contain" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 border-t border-border px-2 pt-1">
                      <GripVertical className="size-4 shrink-0 text-text-muted" aria-hidden />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-text">{item.label}</span>
                      {isReorderEditing ? (
                        // data-nested-layer: Esc u polju zatvara samo editor pozicije, ne ceo Sheet.
                        <span data-nested-layer className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={totalInGroup}
                            value={reorderInputValue}
                            aria-label={`Nova pozicija (1–${totalInGroup})`}
                            onChange={(event) => setReorderInputValue(event.target.value)}
                            className="h-11 w-16 rounded-xl bg-surface px-2 text-base text-text ring-1 ring-inset ring-border-strong focus-visible:outline-2 focus-visible:outline-ring md:h-9 md:text-sm"
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void handleConfirmReorderInput(item).then(() => focusPositionButton(item.id));
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                event.stopPropagation();
                                handleCancelReorderInput();
                                focusPositionButton(item.id);
                              }
                            }}
                          />
                          <IconButton aria-label="Potvrdi poziciju" variant="solid" onClick={() => void handleConfirmReorderInput(item).then(() => focusPositionButton(item.id))}>
                            <Check />
                          </IconButton>
                          <IconButton
                            aria-label="Odustani od promene pozicije"
                            onClick={() => {
                              handleCancelReorderInput();
                              focusPositionButton(item.id);
                            }}
                          >
                            <X />
                          </IconButton>
                        </span>
                      ) : (
                        <button
                          type="button"
                          data-position-button
                          onClick={() => handleOpenReorderInput(item)}
                          aria-label={`#${currentPosition}: pozicija ${currentPosition} od ${totalInGroup}, promeni`}
                          className="num inline-flex h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl px-2 text-[13px] font-medium text-text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-ring md:h-9 md:min-w-9"
                        >
                          #{currentPosition}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1 px-2 pb-1">
                      <button
                        type="button"
                        aria-pressed={Boolean(item.isMain)}
                        disabled={item.isMain}
                        onClick={() => handleSetAsMain(item)}
                        className={cn(
                          "inline-flex h-11 items-center gap-1 rounded-xl px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring md:h-9",
                          item.isMain ? "bg-success-soft text-success" : "cursor-pointer text-text hover:bg-surface-2",
                        )}
                      >
                        {item.isMain ? <Check className="size-4" aria-hidden /> : <Star className="size-4" aria-hidden />}
                        Glavna
                      </button>
                      <button
                        type="button"
                        aria-pressed={fbActive}
                        aria-label={`FB objava: ${item.label}`}
                        title={fbActive ? "Ukloni iz FB objave" : "Uključi u FB objavu"}
                        onClick={() => handleImagePublishToggle(item, "publishFb", !fbActive)}
                        className={toggleClass(fbActive)}
                      >
                        <Facebook className="size-4" aria-hidden />
                        FB
                      </button>
                      <button
                        type="button"
                        aria-pressed={igActive}
                        aria-label={`IG objava: ${item.label}`}
                        title={igActive ? "Ukloni iz IG objave" : "Uključi u IG objavu"}
                        onClick={() => handleImagePublishToggle(item, "publishIg", !igActive)}
                        className={toggleClass(igActive)}
                      >
                        <Instagram className="size-4" aria-hidden />
                        IG
                      </button>
                      <IconButton aria-label={`Preuzmi sliku: ${item.label}`} className="ml-auto" onClick={() => void handleDownloadImage(item.url, item.fileName ?? `${item.id}.jpg`)}>
                        <Download />
                      </IconButton>
                      <IconButton aria-label={`Obriši sliku: ${item.label}`} className="hover:text-danger" onClick={() => setConfirm({ kind: "one", item })}>
                        <Trash2 />
                      </IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="glavna-mreze" className="rounded-2xl bg-surface ring-1 ring-border">
        <div className="flex flex-col gap-3 px-4 pt-4 md:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="glavna-mreze" className="text-base font-semibold text-text">
              Glavna slika za društvene mreže
            </h2>
            <span className={cn("rounded-full px-2 py-px text-xs font-medium", product.adImage ? "bg-success-soft text-success" : "bg-surface-2 text-text-muted")}>
              {product.adImage ? "Postavljena" : "Nije dodata"}
            </span>
          </div>
          <p className="text-[13px] text-text-muted">Ide kao prva fotografija u FB / Instagram objavi.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={adUploadInputId}
              ref={adImageInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label="Izaberi glavnu sliku za društvene mreže"
              onChange={handleAdImageChange}
              disabled={isUploadingAdImage}
            />
            <Button type="button" variant="outline" className="gap-2" disabled={isUploadingAdImage} onClick={() => document.getElementById(adUploadInputId)?.click()}>
              {isUploadingAdImage ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UploadCloud className="size-4" aria-hidden />}
              {isUploadingAdImage ? "Dodavanje…" : product.adImage ? "Zameni" : "Dodaj glavnu sliku"}
            </Button>
            {product.adImage?.url ? (
              <Button
                type="button"
                variant="ghost"
                className="gap-2"
                onClick={() => void handleDownloadImage(product.adImage?.url ?? "", product.adImage?.fileName ?? `${product._id}-ad.jpg`)}
              >
                <Download className="size-4" aria-hidden />
                Preuzmi
              </Button>
            ) : null}
            {product.adImage ? (
              <Button type="button" variant="ghost" className="ml-auto gap-2 text-danger" onClick={() => setConfirm({ kind: "ad" })}>
                <Trash2 className="size-4" aria-hidden />
                Obriši
              </Button>
            ) : null}
          </div>
        </div>
        <div
          className={cn("relative m-4 mt-3 rounded-xl md:m-5 md:mt-3", showAdDropOverlay && "ring-2 ring-inset ring-accent")}
          onDragEnter={handleAdDropZoneDragEnter}
          onDragOver={handleAdDropZoneDragOver}
          onDragLeave={handleAdDropZoneDragLeave}
          onDrop={handleAdDropZoneDrop}
        >
          {showAdDropOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-(--z-raised) flex items-center justify-center rounded-xl bg-accent-soft/90">
              <span className="flex items-center gap-2 text-sm font-semibold text-accent-text">
                <UploadCloud className="size-4" aria-hidden />
                Otpusti da postaviš glavnu sliku
              </span>
            </div>
          ) : null}
          {product.adImage ? (
            <div className="overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border">
              {/* eslint-disable-next-line @next/next/no-img-element -- Convex storage URL */}
              <img src={product.adImage.url ?? ""} alt="Glavna slika za društvene mreže" className="h-64 w-full object-contain md:h-80" />
            </div>
          ) : (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl bg-surface-2 px-4 py-8 text-center text-text-muted">
              <UploadCloud className="size-7" aria-hidden />
              <p className="text-sm font-medium text-text">Nema glavne slike za društvene mreže</p>
              <p className="text-[13px]">Prevuci je ovde ili „Dodaj glavnu sliku“.</p>
            </div>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="danger"
        title={confirm?.kind === "all" ? "Obrisati sve slike?" : confirm?.kind === "ad" ? "Obrisati glavnu sliku za mreže?" : "Obrisati sliku?"}
        description={
          confirm?.kind === "all"
            ? "Brišu se sve slike proizvoda, uključujući slike svih tipova. Ovo ne može da se vrati."
            : confirm?.kind === "one"
              ? "Slika se uklanja iz proizvoda. Ovo ne može da se vrati."
              : "Ovo ne može da se vrati."
        }
        confirmLabel="Obriši"
        onConfirm={async () => {
          const target = confirm;
          if (!target) return;
          if (target.kind === "one") await handleRemoveSingleImage(target.item);
          else if (target.kind === "ad") await handleRemoveAdImage();
          else await handleRemoveAllImages();
          setConfirm(null);
        }}
      />
    </div>
  );
}
