"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { Download, Facebook, GripVertical, ImageOff, Instagram, Maximize2, Plus, Tag, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function GallerySection({ uploadInputId, adUploadInputId, product, isUploadingImages, isUploadingAdImage, imageUploadTarget, setImageUploadTarget, adImageInputRef, dragOverId, reorderEditingId, reorderInputValue, setReorderInputValue, uploadTargetLabel, handleRemoveAllImages, handleAdImageChange, handleRemoveAdImage, handleRemoveSingleImage, handleSetAsMain, handleImagePublishToggle, touchDragActiveRef, handleGalleryDragStart, handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd, handleGalleryDragOver, handleGalleryDrop, handleGalleryDragEnd, handleGalleryTouchCancel, handleGalleryDragLeave, getGalleryGroup, handleOpenReorderInput, handleCancelReorderInput, handleConfirmReorderInput, getShiftClass, handleGalleryDropZoneDragEnter, handleGalleryDropZoneDragOver, handleGalleryDropZoneDragLeave, handleGalleryDropZoneDrop, handleAdDropZoneDragEnter, handleAdDropZoneDragOver, handleAdDropZoneDragLeave, handleAdDropZoneDrop, handleFilesSelected, handleDownloadImage, filteredGallery, handleOpenPreview, draggingSameGroup, showGalleryDropOverlay, showAdDropOverlay }: GallerySectionProps) {
  return (
    <div className="@container grid gap-6">
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
              <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @2xl:grid-cols-3">
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
                    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-white/90 p-1 text-slate-600 shadow-sm opacity-100 transition ">
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
  );
}
