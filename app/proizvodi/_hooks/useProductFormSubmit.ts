"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useCallback } from "react";
import { toast } from "sonner";
import { parsePrice, generateId, normalizeSupplierOffersInput, pickBestSupplierOffer, type DraftImage, type DraftAdImage, type SocialPlatform, type NormalizedSupplierOffer } from "../_lib/productHelpers";
import { emptyProductForm, type ProductFormValues, type VariantFormEntry, type SupplierOfferFormEntry } from "../_lib/productForm";
import type { useProductFormState } from "./useProductFormState";
import type { useProductsFeed } from "./useProductsFeed";
import type { useProductsState } from "./useProductsState";

type UseProductFormSubmitParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  isKodMajstor: ReturnType<typeof useProductsState>["isKodMajstor"];
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  setIsModalOpen: ReturnType<typeof useProductsState>["setIsModalOpen"];
  exitConfirmOpen: ReturnType<typeof useProductsState>["exitConfirmOpen"];
  setExitConfirmOpen: ReturnType<typeof useProductsState>["setExitConfirmOpen"];
  editingProduct: ReturnType<typeof useProductsState>["editingProduct"];
  setEditingProduct: ReturnType<typeof useProductsState>["setEditingProduct"];
  editingProductId: ReturnType<typeof useProductsState>["editingProductId"];
  images: ReturnType<typeof useProductsState>["images"];
  setImages: ReturnType<typeof useProductsState>["setImages"];
  variantImages: ReturnType<typeof useProductsState>["variantImages"];
  setVariantImages: ReturnType<typeof useProductsState>["setVariantImages"];
  adImage: ReturnType<typeof useProductsState>["adImage"];
  setAdImage: ReturnType<typeof useProductsState>["setAdImage"];
  setIsUploadingAdImage: ReturnType<typeof useProductsState>["setIsUploadingAdImage"];
  setIsDraggingFiles: ReturnType<typeof useProductsState>["setIsDraggingFiles"];
  setIsAdDragActive: ReturnType<typeof useProductsState>["setIsAdDragActive"];
  categorySearch: ReturnType<typeof useProductsState>["categorySearch"];
  setCategorySearch: ReturnType<typeof useProductsState>["setCategorySearch"];
  setCategoryMenuOpen: ReturnType<typeof useProductsState>["setCategoryMenuOpen"];
  setIsAddingCategory: ReturnType<typeof useProductsState>["setIsAddingCategory"];
  newCategoryName: ReturnType<typeof useProductsState>["newCategoryName"];
  setNewCategoryName: ReturnType<typeof useProductsState>["setNewCategoryName"];
  newCategoryIcon: ReturnType<typeof useProductsState>["newCategoryIcon"];
  setNewCategoryIcon: ReturnType<typeof useProductsState>["setNewCategoryIcon"];
  setIsUploadingCategoryIcon: ReturnType<typeof useProductsState>["setIsUploadingCategoryIcon"];
  variantUploadInputsRef: ReturnType<typeof useProductsState>["variantUploadInputsRef"];
  modalSnapshotRef: ReturnType<typeof useProductsState>["modalSnapshotRef"];
  createProduct: ReturnType<typeof useProductsState>["createProduct"];
  updateProduct: ReturnType<typeof useProductsState>["updateProduct"];
  resetProductsFeed: ReturnType<typeof useProductsFeed>["resetProductsFeed"];
  form: ReturnType<typeof useProductFormState>["form"];
  variants: ReturnType<typeof useProductFormState>["variants"];
};

export function useProductFormSubmit({ sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, setIsUploadingAdImage, setIsDraggingFiles, setIsAdDragActive, categorySearch, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsUploadingCategoryIcon, variantUploadInputsRef, modalSnapshotRef, createProduct, updateProduct, resetProductsFeed, form, variants }: UseProductFormSubmitParams) {
  const buildModalSnapshot = useCallback(() => {
    const values = form.getValues();
    const normalizeImage = (image: DraftImage) => ({
      storageId: image.storageId,
      url: image.url ?? "",
      fileName: image.fileName ?? "",
      fileType: image.fileType ?? "",
      uploadedAt: image.uploadedAt ?? 0,
      publishFb: image.publishFb ?? true,
      publishIg: image.publishIg ?? true,
      isMain: Boolean(image.isMain),
    });
    const normalizedVariantImages = Object.keys(variantImages)
      .sort()
      .map((variantId) => ({
        variantId,
        images: (variantImages[variantId] ?? []).map(normalizeImage),
      }));
    return JSON.stringify({
      editingProductId,
      form: {
        productType: values.productType ?? "single",
        kpName: values.kpName?.trim() ?? "",
        name: values.name?.trim() ?? "",
        nabavnaCena: values.nabavnaCena ?? "",
        nabavnaCenaIsReal: Boolean(values.nabavnaCenaIsReal),
        prodajnaCena: values.prodajnaCena ?? "",
        categoryIds: (values.categoryIds ?? []).filter(Boolean),
        supplierOffers: (values.supplierOffers ?? []).map((offer) => ({
          id: offer.id ?? "",
          supplierId: offer.supplierId ?? "",
          price: offer.price ?? "",
          variantId: offer.variantId ?? "",
        })),
        opisKp: values.opisKp?.trim() ?? "",
        opisFbInsta: values.opisFbInsta?.trim() ?? "",
        publishKp: Boolean(values.publishKp),
        publishFb: Boolean(values.publishFb),
        publishIg: Boolean(values.publishIg),
        publishFbProfile: Boolean(values.publishFbProfile),
        publishMarketplace: Boolean(values.publishMarketplace),
        pickupAvailable: Boolean(values.pickupAvailable),
        variants: (values.variants ?? []).map((variant) => ({
          id: variant.id ?? "",
          label: variant.label?.trim() ?? "",
          nabavnaCena: variant.nabavnaCena ?? "",
          nabavnaCenaIsReal: Boolean(variant.nabavnaCenaIsReal),
          prodajnaCena: variant.prodajnaCena ?? "",
          opis: variant.opis?.trim() ?? "",
          isDefault: Boolean(variant.isDefault),
        })),
      },
      images: images.map(normalizeImage),
      variantImages: normalizedVariantImages,
      adImage: adImage
        ? {
            storageId: adImage.storageId,
            url: adImage.url ?? "",
            fileName: adImage.fileName ?? "",
            fileType: adImage.fileType ?? "",
            uploadedAt: adImage.uploadedAt ?? 0,
          }
        : null,
      categorySearch: categorySearch?.trim() ?? "",
      newCategoryName: newCategoryName?.trim() ?? "",
      newCategoryIcon: newCategoryIcon
        ? {
            storageId: newCategoryIcon.storageId,
            fileName: newCategoryIcon.fileName ?? "",
            contentType: newCategoryIcon.contentType ?? "",
          }
        : null,
    });
  }, [adImage, categorySearch, editingProductId, form, images, newCategoryIcon, newCategoryName, variantImages]);

  const resetForm = () => {
    form.reset(emptyProductForm());
    setExitConfirmOpen(false);
    setImages((previous) => {
      previous.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return [];
    });
    setVariantImages((previous) => {
      Object.values(previous).forEach((list) =>
        list.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        }),
      );
      return {};
    });
    if (adImage?.previewUrl) {
      URL.revokeObjectURL(adImage.previewUrl);
    }
    setAdImage(null);
    variantUploadInputsRef.current = {};
    setEditingProduct(null);
    setIsDraggingFiles(false);
    setIsAdDragActive(false);
    setCategorySearch("");
    setCategoryMenuOpen(false);
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
    setIsUploadingAdImage(false);
  };

  const closeModal = () => {
    resetForm();
    modalSnapshotRef.current = "";
    setIsModalOpen(false);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const requestCloseModal = () => {
    if (!isModalOpen || exitConfirmOpen) return;
    const snapshot = modalSnapshotRef.current;
    const hasChanges = Boolean(snapshot) && snapshot !== buildModalSnapshot();
    if (hasChanges) {
      setExitConfirmOpen(true);
      return;
    }
    closeModal();
  };

  const buildImagePayload = (list: DraftImage[] = []) => {
    if (list.length === 0) return [];
    const next = [...list];
    const mainIndex = next.findIndex((image) => image.isMain);
    if (mainIndex > 0) {
      const [main] = next.splice(mainIndex, 1);
      next.unshift(main);
    }
    return next.map((image, index) => ({
      storageId: image.storageId,
      isMain: index === 0,
      fileName: image.fileName,
      contentType: image.fileType,
      publishFb: image.publishFb ?? true,
      publishIg: image.publishIg ?? true,
      uploadedAt: image.uploadedAt,
    }));
  };

  const buildAdImagePayload = (image: DraftAdImage | null) => {
    if (!image) return null;
    return {
      storageId: image.storageId,
      fileName: image.fileName,
      contentType: image.fileType,
      uploadedAt: image.uploadedAt,
    };
  };

  const publishToSocial = useCallback(
    async (productId: string, options: { publishFb: boolean; publishIg: boolean }) => {
      if (!sessionToken) {
        toast.error("Nedostaje token za objavu na mrezama.");
        return;
      }
      const targets: SocialPlatform[] = [];
      if (options.publishFb) targets.push("facebook");
      if (options.publishIg) targets.push("instagram");
      for (const platform of targets) {
        try {
          const response = await fetch("/api/social", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              platform,
              productId,
              token: sessionToken,
            }),
          });
          const result = await response.json();
          if (!response.ok || result?.error) {
            throw new Error(result?.error || "Objava nije uspela.");
          }
          toast.success(
            platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.",
          );
        } catch (error) {
          console.error(error);
          toast.error(
            platform === "facebook"
              ? "Objava na Facebook nije uspela."
              : "Objava na Instagram nije uspela.",
          );
        }
      }
    },
    [sessionToken],
  );

  const handleSubmit = async (values: ProductFormValues) => {
    const isVariantProduct = values.productType === "variant";
    const baseNabavna = parsePrice(values.nabavnaCena);
    const baseNabavnaIsReal = values.nabavnaCenaIsReal ?? false;
    const baseProdajna = parsePrice(values.prodajnaCena);
    const variantEntries = (values.variants ?? []) as VariantFormEntry[];
    const normalizedOffers: NormalizedSupplierOffer[] = normalizeSupplierOffersInput(
      (values.supplierOffers ?? []) as SupplierOfferFormEntry[],
      variantEntries,
      isVariantProduct,
    );
    const resolveBestOffer = (
      variantId?: string,
      options?: { fallbackToBase?: boolean },
    ): { supplierId: string; price: number } | null => pickBestSupplierOffer(normalizedOffers, variantId, options);
    const variants =
      isVariantProduct && variantEntries.length > 0
        ? variantEntries.map((variant, index) => {
            const imagesForVariant = variantImages[variant.id] ?? [];
            const mappedImages = buildImagePayload(imagesForVariant);
            const bestOffer = resolveBestOffer(variant.id, { fallbackToBase: false });
            const nabavnaCena = bestOffer?.price ?? parsePrice(variant.nabavnaCena);
            return {
              id: variant.id || generateId(),
              label: variant.label.trim() || `Tip ${index + 1}`,
              nabavnaCena,
              nabavnaCenaIsReal: bestOffer ? true : variant.nabavnaCenaIsReal ?? false,
              prodajnaCena: parsePrice(variant.prodajnaCena),
              opis: variant.opis?.trim() ? variant.opis.trim() : undefined,
              isDefault: variant.isDefault,
              images: mappedImages.length ? mappedImages : undefined,
            };
          })
        : undefined;
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const bestOfferForProduct = resolveBestOffer(defaultVariant?.id);
    const fbName = values.name.trim();
    const kpName = values.kpName.trim() || fbName;
    const basePayload = {
      token: sessionToken,
      name: fbName,
      kpName,
      nabavnaCena: bestOfferForProduct?.price ?? defaultVariant?.nabavnaCena ?? baseNabavna,
      nabavnaCenaIsReal:
        bestOfferForProduct?.price !== undefined
          ? true
          : values.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? baseNabavnaIsReal,
      prodajnaCena: defaultVariant?.prodajnaCena ?? baseProdajna,
      opisKp: values.opisKp?.trim() ? values.opisKp.trim() : undefined,
      opisFbInsta: values.opisFbInsta?.trim() ? values.opisFbInsta.trim() : undefined,
      publishKp: Boolean(values.publishKp),
      publishFb: Boolean(values.publishFb),
      publishIg: Boolean(values.publishIg),
      publishFbProfile: Boolean(values.publishFbProfile),
      publishMarketplace: Boolean(values.publishMarketplace),
      pickupAvailable: Boolean(values.pickupAvailable),
      categoryIds: (values.categoryIds ?? []).filter(Boolean),
      images: buildImagePayload(images),
      variants,
      supplierOffers: normalizedOffers.length ? normalizedOffers : undefined,
      adImage: buildAdImagePayload(adImage),
    };
    const payload = isKodMajstor
      ? basePayload
      : {
          ...basePayload,
          publishKp: editingProduct?.publishKp ?? false,
          publishFb: editingProduct?.publishFb ?? false,
          publishIg: editingProduct?.publishIg ?? false,
          publishFbProfile: editingProduct?.publishFbProfile ?? false,
          publishMarketplace: editingProduct?.publishMarketplace ?? false,
        };

    try {
      if (editingProduct) {
        await updateProduct({
          id: editingProduct._id,
          expectedUpdatedAt: editingProduct.updatedAt ?? Date.now(),
          updatedAt: Date.now(),
          ...payload,
        });
        toast.success("Proizvod je azuriran.");
      } else {
        const productId = await createProduct(payload);
        toast.success("Proizvod je dodat.");
        if (productId && (payload.publishFb || payload.publishIg)) {
          await publishToSocial(productId as string, {
            publishFb: payload.publishFb,
            publishIg: payload.publishIg,
          });
        }
      }
      resetProductsFeed();
      closeModal();
    } catch (error) {
      console.error(error);
      toast.error("Cuvanje nije uspelo.");
    }
  };

  return { buildModalSnapshot, closeModal, openCreateModal, requestCloseModal, handleSubmit };
}
