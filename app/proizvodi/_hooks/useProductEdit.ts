"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useEffect } from "react";
import { toast } from "sonner";
import type { Product } from "@/types/order";
import { generateId, type DraftImage } from "../_lib/productHelpers";
import type { useProductCategories } from "./useProductCategories";
import type { useProductFormState } from "./useProductFormState";
import type { useProductsState } from "./useProductsState";

type UseProductEditParams = {
  router: ReturnType<typeof useProductsState>["router"];
  setIsModalOpen: ReturnType<typeof useProductsState>["setIsModalOpen"];
  setEditingProduct: ReturnType<typeof useProductsState>["setEditingProduct"];
  setImages: ReturnType<typeof useProductsState>["setImages"];
  setVariantImages: ReturnType<typeof useProductsState>["setVariantImages"];
  setAdImage: ReturnType<typeof useProductsState>["setAdImage"];
  categoryMenuOpen: ReturnType<typeof useProductsState>["categoryMenuOpen"];
  setCategoryMenuOpen: ReturnType<typeof useProductsState>["setCategoryMenuOpen"];
  categoryDropdownRef: ReturnType<typeof useProductsState>["categoryDropdownRef"];
  form: ReturnType<typeof useProductFormState>["form"];
  resetNewCategoryState: ReturnType<typeof useProductCategories>["resetNewCategoryState"];
};

export function useProductEdit({ router, setIsModalOpen, setEditingProduct, setImages, setVariantImages, setAdImage, categoryMenuOpen, setCategoryMenuOpen, categoryDropdownRef, form, resetNewCategoryState }: UseProductEditParams) {
  const handleStartEdit = (product: Product) => {
    setEditingProduct(product);
    const sourceVariants = product.variants ?? [];
    const mappedVariants = sourceVariants.map((variant, index) => {
      const variantId = variant.id || generateId();
      return {
        id: variantId,
        label: variant.label || `Tip ${index + 1}`,
        nabavnaCena: variant.nabavnaCena.toString(),
        nabavnaCenaIsReal: variant.nabavnaCenaIsReal ?? false,
        prodajnaCena: variant.prodajnaCena.toString(),
        opis: variant.opis ?? "",
        isDefault: variant.isDefault ?? index === 0,
      };
    });
    const mappedSupplierOffers =
      product.supplierOffers?.map((offer) => ({
        id: generateId(),
        supplierId: offer.supplierId,
        price: offer.price.toString(),
        variantId: offer.variantId,
      })) ?? [];
    form.reset({
      productType: (product.variants ?? []).length > 0 ? "variant" : "single",
      kpName: product.kpName ?? product.name,
      name: product.name,
      nabavnaCena: product.nabavnaCena.toString(),
      nabavnaCenaIsReal: product.nabavnaCenaIsReal ?? false,
      prodajnaCena: product.prodajnaCena.toString(),
      supplierOffers: mappedSupplierOffers,
      categoryIds: product.categoryIds ?? [],
      opisKp: product.opisKp ?? "",
      opisFbInsta: product.opisFbInsta ?? product.opis ?? "",
      publishKp: product.publishKp ?? false,
      publishFb: product.publishFb ?? false,
      publishIg: product.publishIg ?? false,
      publishFbProfile: product.publishFbProfile ?? false,
      publishMarketplace: product.publishMarketplace ?? false,
      pickupAvailable: product.pickupAvailable ?? false,
      variants: mappedVariants,
    });
    setImages((prev) => {
      prev.forEach((image) => {
        if (image.previewUrl) {
          URL.revokeObjectURL(image.previewUrl);
        }
      });
      return (product.images ?? []).map((image) => ({
        storageId: image.storageId,
        url: image.url,
        fileName: image.fileName,
        fileType: image.contentType,
        isMain: image.isMain,
        publishFb: image.publishFb ?? true,
        publishIg: image.publishIg ?? true,
        uploadedAt: image.uploadedAt,
      }));
    });
    setVariantImages(() => {
      const map: Record<string, DraftImage[]> = {};
      sourceVariants.forEach((variant, index) => {
        const variantId = mappedVariants[index]?.id ?? variant.id ?? generateId();
        map[variantId] = (variant.images ?? []).map((image) => ({
          storageId: image.storageId,
          url: image.url,
          fileName: image.fileName,
          fileType: image.contentType,
          isMain: image.isMain,
          publishFb: image.publishFb ?? true,
          publishIg: image.publishIg ?? true,
          uploadedAt: image.uploadedAt,
        }));
      });
      return map;
    });
    setAdImage((previous) => {
      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }
      if (!product.adImage) return null;
      return {
        storageId: product.adImage.storageId,
        url: product.adImage.url,
        fileName: product.adImage.fileName,
        fileType: product.adImage.contentType,
        uploadedAt: product.adImage.uploadedAt,
      };
    });
    resetNewCategoryState();
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!categoryDropdownRef.current) return;
      if (categoryDropdownRef.current.contains(event.target as Node)) return;
      setCategoryMenuOpen(false);
      resetNewCategoryState();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryMenuOpen]);

  const handleRowClick = (id: string) => {
    router.push(`/proizvodi/${id}`);
  };

  const handleCreateOrderFromProduct = (product: Product) => {
    if (product.archivedAt) {
      toast.error("Proizvod je u arhivi.");
      return;
    }
    router.push(`/narudzbine?productId=${encodeURIComponent(product._id)}`);
  };

  return { handleStartEdit, handleRowClick, handleCreateOrderFromProduct };
}
