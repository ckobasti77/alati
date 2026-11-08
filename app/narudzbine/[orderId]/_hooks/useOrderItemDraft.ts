"use client";

import { useMemo, useRef, useState } from "react";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import { composeVariantLabel, getProductDisplayName, getProductVariants, pickBestSupplier, resolveSupplierOptions } from "../../_lib/helpers";
import type { useOrderDetailData } from "./useOrderDetailData";

type UseOrderItemDraftParams = {
  products: ReturnType<typeof useOrderDetailData>["products"];
  suppliers: ReturnType<typeof useOrderDetailData>["suppliers"];
};

export function useOrderItemDraft({ products, suppliers }: UseOrderItemDraftParams) {
  const [productInput, setProductInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productMenuOpen, setProductMenuOpen] = useState(false);
  const [itemProductId, setItemProductId] = useState("");
  const [itemVariantId, setItemVariantId] = useState("");
  const [itemSupplierId, setItemSupplierId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [useManualPurchasePrice, setUseManualPurchasePrice] = useState(false);
  const [manualPurchasePrice, setManualPurchasePrice] = useState("");
  const [useManualSalePrice, setUseManualSalePrice] = useState(false);
  const [manualSalePrice, setManualSalePrice] = useState("");
  const productInputRef = useRef<HTMLInputElement | null>(null);
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const searchTokens = toSearchTokens(productSearch.trim());
    if (!searchTokens.length) return list;
    return list.filter((product) => {
      const variantsText = (product.variants ?? [])
        .map((variant) => `${variant.label ?? ""} ${variant.opis ?? ""}`)
        .join(" ");
      const searchableText = normalizeSearchText(
        `${getProductDisplayName(product)} ${product.opisFbInsta ?? product.opis ?? ""} ${product.opisKp ?? ""} ${variantsText}`,
      );
      return matchesAllTokensInNormalizedText(searchableText, searchTokens);
    });
  }, [products, productSearch]);
  const selectedProduct = useMemo(
    () => (products ?? []).find((item) => item._id === itemProductId),
    [products, itemProductId],
  );
  const selectedVariants = useMemo(() => getProductVariants(selectedProduct), [selectedProduct]);
  const selectedVariantForPreview = useMemo(() => {
    if (!selectedProduct) return undefined;
    const variants = selectedProduct.variants ?? [];
    if (variants.length === 0) return undefined;
    if (itemVariantId) {
      const match = variants.find((variant) => variant.id === itemVariantId);
      if (match) return match;
    }
    return variants.find((variant) => variant.isDefault) ?? variants[0];
  }, [selectedProduct, itemVariantId]);
  const supplierOptions = useMemo(
    () => resolveSupplierOptions(selectedProduct, itemVariantId || undefined),
    [selectedProduct, itemVariantId],
  );
  const supplierOptionsWithNames = useMemo(
    () =>
      supplierOptions.map((option) => ({
        ...option,
        supplierName: supplierMap.get(option.supplierId)?.name,
      })),
    [supplierMap, supplierOptions],
  );
  const bestSupplierOption = useMemo(() => pickBestSupplier(supplierOptionsWithNames), [supplierOptionsWithNames]);

  // Usklađivanje izbora tokom rendera (umesto efekata): tip mora da postoji u izabranom proizvodu,
  // a dobavljač u ponudama tog tipa. Pravila su ista kao ranije.
  if (!selectedProduct || selectedVariants.length === 0) {
    if (itemVariantId) setItemVariantId("");
  } else if (!selectedVariants.some((variant) => variant.id === itemVariantId)) {
    const fallbackVariant = selectedVariants.find((variant) => variant.isDefault) ?? selectedVariants[0];
    if (fallbackVariant) {
      setItemVariantId(fallbackVariant.id);
      setProductInput(composeVariantLabel(selectedProduct, fallbackVariant));
    }
  }
  const supplierTarget =
    supplierOptionsWithNames.length === 0
      ? ""
      : supplierOptionsWithNames.length === 1
        ? supplierOptionsWithNames[0].supplierId
        : supplierOptionsWithNames.some((option) => option.supplierId === itemSupplierId)
          ? itemSupplierId
          : "";
  if (supplierTarget !== itemSupplierId) setItemSupplierId(supplierTarget);

  const resetItemDraft = () => {
    setItemProductId("");
    setItemVariantId("");
    setItemSupplierId("");
    setItemQuantity(1);
    setUseManualPurchasePrice(false);
    setManualPurchasePrice("");
    setUseManualSalePrice(false);
    setManualSalePrice("");
    setProductInput("");
    setProductSearch("");
    setProductMenuOpen(false);
  };

  return { productInput, setProductInput, setProductSearch, productMenuOpen, setProductMenuOpen, setItemProductId, itemVariantId, setItemVariantId, itemSupplierId, setItemSupplierId, itemQuantity, setItemQuantity, useManualPurchasePrice, setUseManualPurchasePrice, manualPurchasePrice, setManualPurchasePrice, useManualSalePrice, setUseManualSalePrice, manualSalePrice, setManualSalePrice, productInputRef, supplierMap, filteredProducts, selectedProduct, selectedVariants, selectedVariantForPreview, supplierOptionsWithNames, bestSupplierOption, resetItemDraft };
}
