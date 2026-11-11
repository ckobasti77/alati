"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { ChangeEvent, useCallback, useEffect } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { toast } from "sonner";
import { type DraftImage, type LightboxItem } from "../_lib/productHelpers";
import type { useProductMediaInbox } from "./useProductMediaInbox";
import type { useProductsState } from "./useProductsState";
import type { } from "./useProductsView";

type UseProductImagesParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  images: ReturnType<typeof useProductsState>["images"];
  setImages: ReturnType<typeof useProductsState>["setImages"];
  setVariantImages: ReturnType<typeof useProductsState>["setVariantImages"];
  imageLightbox: ReturnType<typeof useProductsState>["imageLightbox"];
  setImageLightbox: ReturnType<typeof useProductsState>["setImageLightbox"];
  isUploadingImages: ReturnType<typeof useProductsState>["isUploadingImages"];
  setIsUploadingImages: ReturnType<typeof useProductsState>["setIsUploadingImages"];
  setIsDraggingFiles: ReturnType<typeof useProductsState>["setIsDraggingFiles"];
  setIsInboxDragActive: ReturnType<typeof useProductsState>["setIsInboxDragActive"];
  variantUploadInputsRef: ReturnType<typeof useProductsState>["variantUploadInputsRef"];
  productUploadInputRef: ReturnType<typeof useProductsState>["productUploadInputRef"];
  dialogScrollRef: ReturnType<typeof useProductsState>["dialogScrollRef"];
  generateUploadUrl: ReturnType<typeof useProductsState>["generateUploadUrl"];
  openLightbox: ReturnType<typeof useProductMediaInbox>["openLightbox"];
  uploadInboxImages: ReturnType<typeof useProductMediaInbox>["uploadInboxImages"];
};

export function useProductImages({ sessionToken, isModalOpen, images, setImages, setVariantImages, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, setIsDraggingFiles, setIsInboxDragActive, variantUploadInputsRef, productUploadInputRef, dialogScrollRef, generateUploadUrl, openLightbox, uploadInboxImages }: UseProductImagesParams) {
  const uploadImages = useCallback(
    async (
      fileList: FileList | File[],
      target: { type: "product" } | { type: "variant"; variantId: string } = { type: "product" },
    ) => {
      if (isUploadingImages) {
        toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
        return;
      }

      const acceptedFiles = Array.from(fileList instanceof FileList ? fileList : fileList).filter((file) => {
        if (file.type) return file.type.startsWith("image/");
        return /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
      });

      if (acceptedFiles.length === 0) {
        toast.error("Prevuci ili izaberi fajlove tipa slike.");
        return;
      }

      setIsUploadingImages(true);
      try {
        for (const file of acceptedFiles) {
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
          const previewUrl = URL.createObjectURL(file);
          if (target.type === "product") {
            setImages((prev) => {
              const hasMain = prev.some((image) => image.isMain);
              return [
                ...prev,
                {
                  storageId,
                  previewUrl,
                  fileName: file.name,
                  fileType: file.type,
                  publishFb: true,
                  publishIg: true,
                  uploadedAt: Date.now(),
                  isMain: hasMain ? false : true,
                },
              ];
            });
          } else {
            setVariantImages((prev) => {
              const current = prev[target.variantId] ?? [];
              const hasMain = current.some((image) => image.isMain);
              return {
                ...prev,
                [target.variantId]: [
                  ...current,
                  {
                    storageId,
                    previewUrl,
                    fileName: file.name,
                    fileType: file.type,
                    publishFb: true,
                    publishIg: true,
                    uploadedAt: Date.now(),
                    isMain: hasMain ? false : true,
                  },
                ],
              };
            });
          }
        }
        toast.success("Slike su uploadovane.");
      } catch (error) {
        console.error(error);
        toast.error("Upload slike nije uspeo.");
      } finally {
        setIsUploadingImages(false);
      }
    },
    [generateUploadUrl, isUploadingImages, sessionToken, setImages, setIsUploadingImages, setVariantImages],
  );

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    await uploadImages(files, { type: "product" });
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDropFiles = async (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingFiles(false);
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    await uploadImages(files, { type: "product" });
  };

  const handleVariantFilesSelected = async (variantId: string, event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadImages(files, { type: "variant", variantId });
    event.target.value = "";
  };

  const handleDragEnter = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFiles) {
      setIsDraggingFiles(true);
    }
  };

  const handleDragOver = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
    if (hasFiles) {
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsDraggingFiles(true);
    }
  };

  const handleDragLeave = (event: ReactDragEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDraggingFiles(false);
    }
  };

  const handleOpenVariantPicker = (variantId: string) => {
    if (isUploadingImages) {
      toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
      return;
    }
    const scrollContainer = dialogScrollRef.current;
    const prevScroll = scrollContainer?.scrollTop ?? null;
    variantUploadInputsRef.current[variantId]?.click();
    requestAnimationFrame(() => {
      if (prevScroll !== null && scrollContainer) {
        scrollContainer.scrollTo({ top: prevScroll });
      }
    });
  };

  const handleOpenProductPicker = () => {
    if (isUploadingImages) {
      toast.info("Sacekaj da se zavrsi trenutno otpremanje.");
      return;
    }
    const scrollContainer = dialogScrollRef.current;
    const prevScroll = scrollContainer?.scrollTop ?? null;
    productUploadInputRef.current?.click();
    requestAnimationFrame(() => {
      if (prevScroll !== null && scrollContainer) {
        scrollContainer.scrollTo({ top: prevScroll });
      }
    });
  };

  useEffect(() => {
    if (isModalOpen) {
      setIsInboxDragActive(false);
      return;
    }

    const handleWindowDragOver = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (!hasFiles) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsInboxDragActive(true);
    };

    const handleWindowDrop = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (!hasFiles) return;
      event.preventDefault();
      setIsInboxDragActive(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        void uploadInboxImages(files);
      }
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      const leavingDocument = !event.relatedTarget && event.clientX === 0 && event.clientY === 0;
      if (leavingDocument) {
        setIsInboxDragActive(false);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragleave", handleWindowDragLeave);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, [isModalOpen, uploadInboxImages, setIsInboxDragActive]);

  useEffect(() => {
    if (!isModalOpen) {
      setIsDraggingFiles(false);
      return;
    }

    const handleWindowDragOver = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (hasFiles) {
        event.preventDefault();
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "copy";
        }
        setIsDraggingFiles(true);
      }
    };

    const handleWindowDrop = (event: DragEvent) => {
      const hasFiles = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === "file");
      if (!hasFiles) return;
      event.preventDefault();
      setIsDraggingFiles(false);
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        uploadImages(files, { type: "product" });
      }
    };

    const handleWindowDragLeave = (event: DragEvent) => {
      const leavingDocument = !event.relatedTarget && event.clientX === 0 && event.clientY === 0;
      if (leavingDocument) {
        setIsDraggingFiles(false);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragleave", handleWindowDragLeave);
    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragleave", handleWindowDragLeave);
    };
  }, [isModalOpen, uploadImages, setIsDraggingFiles]);

  const handleSetMainImage = (storageId: string) => {
    setImages((prev) => prev.map((image) => ({ ...image, isMain: image.storageId === storageId })));
  };

  const buildLightboxItems = useCallback((list: DraftImage[]): LightboxItem[] => {
    return list
      .map((image) => {
        const url = image.url ?? image.previewUrl;
        if (!url) return null;
        return {
          id: image.storageId,
          url,
          alt: image.fileName ?? "Pregled slike",
        };
      })
      .filter(Boolean) as LightboxItem[];
  }, []);

  const handleOpenImageGroup = useCallback(
    (list: DraftImage[], targetId: string) => {
      const items = buildLightboxItems(list);
      openLightbox(items, targetId);
    },
    [buildLightboxItems, openLightbox],
  );

  const handleStepLightbox = useCallback((direction: 1 | -1) => {
    setImageLightbox((prev) => {
      if (!prev || prev.items.length === 0) return prev;
      const nextIndex = (prev.index + direction + prev.items.length) % prev.items.length;
      return { ...prev, index: nextIndex };
    });
  }, [setImageLightbox]);

  const handleCloseLightbox = useCallback(() => setImageLightbox(null), [setImageLightbox]);

  useEffect(() => {
    setImageLightbox(null);
  }, [images.length, setImageLightbox]);

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

  const handleSetVariantMainImage = (variantId: string, storageId: string) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      return {
        ...prev,
        [variantId]: current.map((image) => ({ ...image, isMain: image.storageId === storageId })),
      };
    });
  };

  const handleToggleImagePublish = (storageId: string, field: "publishFb" | "publishIg", value: boolean) => {
    setImages((prev) => prev.map((image) => (image.storageId === storageId ? { ...image, [field]: value } : image)));
  };

  const handleToggleVariantImagePublish = (
    variantId: string,
    storageId: string,
    field: "publishFb" | "publishIg",
    value: boolean,
  ) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      return {
        ...prev,
        [variantId]: current.map((image) => (image.storageId === storageId ? { ...image, [field]: value } : image)),
      };
    });
  };

  const handleRemoveImage = (storageId: string) => {
    setImages((prev) => {
      const filtered = prev.filter((image) => {
        if (image.storageId === storageId && image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        return image.storageId !== storageId;
      });
      if (filtered.length > 0 && !filtered.some((image) => image.isMain)) {
        filtered[0] = { ...filtered[0], isMain: true };
      }
      return filtered;
    });
  };

  const handleRemoveVariantImage = (variantId: string, storageId: string) => {
    setVariantImages((prev) => {
      const current = prev[variantId] ?? [];
      const filtered = current.filter((image) => {
        if (image.storageId === storageId && image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
        return image.storageId !== storageId;
      });
      if (filtered.length > 0 && !filtered.some((image) => image.isMain)) {
        filtered[0] = { ...filtered[0], isMain: true };
      }
      return { ...prev, [variantId]: filtered };
    });
  };

  return { handleFilesSelected, handleDropFiles, handleVariantFilesSelected, handleDragEnter, handleDragOver, handleDragLeave, handleOpenVariantPicker, handleOpenProductPicker, handleSetMainImage, handleOpenImageGroup, handleStepLightbox, handleCloseLightbox, handleSetVariantMainImage, handleToggleImagePublish, handleToggleVariantImagePublish, handleRemoveImage, handleRemoveVariantImage };
}
