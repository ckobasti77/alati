"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import { type ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailState } from "./useProductDetailState";

type UseProductDetailUpdateParams = {
  normalizeProductImages: ReturnType<typeof useProductDetailState>["normalizeProductImages"];
  sessionToken: ReturnType<typeof useProductDetailState>["sessionToken"];
  updateProduct: ReturnType<typeof useProductDetailState>["updateProduct"];
  setProduct: ReturnType<typeof useProductDetailState>["setProduct"];
  productRef: ReturnType<typeof useProductDetailState>["productRef"];
};

export function useProductDetailUpdate({ normalizeProductImages, sessionToken, updateProduct, setProduct, productRef }: UseProductDetailUpdateParams) {
  const buildUpdatePayload = (
    current: ProductWithUrls,
    options?: { expectedUpdatedAt?: number; updatedAt?: number },
  ) => {
    const variants = current.variants?.map((variant) => ({
      id: variant.id,
      label: variant.label,
      nabavnaCena: variant.nabavnaCena,
      nabavnaCenaIsReal: variant.nabavnaCenaIsReal ?? true,
      prodajnaCena: variant.prodajnaCena,
      isDefault: variant.isDefault,
      opis: variant.opis,
      images: (variant.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
      })),
    }));
    const defaultVariant = variants?.find((variant) => variant.isDefault) ?? variants?.[0];
    const resolvedOpisFb = current.opisFbInsta ?? current.opis;
    return {
      token: sessionToken,
      id: current._id,
      name: current.name,
      kpName: current.kpName ?? current.name,
      nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
      nabavnaCenaIsReal:
        current.nabavnaCenaIsReal ??
        current.variants?.find((variant) => variant.isDefault)?.nabavnaCenaIsReal ??
        defaultVariant?.nabavnaCenaIsReal ??
        true,
      prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
      opis: resolvedOpisFb,
      opisKp: current.opisKp,
      opisFbInsta: resolvedOpisFb,
      publishKp: current.publishKp,
      publishFb: current.publishFb,
      publishIg: current.publishIg,
      publishFbProfile: current.publishFbProfile ?? false,
      publishMarketplace: current.publishMarketplace ?? false,
      pickupAvailable: current.pickupAvailable ?? false,
      categoryIds: current.categoryIds ?? [],
      variants,
      images: (current.images ?? []).map((image) => ({
        storageId: image.storageId,
        isMain: image.isMain,
        fileName: image.fileName,
        contentType: image.contentType,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
      })),
      supplierOffers: current.supplierOffers?.map((offer) => ({
        supplierId: offer.supplierId as any,
        price: offer.price,
        variantId: offer.variantId,
      })),
      adImage: current.adImage
        ? {
            storageId: current.adImage.storageId,
            fileName: current.adImage.fileName,
            contentType: current.adImage.contentType,
            uploadedAt: current.adImage.uploadedAt,
          }
        : null,
      expectedUpdatedAt: options?.expectedUpdatedAt ?? current.updatedAt,
      updatedAt: options?.updatedAt ?? current.updatedAt,
    };
  };

  const applyUpdate = async (updater: (current: ProductWithUrls) => ProductWithUrls, successMessage?: string) => {
    const previous = productRef.current;
    if (!previous) return;
    const expectedUpdatedAt = previous.updatedAt ?? Date.now();
    const optimisticUpdatedAt = Date.now();
    const draft = updater(previous);
    const next = normalizeProductImages({ ...draft, updatedAt: optimisticUpdatedAt });
    productRef.current = next;
    setProduct(next);
    try {
      await updateProduct(buildUpdatePayload(next, { expectedUpdatedAt, updatedAt: optimisticUpdatedAt }));
      if (successMessage) {
        toast.success(successMessage);
      }
    } catch (error) {
      console.error(error);
      productRef.current = previous;
      setProduct(previous);
      const message =
        error instanceof Error && error.message.toLowerCase().includes("medjuvremenu promenjen")
          ? "Proizvod je u međuvremenu promenjen. Osveži stranicu i probaj ponovo."
          : "Čuvanje nije uspelo.";
      toast.error(message);
      throw error;
    }
  };


  return { applyUpdate };
}
