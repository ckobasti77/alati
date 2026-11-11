"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { ChangeEvent, useCallback } from "react";
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
import { type InboxImageStatus, type LightboxItem } from "../_lib/productHelpers";
import type { useProductsState } from "./useProductsState";
import type { useProductsView } from "./useProductsView";

type UseProductMediaInboxParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  adImage: ReturnType<typeof useProductsState>["adImage"];
  setAdImage: ReturnType<typeof useProductsState>["setAdImage"];
  setImageLightbox: ReturnType<typeof useProductsState>["setImageLightbox"];
  setIsUploadingAdImage: ReturnType<typeof useProductsState>["setIsUploadingAdImage"];
  setIsAdDragActive: ReturnType<typeof useProductsState>["setIsAdDragActive"];
  isUploadingInboxImages: ReturnType<typeof useProductsState>["isUploadingInboxImages"];
  setIsUploadingInboxImages: ReturnType<typeof useProductsState>["setIsUploadingInboxImages"];
  inboxView: ReturnType<typeof useProductsState>["inboxView"];
  setInboxContextMenu: ReturnType<typeof useProductsState>["setInboxContextMenu"];
  inboxUploadInputRef: ReturnType<typeof useProductsState>["inboxUploadInputRef"];
  addInboxImage: ReturnType<typeof useProductsState>["addInboxImage"];
  updateInboxImage: ReturnType<typeof useProductsState>["updateInboxImage"];
  deleteInboxImage: ReturnType<typeof useProductsState>["deleteInboxImage"];
  generateUploadUrl: ReturnType<typeof useProductsState>["generateUploadUrl"];
  inboxList: ReturnType<typeof useProductsView>["inboxList"];
};

export function useProductMediaInbox({ sessionToken, adImage, setAdImage, setImageLightbox, setIsUploadingAdImage, setIsAdDragActive, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxContextMenu, inboxUploadInputRef, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl, inboxList }: UseProductMediaInboxParams) {
  const openLightbox = useCallback((items: LightboxItem[], targetId?: string) => {
    const validItems = items.filter((item) => Boolean(item.url));
    if (validItems.length === 0) return;
    const startIndex =
      targetId && validItems.some((item) => item.id === targetId)
        ? validItems.findIndex((item) => item.id === targetId)
        : 0;
    setImageLightbox({ items: validItems, index: startIndex < 0 ? 0 : startIndex });
  }, [setImageLightbox]);

  const uploadAdImage = async (file: File) => {
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
      if (adImage?.previewUrl) {
        URL.revokeObjectURL(adImage.previewUrl);
      }
      setAdImage({
        storageId,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type,
        uploadedAt: Date.now(),
      });
      toast.success("Glavna slika sacuvana.");
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje glavne slike nije uspelo.");
    } finally {
      setIsUploadingAdImage(false);
    }
  };

  const handleAdImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    event.target.value = "";
  };

  const handleAdDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await uploadAdImage(file);
    }
    setIsAdDragActive(false);
  };

  const uploadInboxImages = useCallback(
    async (files: FileList | null, options?: { status?: InboxImageStatus }) => {
      if (!files || files.length === 0) return;
      if (isUploadingInboxImages) {
        toast.info("Otpremanje slika je vec u toku.");
        return;
      }
      const imagesOnly = Array.from(files).filter(
        (file) => file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name),
      );
      if (imagesOnly.length === 0) {
        toast.error("Izaberi fajlove tipa slike.");
        return;
      }
      setIsUploadingInboxImages(true);
      const targetStatus = options?.status ?? inboxView ?? "withPurchasePrice";
      try {
        for (const file of imagesOnly) {
          const uploadUrl = await generateUploadUrl({ token: sessionToken });
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file,
          });
          if (!response.ok) {
            throw new Error("Upload nije uspeo.");
          }
          const result = await response.json();
          if (!result?.storageId) {
            throw new Error("Nedostaje ID fajla.");
          }
          await addInboxImage({
            token: sessionToken,
            storageId: result.storageId as string,
            fileName: file.name,
            contentType: file.type,
            uploadedAt: Date.now(),
            hasPurchasePrice: targetStatus === "withoutPurchasePrice",
            status: targetStatus,
          });
        }
        toast.success("Slike su dodate u inbox za ubacivanje.");
      } catch (error) {
        console.error(error);
        toast.error("Otpremanje slika nije uspelo.");
      } finally {
        setIsUploadingInboxImages(false);
        if (inboxUploadInputRef.current) {
          inboxUploadInputRef.current.value = "";
        }
      }
    },
    [addInboxImage, generateUploadUrl, inboxView, isUploadingInboxImages, sessionToken, inboxUploadInputRef, setIsUploadingInboxImages],
  );

  const handleInboxFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    await uploadInboxImages(files);
    event.target.value = "";
  };

  const handleDeleteInboxImage = async (id: string) => {
    try {
      await deleteInboxImage({ token: sessionToken, id });
      setImageLightbox((prev) => {
        if (!prev) return prev;
        const filtered = prev.items.filter((item) => item.deleteId !== id);
        if (filtered.length === 0) return null;
        const nextIndex = Math.min(prev.index, filtered.length - 1);
        return { items: filtered, index: nextIndex };
      });
      toast.success("Slika je obrisana.");
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce obrisati sliku.");
    }
  };

  const handleMoveInboxImage = async (id: string, status: InboxImageStatus) => {
    try {
      await updateInboxImage({ token: sessionToken, id, status });
      toast.success(
        status === "skip"
          ? "Slika oznacena za ne ubacivati."
          : status === "withoutPurchasePrice"
            ? "Slika prebacena u Bez nabavne."
            : "Slika vracena u Sa nabavnom.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Nije moguce promeniti grupu slike.");
    } finally {
      setInboxContextMenu(null);
    }
  };

  const handleOpenInboxPreview = (index: number) => {
    setInboxContextMenu(null);
    const items: LightboxItem[] = inboxList
      .map((image) => {
        const url = image.url ?? "";
        if (!url) return null;
        return {
          id: image._id,
          url,
          alt: image.fileName ?? "Inbox slika",
          downloadUrl: url,
          downloadName: image.fileName ?? "inbox-slika.jpg",
          deleteId: image._id,
        };
      })
      .filter(Boolean) as LightboxItem[];
    if (items.length === 0) return;
    const targetId = items[index]?.id;
    openLightbox(items, targetId);
  };

  const handleInboxContextMenu = (event: ReactMouseEvent, imageId: string) => {
    event.preventDefault();
    const margin = 8;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const desiredMenuWidth = 210;
    const menuWidth = Math.min(desiredMenuWidth, viewportWidth - margin * 2);
    const menuHeight = 130;
    const triggerRect = (event.currentTarget as HTMLElement | null)?.getBoundingClientRect();
    const isMobile = viewportWidth <= 640;

    let x = triggerRect ? triggerRect.right + margin : event.clientX || margin;
    let y = triggerRect ? triggerRect.bottom + margin : event.clientY || margin;

    if (triggerRect) {
      const wouldOverflowRight = x + menuWidth + margin > viewportWidth;
      if (isMobile || wouldOverflowRight) {
        x = triggerRect.left - menuWidth - margin;
      }
      const wouldOverflowBottom = y + menuHeight + margin > viewportHeight;
      if (wouldOverflowBottom) {
        y = triggerRect.top - menuHeight - margin;
      }
    }

    x = Math.min(Math.max(margin, x), viewportWidth - menuWidth - margin);
    y = Math.min(Math.max(margin, y), viewportHeight - menuHeight - margin);

    setInboxContextMenu({ x, y, width: menuWidth, imageId });
  };

  const handleCloseInboxContextMenu = () => setInboxContextMenu(null);

  const handleDownloadInboxImage = async (url?: string | null, fileName?: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = fileName?.trim() ? fileName : "slika.jpg";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
      toast.error("Preuzimanje slike nije uspelo.");
    }
  };

  const handleAdDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFile = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFile) {
      setIsAdDragActive(true);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }
  };

  const handleAdDragLeave = (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsAdDragActive(false);
    }
  };

  const handleRemoveAdImage = () => {
    if (adImage?.previewUrl) {
      URL.revokeObjectURL(adImage.previewUrl);
    }
    setAdImage(null);
  };

  return { openLightbox, handleAdImageChange, handleAdDrop, uploadInboxImages, handleInboxFilesSelected, handleDeleteInboxImage, handleMoveInboxImage, handleOpenInboxPreview, handleInboxContextMenu, handleCloseInboxContextMenu, handleDownloadInboxImage, handleAdDragOver, handleAdDragLeave, handleRemoveAdImage };
}
