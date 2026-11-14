"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent as ReactDragEvent } from "react";
import { toast } from "sonner";
import type { ProductImage } from "@/types/order";
import { isVariantOrigin, type GalleryItem, type LightboxItem } from "../_lib/detailTypes";
import type { useProductDetailState } from "./useProductDetailState";
import type { useProductDetailUpdate } from "./useProductDetailUpdate";

type UseProductGalleryManagerParams = {
  ensureMainImage: ReturnType<typeof useProductDetailState>["ensureMainImage"];
  sessionToken: ReturnType<typeof useProductDetailState>["sessionToken"];
  generateUploadUrl: ReturnType<typeof useProductDetailState>["generateUploadUrl"];
  product: ReturnType<typeof useProductDetailState>["product"];
  productRef: ReturnType<typeof useProductDetailState>["productRef"];
  setIsUploadingImages: ReturnType<typeof useProductDetailState>["setIsUploadingImages"];
  isUploadingAdImage: ReturnType<typeof useProductDetailState>["isUploadingAdImage"];
  setIsUploadingAdImage: ReturnType<typeof useProductDetailState>["setIsUploadingAdImage"];
  isGalleryDropActive: ReturnType<typeof useProductDetailState>["isGalleryDropActive"];
  setIsGalleryDropActive: ReturnType<typeof useProductDetailState>["setIsGalleryDropActive"];
  imageUploadTarget: ReturnType<typeof useProductDetailState>["imageUploadTarget"];
  setImageUploadTarget: ReturnType<typeof useProductDetailState>["setImageUploadTarget"];
  isAdDropActive: ReturnType<typeof useProductDetailState>["isAdDropActive"];
  setIsAdDropActive: ReturnType<typeof useProductDetailState>["setIsAdDropActive"];
  isTouchDevice: ReturnType<typeof useProductDetailState>["isTouchDevice"];
  imageLightbox: ReturnType<typeof useProductDetailState>["imageLightbox"];
  setImageLightbox: ReturnType<typeof useProductDetailState>["setImageLightbox"];
  draggingItem: ReturnType<typeof useProductDetailState>["draggingItem"];
  setDraggingItem: ReturnType<typeof useProductDetailState>["setDraggingItem"];
  dragOverId: ReturnType<typeof useProductDetailState>["dragOverId"];
  setDragOverId: ReturnType<typeof useProductDetailState>["setDragOverId"];
  setReorderEditingId: ReturnType<typeof useProductDetailState>["setReorderEditingId"];
  reorderInputValue: ReturnType<typeof useProductDetailState>["reorderInputValue"];
  setReorderInputValue: ReturnType<typeof useProductDetailState>["setReorderInputValue"];
  applyUpdate: ReturnType<typeof useProductDetailUpdate>["applyUpdate"];
};

export function useProductGalleryManager({ ensureMainImage, sessionToken, generateUploadUrl, product, productRef, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, isTouchDevice, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, setReorderEditingId, reorderInputValue, setReorderInputValue, applyUpdate }: UseProductGalleryManagerParams) {
  const uploadAdImage = async (file: File) => {
    if (!product) return;
    const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error("Prevuci ili izaberi fajl tipa slike.");
      return;
    }
    setIsUploadingAdImage(true);
    try {
      const uploadUrl = await generateUploadUrl({ token: sessionToken });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload nije uspeo.");
      }
      const { storageId } = await response.json();
      const nextImage = {
        storageId,
        fileName: file.name,
        contentType: file.type,
        uploadedAt: Date.now(),
        url: URL.createObjectURL(file),
      };
      await applyUpdate(
        (current) => ({
          ...current,
          adImage: nextImage,
        }),
        "Ad slika sacuvana.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje ad slike nije uspelo.");
      throw error;
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleRemoveAllImages = async () => {
    if (!product) return;
    // Potvrdu traži ConfirmDialog u „Uredi slike“ (GallerySection) pre poziva.
    await applyUpdate(
      (current) => ({
        ...current,
        images: [],
        variants: current.variants?.map((variant) => ({ ...variant, images: [] })),
      }),
      "Sve slike su obrisane.",
    );
  };

  const handleAdImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    event.target.value = "";
  };

  const handleRemoveAdImage = async () => {
    await applyUpdate(
      (current) => ({
        ...current,
        adImage: null,
      }),
      "Ad slika uklonjena.",
    );
  };

  const handleRemoveSingleImage = async (item: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (item.origin.type === "product") {
          const remaining = ensureMainImage((current.images ?? []).filter((image) => image.storageId !== item.storageId));
          return { ...current, images: remaining };
        }
        if (item.origin.type !== "variant") return current;
        const currentVariants = current.variants ?? [];
        if (currentVariants.length === 0) return current;
        const { variantId } = item.origin;
        const nextVariants = currentVariants.map((variant) => {
          if (variant.id !== variantId) return variant;
          const remaining = ensureMainImage(
            (variant.images ?? []).filter((image) => image.storageId !== item.storageId),
          );
          return { ...variant, images: remaining };
        });
        return { ...current, variants: nextVariants };
      },
      "Slika obrisana.",
    );
  };

  const handleSetAsMain = async (item: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (item.origin.type === "product") {
          const images = current.images ?? [];
          if (images.length === 0) return current;
          return { ...current, images: ensureMainImage(images, item.storageId) };
        }
        if (item.origin.type !== "variant") return current;
        const variants = current.variants ?? [];
        if (variants.length === 0) return current;
        const { variantId } = item.origin;
        return {
          ...current,
          variants: variants.map((variant) => {
            if (variant.id !== variantId) return variant;
            const variantImages = variant.images ?? [];
            if (variantImages.length === 0) return variant;
            return { ...variant, images: ensureMainImage(variantImages, item.storageId) };
          }),
        };
      },
      "Glavna slika podesena.",
    );
  };

  const handleImagePublishToggle = async (
    item: GalleryItem,
    field: "publishFb" | "publishIg",
    value: boolean,
  ) => {
    await applyUpdate(
      (current) => {
        const updateList = (list: (ProductImage & { url?: string | null })[] = []) =>
          list.map((image) => (image.storageId === item.storageId ? { ...image, [field]: value } : image));
        if (item.origin.type === "product") {
          return { ...current, images: updateList(current.images ?? []) };
        }
        const origin = item.origin;
        if (!isVariantOrigin(origin)) return current;
        const variants = (current.variants ?? []).map((variant) =>
          variant.id === origin.variantId ? { ...variant, images: updateList(variant.images ?? []) } : variant,
        );
        return { ...current, variants };
      },
      "Sacuvano.",
    );
  };

  const isSameGalleryGroup = (a: GalleryItem, b: GalleryItem) => {
    if (a.origin.type !== b.origin.type) return false;
    if (a.origin.type === "variant" && b.origin.type === "variant") {
      return a.origin.variantId === b.origin.variantId;
    }
    return true;
  };

  const reorderImageList = (
    list: (ProductImage & { url?: string | null })[] = [],
    sourceId: string,
    targetId: string,
  ) => {
    const next = [...list];
    const fromIndex = next.findIndex((image) => image.storageId === sourceId);
    const toIndex = next.findIndex((image) => image.storageId === targetId);
    if (fromIndex === -1 || toIndex === -1) return list;
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next.map((image, index) => ({ ...image, isMain: index === 0 }));
  };

  const handleReorderGallery = async (source: GalleryItem, target: GalleryItem) => {
    await applyUpdate(
      (current) => {
        if (source.origin.type === "product" && target.origin.type === "product") {
          const images = reorderImageList(current.images ?? [], source.storageId, target.storageId);
          return { ...current, images };
        }
        if (source.origin.type === "variant" && target.origin.type === "variant") {
          const variantId = source.origin.variantId;
          const variants = (current.variants ?? []).map((variant) => {
            if (variant.id !== variantId) return variant;
            const nextImages = reorderImageList(variant.images ?? [], source.storageId, target.storageId);
            return { ...variant, images: nextImages };
          });
          return { ...current, variants };
        }
        return current;
      },
      "Redosled sacuvan.",
    );
  };

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchDragActiveRef = useRef(false);
  const [touchDraggingId, setTouchDraggingId] = useState<string | null>(null);

  const isTouchOnActionButton = (event: React.TouchEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null;
    if (!target) return false;
    return Boolean(target.closest("button"));
  };

  const handleGalleryDragStart = (event: React.DragEvent<HTMLDivElement>, item: GalleryItem) => {
    event.dataTransfer.effectAllowed = "move";
    try {
      event.dataTransfer.setData("text/plain", item.id);
    } catch {
      // ignore
    }
    setDraggingItem(item);
  };

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>, item: GalleryItem) => {
    if (event.touches.length !== 1) return;
    if (isTouchOnActionButton(event)) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressTimerRef.current = setTimeout(() => {
      touchDragActiveRef.current = true;
      setTouchDraggingId(item.id);
      setDraggingItem(item);
      setDragOverId(item.id);
    }, 1000);
  };

  const handleGalleryTouchMove = async (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchDragActiveRef.current || !draggingItem) return;
    event.preventDefault();
    const touch = event.touches[0];
    const targetElement = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    const targetId = targetElement?.closest("[data-gallery-id]")?.getAttribute("data-gallery-id");
    if (!targetId || targetId === touchDraggingId) return;
    const targetItem = filteredGallery.find((item) => item.id === targetId);
    if (!targetItem) return;
    if (!isSameGalleryGroup(draggingItem, targetItem)) return;
    await handleReorderGallery(draggingItem, targetItem);
    setTouchDraggingId(targetId);
    setDraggingItem(targetItem);
    setDragOverId(targetId);
  };

  const resetTouchDrag = () => {
    touchDragActiveRef.current = false;
    setTouchDraggingId(null);
    setDraggingItem(null);
    setDragOverId(null);
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleGalleryTouchEnd = () => {
    resetTouchDrag();
  };

  const handleGalleryDragOver = (event: React.DragEvent<HTMLDivElement>, target: GalleryItem) => {
    if (!draggingItem || !isSameGalleryGroup(draggingItem, target)) return;
    event.preventDefault();
    setDragOverId(target.id);
  };

  const handleGalleryDrop = async (event: React.DragEvent<HTMLDivElement>, target: GalleryItem) => {
    event.preventDefault();
    if (!draggingItem || draggingItem.id === target.id) return;
    if (!isSameGalleryGroup(draggingItem, target)) return;
    await handleReorderGallery(draggingItem, target);
    setDraggingItem(null);
    setDragOverId(null);
  };

  const handleGalleryDragEnd = () => {
    setDraggingItem(null);
    setDragOverId(null);
  };

  const handleGalleryTouchCancel = () => {
    resetTouchDrag();
  };

  const handleGalleryDragLeave = (target: GalleryItem) => {
    if (!draggingItem || !isSameGalleryGroup(draggingItem, target)) return;
    setDragOverId((current) => (current === target.id ? null : current));
  };

  const getGalleryGroup = (item: GalleryItem) =>
    filteredGallery.filter((candidate) => isSameGalleryGroup(item, candidate));

  const handleOpenReorderInput = (item: GalleryItem) => {
    const group = getGalleryGroup(item);
    const currentIndex = group.findIndex((candidate) => candidate.id === item.id);
    setReorderEditingId(item.id);
    setReorderInputValue(String(currentIndex >= 0 ? currentIndex + 1 : 1));
  };

  const handleCancelReorderInput = () => {
    setReorderEditingId(null);
    setReorderInputValue("");
  };

  const handleConfirmReorderInput = async (item: GalleryItem) => {
    const group = getGalleryGroup(item);
    if (group.length === 0) return;
    const parsed = Number.parseInt(reorderInputValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1) {
      toast.error("Upisi redni broj (1 ili vise).");
      return;
    }
    const targetIndex = Math.min(Math.max(parsed - 1, 0), group.length - 1);
    const targetItem = group[targetIndex];
    handleCancelReorderInput();
    if (!targetItem || targetItem.id === item.id) return;
    setDraggingItem(item);
    setDragOverId(targetItem.id);
    await new Promise((resolve) => setTimeout(resolve, 180));
    try {
      await handleReorderGallery(item, targetItem);
    } finally {
      setTimeout(() => {
        setDraggingItem(null);
        setDragOverId(null);
      }, 260);
    }
  };

  const getShiftClass = (item: GalleryItem, index: number) => {
    if (!draggingSameGroup || draggingIndex === -1 || targetIndex === -1) return "";
    if (item.id === draggingItem?.id) return "scale-[1.02] shadow-lg";
    // dragging item moving to the left
    if (draggingIndex > targetIndex) {
      if (index >= targetIndex && index < draggingIndex) return "translate-x-3";
    }
    // dragging item moving to the right
    if (draggingIndex < targetIndex) {
      if (index > draggingIndex && index <= targetIndex) return "-translate-x-3";
    }
    return "";
  };

  const resolveUploadTarget = useCallback(
    (override?: { type: "product" } | { type: "variant"; variantId: string }) => {
      if (override) return override;
      if (imageUploadTarget !== "product") {
        return { type: "variant" as const, variantId: imageUploadTarget };
      }
      return { type: "product" as const };
    },
    [imageUploadTarget],
  );

  const uploadImages = async (
    fileList: FileList | File[],
    targetOverride?: { type: "product" } | { type: "variant"; variantId: string },
  ) => {
    const currentProduct = productRef.current;
    if (!currentProduct) return;
    const target = resolveUploadTarget(targetOverride);
    if (target.type === "variant") {
      const exists = (currentProduct.variants ?? []).some((variant) => variant.id === target.variantId);
      if (!exists) {
        toast.error("Izabrani tip vise ne postoji.");
        setImageUploadTarget("product");
        return;
      }
    }
    const accepted = Array.from(fileList instanceof FileList ? Array.from(fileList) : fileList).filter((file) => {
      if (file.type) return file.type.startsWith("image/");
      return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    });
    if (accepted.length === 0) {
      toast.error("Prevuci ili izaberi fajlove tipa slike.");
      return;
    }

    setIsUploadingImages(true);
    const additions: (ProductImage & { url?: string | null })[] = [];
    try {
      for (const file of accepted) {
        const uploadUrl = await generateUploadUrl({ token: sessionToken });
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!response.ok) {
          throw new Error("Upload nije uspeo.");
        }
        const { storageId } = await response.json();
        additions.push({
          storageId,
          isMain: false,
          fileName: file.name,
          contentType: file.type,
          publishFb: true,
          publishIg: true,
          url: URL.createObjectURL(file),
        });
      }

      await applyUpdate(
        (current) => {
          if (target.type === "variant") {
            const variants = current.variants ?? [];
            const updatedVariants = variants.map((variant) => {
              if (variant.id !== target.variantId) return variant;
              const merged = ensureMainImage([...(variant.images ?? []), ...additions]);
              return { ...variant, images: merged };
            });
            return { ...current, variants: updatedVariants };
          }
          const baseImages = current.images ?? [];
          const merged = ensureMainImage([...baseImages, ...additions]);
          return { ...current, images: merged };
        },
        "Slike dodate.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje slika nije uspelo.");
      throw error;
    } finally {
      setIsUploadingImages(false);
    }
  };
  const isFileDrag = (event: { dataTransfer?: DataTransfer | null }) => {
    const types = event.dataTransfer?.types;
    const items = event.dataTransfer?.items;
    if (!types) return false;
    const hasFiles = Array.from(types).includes("Files");
    if (!hasFiles) return false;
    return Array.from(items ?? []).some((item) => item.kind === "file");
  };

  const handleGalleryDropZoneDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsGalleryDropActive(true);
  };

  const handleGalleryDropZoneDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (!isGalleryDropActive) {
      setIsGalleryDropActive(true);
    }
  };

  const handleGalleryDropZoneDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
    setIsGalleryDropActive(false);
  };

  const handleGalleryDropZoneDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (draggingItem || touchDragActiveRef.current) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsGalleryDropActive(false);
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await uploadImages(files);
    }
  };

  const handleAdDropZoneDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsAdDropActive(true);
  };

  const handleAdDropZoneDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    if (!isAdDropActive) {
      setIsAdDropActive(true);
    }
  };

  const handleAdDropZoneDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    const relatedTarget = event.relatedTarget as Node | null;
    if (relatedTarget && event.currentTarget.contains(relatedTarget)) return;
    setIsAdDropActive(false);
  };

  const handleAdDropZoneDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    if (isTouchDevice) return;
    if (!isFileDrag(event)) return;
    event.preventDefault();
    setIsAdDropActive(false);
    if (isUploadingAdImage) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files);
    event.target.value = "";
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Preuzimanje nije uspelo.");
    }
  };

  const gallery: GalleryItem[] = useMemo(() => {
    if (!product) return [];
    const baseImages =
      product.images?.map((image) => ({
        id: image.storageId,
        storageId: image.storageId,
        url: image.url ?? "",
        alt: product.kpName ?? product.name,
        label: image.isMain ? "Glavna" : "Slika",
        fileName: image.fileName,
        isMain: Boolean(image.isMain),
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
        origin: { type: "product" } as const,
      })) ?? [];
    const variantImages =
      product.variants?.flatMap((variant) =>
        (variant.images ?? []).map((image) => ({
          id: `${variant.id}-${image.storageId}`,
          storageId: image.storageId,
          url: image.url ?? "",
          alt: `${variant.label}`,
          label: variant.label,
          fileName: image.fileName,
          isMain: Boolean(image.isMain),
          publishFb: image.publishFb ?? true,
          publishIg: image.publishIg ?? true,
          origin: { type: "variant" as const, variantId: variant.id },
        })),
      ) ?? [];
    return [...baseImages, ...variantImages].filter((item) => Boolean(item.url));
  }, [product]);
  const filteredGallery = useMemo(() => {
    if (!gallery.length) return [];
    if (imageUploadTarget === "product") {
      return gallery.filter((item) => item.origin.type === "product");
    }
    const variantItems = gallery.filter(
      (item) => item.origin.type === "variant" && item.origin.variantId === imageUploadTarget,
    );
    return variantItems;
  }, [gallery, imageUploadTarget]);
  const openLightbox = useCallback(
    (targetId?: string) => {
      if (!filteredGallery.length) return;
      const items: LightboxItem[] = filteredGallery
        .map((item) => ({
          id: item.id,
          url: item.url,
          alt: item.alt || item.label,
        }))
        .filter((item) => Boolean(item.url));
      if (items.length === 0) return;
      const startIndex =
        targetId && items.some((item) => item.id === targetId)
          ? items.findIndex((item) => item.id === targetId)
          : 0;
      setImageLightbox({ items, index: startIndex < 0 ? 0 : startIndex });
    },
    [filteredGallery, setImageLightbox],
  );
  const handleOpenPreview = useCallback(
    (item: GalleryItem) => {
      if (!item.url) return;
      openLightbox(item.id);
    },
    [openLightbox],
  );
  const handleCloseLightbox = useCallback(() => setImageLightbox(null), [setImageLightbox]);
  const handleStepLightbox = useCallback((direction: 1 | -1) => {
    setImageLightbox((prev) => {
      if (!prev || prev.items.length === 0) return prev;
      const nextIndex = (prev.index + direction + prev.items.length) % prev.items.length;
      return { ...prev, index: nextIndex };
    });
  }, [setImageLightbox]);
  useEffect(() => {
    if (!imageLightbox) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseLightbox();
      } else if (event.key === "ArrowRight") {
        handleStepLightbox(1);
      } else if (event.key === "ArrowLeft") {
        handleStepLightbox(-1);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCloseLightbox, handleStepLightbox, imageLightbox]);
  const draggingIndex = useMemo(
    () => (draggingItem ? filteredGallery.findIndex((item) => item.id === draggingItem.id) : -1),
    [draggingItem, filteredGallery],
  );
  const targetIndex = useMemo(
    () => (dragOverId ? filteredGallery.findIndex((item) => item.id === dragOverId) : -1),
    [dragOverId, filteredGallery],
  );
  const draggingSameGroup =
    draggingItem && dragOverId && targetIndex !== -1
      ? isSameGalleryGroup(draggingItem, filteredGallery[targetIndex])
      : false;
  const showGalleryDropOverlay = isGalleryDropActive && !isTouchDevice;
  const showAdDropOverlay = isAdDropActive && !isTouchDevice;


  return { handleRemoveAllImages, handleAdImageChange, handleRemoveAdImage, handleRemoveSingleImage, handleSetAsMain, handleImagePublishToggle, touchDragActiveRef, handleGalleryDragStart, handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd, handleGalleryDragOver, handleGalleryDrop, handleGalleryDragEnd, handleGalleryTouchCancel, handleGalleryDragLeave, getGalleryGroup, handleOpenReorderInput, handleCancelReorderInput, handleConfirmReorderInput, getShiftClass, handleGalleryDropZoneDragEnter, handleGalleryDropZoneDragOver, handleGalleryDropZoneDragLeave, handleGalleryDropZoneDrop, handleAdDropZoneDragEnter, handleAdDropZoneDragOver, handleAdDropZoneDragLeave, handleAdDropZoneDrop, handleFilesSelected, handleDownloadImage, filteredGallery, handleOpenPreview, handleCloseLightbox, handleStepLightbox, draggingSameGroup, showGalleryDropOverlay, showAdDropOverlay };
}
