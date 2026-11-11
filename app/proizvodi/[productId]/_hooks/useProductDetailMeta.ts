"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { useEffect, useMemo } from "react";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import type { Category } from "@/types/order";
import type { useProductDetailState } from "./useProductDetailState";

type UseProductDetailMetaParams = {
  categories: ReturnType<typeof useProductDetailState>["categories"];
  suppliers: ReturnType<typeof useProductDetailState>["suppliers"];
  product: ReturnType<typeof useProductDetailState>["product"];
  setIsGalleryDropActive: ReturnType<typeof useProductDetailState>["setIsGalleryDropActive"];
  imageUploadTarget: ReturnType<typeof useProductDetailState>["imageUploadTarget"];
  setImageUploadTarget: ReturnType<typeof useProductDetailState>["setImageUploadTarget"];
  setIsAdDropActive: ReturnType<typeof useProductDetailState>["setIsAdDropActive"];
  isTouchDevice: ReturnType<typeof useProductDetailState>["isTouchDevice"];
  setIsTouchDevice: ReturnType<typeof useProductDetailState>["setIsTouchDevice"];
  categorySearch: ReturnType<typeof useProductDetailState>["categorySearch"];
  setSupplierEdits: ReturnType<typeof useProductDetailState>["setSupplierEdits"];
  showAddSupplierForm: ReturnType<typeof useProductDetailState>["showAddSupplierForm"];
  setShowAddSupplierForm: ReturnType<typeof useProductDetailState>["setShowAddSupplierForm"];
  newSupplierId: ReturnType<typeof useProductDetailState>["newSupplierId"];
  setNewSupplierId: ReturnType<typeof useProductDetailState>["setNewSupplierId"];
  newSupplierVariantId: ReturnType<typeof useProductDetailState>["newSupplierVariantId"];
  setNewSupplierVariantId: ReturnType<typeof useProductDetailState>["setNewSupplierVariantId"];
};

export function useProductDetailMeta({ categories, suppliers, product, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, setIsAdDropActive, isTouchDevice, setIsTouchDevice, categorySearch, setSupplierEdits, showAddSupplierForm, setShowAddSupplierForm, newSupplierId, setNewSupplierId, newSupplierVariantId, setNewSupplierVariantId }: UseProductDetailMetaParams) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(mediaQuery.matches);
    update();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(update);
    }
    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", update);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(update);
      }
    };
  }, [setIsTouchDevice]);

  useEffect(() => {
    if (!isTouchDevice) return;
    setIsGalleryDropActive(false);
    setIsAdDropActive(false);
  }, [isTouchDevice, setIsAdDropActive, setIsGalleryDropActive]);

  const productCategories = useMemo(() => {
    if (!product || !categories) return [];
    const map = new Map(categories.map((category) => [category._id, category]));
    return (product.categoryIds ?? []).map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories, product]);
  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    const searchTokens = toSearchTokens(categorySearch.trim());
    if (!searchTokens.length) return list;
    return list.filter((category) =>
      matchesAllTokensInNormalizedText(normalizeSearchText(category.name), searchTokens),
    );
  }, [categories, categorySearch]);
  const variantMap = useMemo(
    () => new Map((product?.variants ?? []).map((variant) => [variant.id, variant])),
    [product?.variants],
  );
  useEffect(() => {
    if (imageUploadTarget === "product") return;
    const exists = (product?.variants ?? []).some((variant) => variant.id === imageUploadTarget);
    if (!exists) {
      setImageUploadTarget("product");
    }
  }, [imageUploadTarget, product?.variants, setImageUploadTarget]);
  const uploadTargetLabel = useMemo(() => {
    if (imageUploadTarget === "product") return "proizvod";
    const variantLabel = variantMap.get(imageUploadTarget)?.label;
    return variantLabel ? `tip \"${variantLabel}\"` : "izabrani tip";
  }, [imageUploadTarget, variantMap]);
  const supplierOffers = useMemo(() => product?.supplierOffers ?? [], [product]);
  const bestSupplierOffer = useMemo(() => {
    if (!supplierOffers.length) return null;
    return supplierOffers.reduce((best, offer) => {
      if (!best || offer.price < best.price) return offer;
      return best;
    }, supplierOffers[0] as (typeof supplierOffers)[number]);
  }, [supplierOffers]);
  useEffect(() => {
    const map: Record<string, string> = {};
    supplierOffers.forEach((offer) => {
      const key = `${offer.supplierId}-${offer.variantId ?? "base"}`;
      map[key] = String(offer.price);
    });
    setSupplierEdits(map);
  }, [supplierOffers, setSupplierEdits]);

  useEffect(() => {
    if (!showAddSupplierForm && supplierOffers.length === 0) {
      setShowAddSupplierForm(true);
    }
  }, [showAddSupplierForm, supplierOffers, setShowAddSupplierForm]);

  useEffect(() => {
    if (!showAddSupplierForm) return;
    if (newSupplierId && suppliers?.some((supplier) => supplier._id === newSupplierId)) return;
    if (!suppliers || suppliers.length === 0) return;
    setNewSupplierId(suppliers[0]._id);
  }, [newSupplierId, showAddSupplierForm, suppliers, setNewSupplierId]);

  useEffect(() => {
    const variants = product?.variants ?? [];
    if (variants.length === 0 && newSupplierVariantId !== "base") {
      setNewSupplierVariantId("base");
      return;
    }
    if (newSupplierVariantId === "base") return;
    const hasVariant = variants.some((variant) => variant.id === newSupplierVariantId);
    if (!hasVariant) {
      setNewSupplierVariantId("base");
    }
  }, [newSupplierVariantId, product, setNewSupplierVariantId]);


  return { productCategories, filteredCategories, variantMap, uploadTargetLabel, supplierOffers, bestSupplierOffer };
}
