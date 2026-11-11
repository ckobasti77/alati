"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import { type ProductWithUrls } from "../_lib/detailTypes";
import { parsePrice } from "../../_lib/productHelpers";
import type { useProductDetailState } from "./useProductDetailState";
import type { useProductDetailUpdate } from "./useProductDetailUpdate";

type UseProductSupplierOffersParams = {
  product: ReturnType<typeof useProductDetailState>["product"];
  supplierEdits: ReturnType<typeof useProductDetailState>["supplierEdits"];
  setSupplierEdits: ReturnType<typeof useProductDetailState>["setSupplierEdits"];
  newSupplierId: ReturnType<typeof useProductDetailState>["newSupplierId"];
  newSupplierVariantId: ReturnType<typeof useProductDetailState>["newSupplierVariantId"];
  newSupplierPrice: ReturnType<typeof useProductDetailState>["newSupplierPrice"];
  setNewSupplierPrice: ReturnType<typeof useProductDetailState>["setNewSupplierPrice"];
  setIsSavingSupplierOffer: ReturnType<typeof useProductDetailState>["setIsSavingSupplierOffer"];
  applyUpdate: ReturnType<typeof useProductDetailUpdate>["applyUpdate"];
};

export function useProductSupplierOffers({ product, supplierEdits, setSupplierEdits, newSupplierId, newSupplierVariantId, newSupplierPrice, setNewSupplierPrice, setIsSavingSupplierOffer, applyUpdate }: UseProductSupplierOffersParams) {
  const supplierOfferKey = (offer: { supplierId: string; variantId?: string }) =>
    `${offer.supplierId}-${offer.variantId ?? "base"}`;

  const resolveSupplierPriceForVariant = (
    offers: { price: number; variantId?: string }[] | undefined,
    variantId?: string,
    options?: { fallbackToBase?: boolean },
  ) => {
    if (!offers || offers.length === 0) return undefined;
    const exactMatches = offers.filter((offer) => (offer.variantId ?? null) === (variantId ?? null));
    const fallbackMatches = options?.fallbackToBase === false ? [] : offers.filter((offer) => !offer.variantId);
    const pool = exactMatches.length > 0 ? exactMatches : fallbackMatches;
    if (pool.length === 0) return undefined;
    return pool.reduce((min, offer) => Math.min(min, offer.price), Number.POSITIVE_INFINITY);
  };

  const applySupplierOffersDraft = (
    current: ProductWithUrls,
    offers: { supplierId: string; price: number; variantId?: string }[],
  ): ProductWithUrls => {
    const seen = new Set<string>();
    const normalized = offers.reduce<typeof offers>((list, offer) => {
      const key = supplierOfferKey(offer);
      if (seen.has(key)) return list;
      seen.add(key);
      const price = Number.isFinite(offer.price) ? Math.max(offer.price, 0) : 0;
      const variantId = offer.variantId?.trim() || undefined;
      list.push({ supplierId: offer.supplierId, price, variantId });
      return list;
    }, []);
    const variants = (current.variants ?? []).map((variant) => {
      const supplierPrice = resolveSupplierPriceForVariant(normalized, variant.id, { fallbackToBase: false });
      if (supplierPrice === undefined) return variant;
      return { ...variant, nabavnaCena: supplierPrice, nabavnaCenaIsReal: true };
    });
    const defaultVariant = variants.find((variant) => variant.isDefault) ?? variants[0];
    const supplierPrice = resolveSupplierPriceForVariant(normalized, defaultVariant?.id);
    const nabavnaCenaIsReal =
      supplierPrice !== undefined
        ? true
        : current.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true;
    return {
      ...current,
      variants: variants.length ? variants : undefined,
      supplierOffers: normalized as any,
      nabavnaCena: supplierPrice ?? defaultVariant?.nabavnaCena ?? current.nabavnaCena,
      nabavnaCenaIsReal,
    };
  };

  const handleSupplierPriceChange = (key: string, value: string) => {
    setSupplierEdits((prev) => ({ ...prev, [key]: value }));
  };

  const handleSupplierPriceSave = async (offer: { supplierId: string; variantId?: string }) => {
    const key = supplierOfferKey(offer);
    const raw = supplierEdits[key] ?? "";
    const parsed = parsePrice(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Unesi ispravnu cenu za dobavljaca.");
      return;
    }
    const updatedAt = Date.now();
    await applyUpdate(
      (current) => {
        const nextOffers = (current.supplierOffers ?? []).map((item) =>
          supplierOfferKey(item) === key ? { ...item, price: parsed } : item,
        );
        return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
      },
      "Cena dobavljaca sacuvana.",
    );
  };

  const handleAddSupplierOffer = async () => {
    if (!product) return;
    if (!newSupplierId) {
      toast.error("Izaberi dobavljaca.");
      return;
    }
    const parsed = parsePrice(newSupplierPrice);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.error("Unesi ispravnu cenu za dobavljaca.");
      return;
    }
    const variantId =
      (product.variants ?? []).length > 0 && newSupplierVariantId !== "base" ? newSupplierVariantId : undefined;
    setIsSavingSupplierOffer(true);
    const updatedAt = Date.now();
    const newKey = supplierOfferKey({ supplierId: newSupplierId, variantId });
    try {
      await applyUpdate(
        (current) => {
          const existing = current.supplierOffers ?? [];
          const hasExisting = existing.some((item) => supplierOfferKey(item) === newKey);
          const nextOffers = hasExisting
            ? existing.map((item) => (supplierOfferKey(item) === newKey ? { ...item, price: parsed } : item))
            : [...existing, { supplierId: newSupplierId as any, price: parsed, variantId }];
          return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
        },
        "Ponuda dobavljaca sacuvana.",
      );
      setNewSupplierPrice("");
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje dobavljaca nije uspelo.");
    } finally {
      setIsSavingSupplierOffer(false);
    }
  };

  const handleRemoveSupplierOffer = async (offer: { supplierId: string; variantId?: string }) => {
    const key = supplierOfferKey(offer);
    const confirmDelete = window.confirm("Da li sigurno zelis da uklonis ovog dobavljaca sa proizvoda?");
    if (!confirmDelete) return;
    const updatedAt = Date.now();
    await applyUpdate(
      (current) => {
        const nextOffers = (current.supplierOffers ?? []).filter((item) => supplierOfferKey(item) !== key);
        return { ...applySupplierOffersDraft(current, nextOffers as any), updatedAt };
      },
      "Ponuda dobavljaca uklonjena.",
    );
  };


  return { supplierOfferKey, handleSupplierPriceChange, handleSupplierPriceSave, handleAddSupplierOffer, handleRemoveSupplierOffer };
}
