"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { useEffect, useMemo } from "react";
import type { Category } from "@/types/order";
import type { useProductDetailState } from "./useProductDetailState";

type UseProductDetailMetaParams = {
  categories: ReturnType<typeof useProductDetailState>["categories"];
  product: ReturnType<typeof useProductDetailState>["product"];
  setIsGalleryDropActive: ReturnType<typeof useProductDetailState>["setIsGalleryDropActive"];
  imageUploadTarget: ReturnType<typeof useProductDetailState>["imageUploadTarget"];
  setImageUploadTarget: ReturnType<typeof useProductDetailState>["setImageUploadTarget"];
  setIsAdDropActive: ReturnType<typeof useProductDetailState>["setIsAdDropActive"];
  isTouchDevice: ReturnType<typeof useProductDetailState>["isTouchDevice"];
  setIsTouchDevice: ReturnType<typeof useProductDetailState>["setIsTouchDevice"];
};

export function useProductDetailMeta({ categories, product, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, setIsAdDropActive, isTouchDevice, setIsTouchDevice }: UseProductDetailMetaParams) {
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
    // Pravilo "nabavna po tipu": samo ponude sa variantId izabranog tipa; ako ih nema, page.tsx pali na nabavnaCena.
    const defaultVariant = product?.variants?.find((variant) => variant.isDefault) ?? product?.variants?.[0];
    const pool = defaultVariant?.id
      ? supplierOffers.filter((offer) => offer.variantId === defaultVariant.id)
      : supplierOffers.filter((offer) => !offer.variantId);
    if (!pool.length) return null;
    return pool.reduce((best, offer) => {
      if (!best || offer.price < best.price) return offer;
      return best;
    }, pool[0] as (typeof supplierOffers)[number]);
  }, [supplierOffers, product]);


  return { productCategories, uploadTargetLabel, bestSupplierOffer };
}
