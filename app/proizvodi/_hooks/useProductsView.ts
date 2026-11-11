"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/format";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import type { Category, InboxImage, Product, ProductStats } from "@/types/order";
import { type InboxImageStatus } from "../_lib/productHelpers";
import type { useProductFormState } from "./useProductFormState";
import type { useProductsState } from "./useProductsState";

type UseProductsViewParams = {
  archiveView: ReturnType<typeof useProductsState>["archiveView"];
  sortBy: ReturnType<typeof useProductsState>["sortBy"];
  productSearch: ReturnType<typeof useProductsState>["productSearch"];
  productFeed: ReturnType<typeof useProductsState>["productFeed"];
  categorySearch: ReturnType<typeof useProductsState>["categorySearch"];
  inboxView: ReturnType<typeof useProductsState>["inboxView"];
  inboxContextMenu: ReturnType<typeof useProductsState>["inboxContextMenu"];
  setInboxContextMenu: ReturnType<typeof useProductsState>["setInboxContextMenu"];
  productStats: ReturnType<typeof useProductsState>["productStats"];
  categories: ReturnType<typeof useProductsState>["categories"];
  suppliers: ReturnType<typeof useProductsState>["suppliers"];
  inboxImages: ReturnType<typeof useProductsState>["inboxImages"];
  form: ReturnType<typeof useProductFormState>["form"];
  categoryIds: ReturnType<typeof useProductFormState>["categoryIds"];
  resolvedProductType: ReturnType<typeof useProductFormState>["resolvedProductType"];
  normalizedVariants: ReturnType<typeof useProductFormState>["normalizedVariants"];
  supplierMap: ReturnType<typeof useProductFormState>["supplierMap"];
  bestSupplierForVariant: ReturnType<typeof useProductFormState>["bestSupplierForVariant"];
};

export function useProductsView({ archiveView, sortBy, productSearch, productFeed, categorySearch, inboxView, inboxContextMenu, setInboxContextMenu, productStats, categories, suppliers, inboxImages, form, categoryIds, resolvedProductType, normalizedVariants, supplierMap, bestSupplierForVariant }: UseProductsViewParams) {
  const items = useMemo(() => productFeed, [productFeed]);
  const statsMap = useMemo(() => {
    const map = new Map<string, ProductStats>();
    (productStats ?? []).forEach((entry) => {
      map.set(String(entry.productId), entry);
    });
    return map;
  }, [productStats]);
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    (categories ?? []).forEach((category) => {
      map.set(category._id, category);
    });
    return map;
  }, [categories]);
  const filteredProducts = useMemo(() => items, [items]);
  const filteredCategories = useMemo(() => {
    const list = categories ?? [];
    const searchTokens = toSearchTokens(categorySearch.trim());
    if (!searchTokens.length) return list;
    return list.filter((category) =>
      matchesAllTokensInNormalizedText(normalizeSearchText(category.name), searchTokens),
    );
  }, [categories, categorySearch]);
  const hasProductSearch = productSearch.trim().length > 0;
  const selectedCategories = useMemo(() => {
    if (!categories) return [];
    const map = new Map(categories.map((category) => [category._id, category]));
    return categoryIds.map((id) => map.get(id)).filter(Boolean) as Category[];
  }, [categories, categoryIds]);
  const variantsFieldError = form.formState.errors.variants;
  const variantsError =
    variantsFieldError && !Array.isArray(variantsFieldError) ? (variantsFieldError.message as string | undefined) : undefined;
  const getPrimaryVariant = useCallback((product: Product) => {
    const list = product.variants ?? [];
    return list.find((variant) => variant.isDefault) ?? list[0];
  }, []);
  const getProductPrice = useCallback(
    (product: Product) => {
      const primary = getPrimaryVariant(product);
      return primary?.prodajnaCena ?? product.prodajnaCena;
    },
    [getPrimaryVariant],
  );
  const getDisplayPrice = useCallback(
    (product: Product) => {
      return formatCurrency(getProductPrice(product), "EUR");
    },
    [getProductPrice],
  );
  const getBestSupplier = useCallback(
    (product: Product) => {
      const offers = product.supplierOffers ?? [];
      if (!offers.length) return null;
      const primary = getPrimaryVariant(product);
      const pool = primary
        ? offers.filter((offer) => (offer.variantId ?? null) === (primary.id ?? null) || !offer.variantId)
        : offers.filter((offer) => !offer.variantId);
      const relevant = pool.length > 0 ? pool : offers;
      if (!relevant.length) return null;
      let best = relevant[0];
      relevant.forEach((offer) => {
        if (offer.price < best.price) {
          best = offer;
        }
      });
      const supplier = supplierMap.get(String(best.supplierId));
      return {
        supplierId: String(best.supplierId),
        supplierName: supplier?.name,
        price: best.price,
      };
    },
    [getPrimaryVariant, supplierMap],
  );
  const getMainImage = useCallback((product: Product) => {
    const images = product.images ?? [];
    return images.find((image) => image.isMain) ?? images[0];
  }, []);
  const hasSocialMainImage = useCallback((product: Product) => {
    return Boolean(product.adImage?.url ?? product.adImage?.storageId);
  }, []);
  const getSalesCount = useCallback(
    (product: Product) => statsMap.get(String(product._id))?.salesCount ?? 0,
    [statsMap],
  );
  const getProfit = useCallback((product: Product) => statsMap.get(String(product._id))?.profit ?? 0, [statsMap]);
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    const byPriceAsc = (a: Product, b: Product) => getProductPrice(a) - getProductPrice(b);
    switch (sortBy) {
      case "price_asc":
        return list.sort(byPriceAsc);
      case "price_desc":
        return list.sort((a, b) => byPriceAsc(b, a));
      case "sales_desc":
        return list.sort((a, b) => getSalesCount(b) - getSalesCount(a));
      case "profit_desc":
        return list.sort((a, b) => getProfit(b) - getProfit(a));
      case "created_desc":
      default:
        return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    }
  }, [filteredProducts, getProductPrice, sortBy, getSalesCount, getProfit]);
  const visibleProducts = sortedProducts;
  const defaultVariantEntry =
    resolvedProductType === "variant"
      ? normalizedVariants.find((variant) => variant.isDefault) ?? normalizedVariants[0]
      : undefined;
  const bestFormOffer = useMemo(
    () => bestSupplierForVariant(resolvedProductType === "variant" ? defaultVariantEntry?.id : undefined),
    [bestSupplierForVariant, defaultVariantEntry?.id, resolvedProductType],
  );
  const bestFormSupplierName = bestFormOffer ? supplierMap.get(bestFormOffer.supplierId)?.name : undefined;
  const resolveInboxStatus = useCallback((image: InboxImage): InboxImageStatus => {
    if (
      image.status === "withPurchasePrice" ||
      image.status === "withoutPurchasePrice" ||
      image.status === "skip"
    ) {
      return image.status;
    }
    return image.hasPurchasePrice === true ? "withoutPurchasePrice" : "withPurchasePrice";
  }, []);
  const inboxImagesList = (inboxImages ?? []).map((image) => ({
    ...image,
    status: resolveInboxStatus(image),
  }));
  const inboxSplit = useMemo(() => {
    const withPrice = inboxImagesList.filter((image) => image.status === "withPurchasePrice");
    const withoutPrice = inboxImagesList.filter((image) => image.status === "withoutPurchasePrice");
    const skip = inboxImagesList.filter((image) => image.status === "skip");
    return { withPrice, withoutPrice, skip };
  }, [inboxImagesList]);
  const inboxWithPriceCount = inboxSplit.withPrice.length;
  const inboxWithoutPriceCount = inboxSplit.withoutPrice.length;
  const inboxSkipCount = inboxSplit.skip.length;
  const inboxList =
    inboxView === "withPurchasePrice"
      ? inboxSplit.withPrice
      : inboxView === "withoutPurchasePrice"
        ? inboxSplit.withoutPrice
        : inboxSplit.skip;
  const supplierCount = suppliers?.length ?? 0;
  const inboxTotalCount = inboxImagesList.length;
  const inboxEmptyMessage =
    inboxView === "withPurchasePrice"
      ? "Nema slika sa nabavnom cenom. Dodaj ih ili prebaci filter."
      : inboxView === "withoutPurchasePrice"
        ? "Nema slika bez nabavne cene. Dodaj ih ili prebaci filter."
        : "Nema oznacenih za ignorisanje. Prebaci neku sliku u ovu grupu.";
  const emptyProductsMessage =
    items.length === 0
      ? archiveView === "archived"
        ? "Nema arhiviranih proizvoda."
        : "Dodaj prvi proizvod."
      : "Nema proizvoda koji odgovaraju pretrazi.";

  useEffect(() => {
    setInboxContextMenu(null);
  }, [inboxView, setInboxContextMenu]);

  useEffect(() => {
    if (!inboxContextMenu) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setInboxContextMenu(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inboxContextMenu, setInboxContextMenu]);

  return { getPrimaryVariant, getProductPrice, getProfit, items, categoryMap, filteredCategories, hasProductSearch, selectedCategories, variantsError, getDisplayPrice, getBestSupplier, getMainImage, hasSocialMainImage, getSalesCount, sortedProducts, visibleProducts, defaultVariantEntry, bestFormOffer, bestFormSupplierName, inboxWithPriceCount, inboxWithoutPriceCount, inboxSkipCount, inboxList, supplierCount, inboxTotalCount, inboxEmptyMessage, emptyProductsMessage };
}
