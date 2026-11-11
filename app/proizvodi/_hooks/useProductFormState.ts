"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { normalizeSupplierOffersInput, pickBestSupplierOffer, type NormalizedSupplierOffer } from "../_lib/productHelpers";
import { productSchema, emptyProductForm, type ProductFormValues, type VariantFormEntry, type SupplierOfferFormEntry } from "../_lib/productForm";
import type { useProductsState } from "./useProductsState";

type UseProductFormStateParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  setIsMobile: ReturnType<typeof useProductsState>["setIsMobile"];
  hasSeededCategories: ReturnType<typeof useProductsState>["hasSeededCategories"];
  setHasSeededCategories: ReturnType<typeof useProductsState>["setHasSeededCategories"];
  hasSeededSuppliers: ReturnType<typeof useProductsState>["hasSeededSuppliers"];
  setHasSeededSuppliers: ReturnType<typeof useProductsState>["setHasSeededSuppliers"];
  setShowSupplierForm: ReturnType<typeof useProductsState>["setShowSupplierForm"];
  categories: ReturnType<typeof useProductsState>["categories"];
  suppliers: ReturnType<typeof useProductsState>["suppliers"];
  ensureDefaultCategories: ReturnType<typeof useProductsState>["ensureDefaultCategories"];
  ensureDefaultSuppliers: ReturnType<typeof useProductsState>["ensureDefaultSuppliers"];
};

export function useProductFormState({ sessionToken, setIsMobile, hasSeededCategories, setHasSeededCategories, hasSeededSuppliers, setHasSeededSuppliers, setShowSupplierForm, categories, suppliers, ensureDefaultCategories, ensureDefaultSuppliers }: UseProductFormStateParams) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductForm(),
    mode: "onBlur",
  });
  useEffect(() => {
    form.register("productType");
    form.register("supplierOffers");
    form.register("nabavnaCenaIsReal");
  }, [form]);
  const productType = useWatch({ control: form.control, name: "productType" }) as ProductFormValues["productType"];
  const variants = (useWatch({ control: form.control, name: "variants" }) ?? []) as VariantFormEntry[];
  const categoryIds = (useWatch({ control: form.control, name: "categoryIds" }) ?? []) as string[];
  const supplierOffersField =
    (useWatch({ control: form.control, name: "supplierOffers" }) ?? []) as SupplierOfferFormEntry[];
  const publishIgSelected = Boolean(useWatch({ control: form.control, name: "publishIg" }));
  const resolvedProductType = productType ?? "single";
  const normalizedVariants = resolvedProductType === "variant" && Array.isArray(variants) ? variants : [];
  const normalizedSupplierOffers = useMemo<NormalizedSupplierOffer[]>(
    () => normalizeSupplierOffersInput(supplierOffersField, normalizedVariants, resolvedProductType === "variant"),
    [supplierOffersField, normalizedVariants, resolvedProductType],
  );
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const bestSupplierForVariant = useCallback(
    (variantId?: string): { supplierId: string; price: number } | null =>
      pickBestSupplierOffer(normalizedSupplierOffers, variantId),
    [normalizedSupplierOffers],
  );
  const hasSupplierOffers = supplierOffersField.length > 0;

  useEffect(() => {
    if (hasSeededCategories) return;
    if (categories === undefined) return;
    if (categories.length > 0) return;
    setHasSeededCategories(true);
    ensureDefaultCategories({ token: sessionToken }).catch((error) => {
      console.error(error);
      setHasSeededCategories(false);
    });
  }, [categories, ensureDefaultCategories, hasSeededCategories, sessionToken, setHasSeededCategories]);

  useEffect(() => {
    if (hasSeededSuppliers) return;
    if (suppliers === undefined) return;
    if (suppliers.length > 0) return;
    setHasSeededSuppliers(true);
    ensureDefaultSuppliers({ token: sessionToken }).catch((error) => {
      console.error(error);
      setHasSeededSuppliers(false);
    });
  }, [ensureDefaultSuppliers, hasSeededSuppliers, sessionToken, suppliers, setHasSeededSuppliers]);

  useEffect(() => {
    const media = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;
    if (!media) return;
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [setIsMobile]);


  useEffect(() => {
    if (supplierOffersField.length > 0) {
      setShowSupplierForm(true);
    } else {
      setShowSupplierForm(false);
    }
  }, [supplierOffersField.length, setShowSupplierForm]);

  return { form, variants, categoryIds, supplierOffersField, publishIgSelected, resolvedProductType, normalizedVariants, normalizedSupplierOffers, supplierMap, bestSupplierForVariant, hasSupplierOffers };
}
