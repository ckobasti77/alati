"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect } from "react";
import { toast } from "sonner";
import { parsePrice, generateId } from "../_lib/productHelpers";
import { createVariantFormEntry, productFocusOrder, findFirstErrorPath, type ProductFormValues, type VariantFormEntry, type SupplierOfferFormEntry } from "../_lib/productForm";
import type { useProductFormState } from "./useProductFormState";
import type { useProductFormSubmit } from "./useProductFormSubmit";
import type { useProductsState } from "./useProductsState";
import type { useProductsView } from "./useProductsView";

type UseProductFormFieldsParams = {
  isModalOpen: ReturnType<typeof useProductsState>["isModalOpen"];
  setExitConfirmOpen: ReturnType<typeof useProductsState>["setExitConfirmOpen"];
  setVariantImages: ReturnType<typeof useProductsState>["setVariantImages"];
  variantUploadInputsRef: ReturnType<typeof useProductsState>["variantUploadInputsRef"];
  dialogScrollRef: ReturnType<typeof useProductsState>["dialogScrollRef"];
  modalSnapshotRef: ReturnType<typeof useProductsState>["modalSnapshotRef"];
  wasModalOpenRef: ReturnType<typeof useProductsState>["wasModalOpenRef"];
  suppliers: ReturnType<typeof useProductsState>["suppliers"];
  form: ReturnType<typeof useProductFormState>["form"];
  resolvedProductType: ReturnType<typeof useProductFormState>["resolvedProductType"];
  hasSupplierOffers: ReturnType<typeof useProductFormState>["hasSupplierOffers"];
  buildModalSnapshot: ReturnType<typeof useProductFormSubmit>["buildModalSnapshot"];
  bestFormOffer: ReturnType<typeof useProductsView>["bestFormOffer"];
};

export function useProductFormFields({ isModalOpen, setExitConfirmOpen, setVariantImages, variantUploadInputsRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, suppliers, form, resolvedProductType, hasSupplierOffers, buildModalSnapshot, bestFormOffer }: UseProductFormFieldsParams) {
  const focusProductField = useCallback(
    (fieldName: string) => {
      const targetName = String(fieldName);
      requestAnimationFrame(() => {
        try {
          form.setFocus(targetName as any, { shouldSelect: true });
          return;
        } catch {
          // fall through to DOM lookup
        }
        const scope: ParentNode = dialogScrollRef.current ?? document;
        const node =
          scope.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${targetName}"]`) ??
          scope.querySelector<HTMLElement>(`[data-focus-target="${targetName}"]`) ??
          document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${targetName}"]`) ??
          document.querySelector<HTMLElement>(`[data-focus-target="${targetName}"]`);
        if (node) {
          node.focus();
          if (node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement) {
            node.select();
          }
        }
      });
    },
    [form, dialogScrollRef],
  );

  useEffect(() => {
    if (!isModalOpen) return;
    const timer = window.setTimeout(() => focusProductField("kpName"), 0);
    return () => window.clearTimeout(timer);
  }, [focusProductField, isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (form.formState.submitCount === 0 && Object.keys(form.formState.errors).length === 0) return;
    const target = findFirstErrorPath(form.formState.errors, productFocusOrder);
    if (!target) return;
    const timer = window.setTimeout(() => focusProductField(target as string), 0);
    return () => window.clearTimeout(timer);
  }, [focusProductField, form.formState.errors, form.formState.submitCount, isModalOpen]);

  useEffect(() => {
    if (!hasSupplierOffers) return;
    if (!bestFormOffer) return;
    const currentValue = form.getValues("nabavnaCena");
    if (parsePrice(currentValue) !== bestFormOffer.price) {
      form.setValue("nabavnaCena", String(bestFormOffer.price), { shouldDirty: true, shouldValidate: true });
    }
    if (form.getValues("nabavnaCenaIsReal") !== true) {
      form.setValue("nabavnaCenaIsReal", true, { shouldDirty: true, shouldValidate: true });
    }
  }, [bestFormOffer, form, hasSupplierOffers]);

  useEffect(() => {
    if (isModalOpen && !wasModalOpenRef.current) {
      modalSnapshotRef.current = buildModalSnapshot();
      setExitConfirmOpen(false);
    }
    if (!isModalOpen && wasModalOpenRef.current) {
      modalSnapshotRef.current = "";
    }
    wasModalOpenRef.current = isModalOpen;
  }, [buildModalSnapshot, isModalOpen, modalSnapshotRef, setExitConfirmOpen, wasModalOpenRef]);

  const seedInitialVariant = () => {
    const entry = createVariantFormEntry({
      isDefault: true,
      nabavnaCena: form.getValues("nabavnaCena"),
      prodajnaCena: form.getValues("prodajnaCena"),
    });
    form.setValue("variants", [entry], { shouldDirty: true, shouldValidate: true });
  };

  const handleProductTypeChange = (type: ProductFormValues["productType"]) => {
    const currentType = form.getValues("productType") ?? "single";
    if (currentType === type) return;
    form.setValue("productType", type, { shouldDirty: true, shouldValidate: true });
    if (type === "single") {
      form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
      const baseOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => !offer.variantId);
      form.setValue("supplierOffers", baseOffers, { shouldDirty: true, shouldValidate: true });
      setVariantImages((previous) => {
        Object.values(previous).forEach((list) =>
          list.forEach((image) => {
            if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
          }),
        );
        return {};
      });
    } else {
      const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
      if (current.length === 0) {
        seedInitialVariant();
      }
    }
  };

  const handleAddVariant = () => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const shouldBeDefault = current.length === 0 || !current.some((variant) => variant.isDefault);
    const entry = createVariantFormEntry({
      isDefault: shouldBeDefault,
      nabavnaCena: shouldBeDefault ? form.getValues("nabavnaCena") : "",
      prodajnaCena: shouldBeDefault ? form.getValues("prodajnaCena") : "",
    });
    const next = [...current, entry];
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddVariantFromSingle = () => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const shouldBeDefault = current.length === 0 || !current.some((variant) => variant.isDefault);
    const entry = createVariantFormEntry({
      isDefault: shouldBeDefault,
      nabavnaCena: shouldBeDefault ? form.getValues("nabavnaCena") : "",
      prodajnaCena: shouldBeDefault ? form.getValues("prodajnaCena") : "",
    });
    const next = [...current, entry];
    form.setValue("productType", "variant", { shouldDirty: true, shouldValidate: true });
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleRemoveVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    if (current.length === 1) {
      form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
      form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
      setVariantImages((prev) => {
        const copy = { ...prev };
        const removed = copy[id];
        if (removed) {
          removed.forEach((image) => {
            if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
          });
        }
        delete copy[id];
        return copy;
      });
      return;
    }
    const next = current.filter((variant) => variant.id !== id);
    if (!next.some((variant) => variant.isDefault) && next.length > 0) {
      next[0] = { ...next[0], isDefault: true };
    }
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
    const filteredOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => offer.variantId !== id);
    form.setValue("supplierOffers", filteredOffers, { shouldDirty: true, shouldValidate: true });
    if (next.length === 0) {
      form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
    }
    setVariantImages((prev) => {
      const copy = { ...prev };
      const removed = copy[id];
      if (removed) {
        removed.forEach((image) => {
          if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
        });
      }
      delete copy[id];
      return copy;
    });
    delete variantUploadInputsRef.current[id];
  };

  const handleSetDefaultVariant = (id: string) => {
    const current = (form.getValues("variants") ?? []) as VariantFormEntry[];
    const next = current.map((variant) => ({
      ...variant,
      isDefault: variant.id === id,
    }));
    form.setValue("variants", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleClearVariants = () => {
    form.setValue("productType", "single", { shouldDirty: true, shouldValidate: true });
    form.setValue("variants", [], { shouldDirty: true, shouldValidate: true });
    const baseOffers = (form.getValues("supplierOffers") ?? []).filter((offer) => !offer.variantId);
    form.setValue("supplierOffers", baseOffers, { shouldDirty: true, shouldValidate: true });
    setVariantImages((prev) => {
      Object.values(prev).forEach((list) =>
        list.forEach((image) => {
          if (image.previewUrl) {
            URL.revokeObjectURL(image.previewUrl);
          }
        }),
      );
      return {};
    });
  };

  const setSupplierOffersField = (updater: (prev: SupplierOfferFormEntry[]) => SupplierOfferFormEntry[]) => {
    const current = (form.getValues("supplierOffers") ?? []) as SupplierOfferFormEntry[];
    const next = updater(current);
    form.setValue("supplierOffers", next, { shouldDirty: true, shouldValidate: true });
  };

  const handleAddSupplierOffer = (variantId?: string) => {
    if (!suppliers || suppliers.length === 0) {
      toast.error("Dodaj bar jednog dobavljača pre dodavanja ponude.");
      return;
    }
    const scopedVariantId = resolvedProductType === "variant" ? variantId : undefined;
    setSupplierOffersField((prev) => [
      ...prev,
      {
        id: generateId(),
        supplierId: suppliers[0]._id,
        price: "",
        variantId: scopedVariantId,
      },
    ]);
  };

  const handleUpdateSupplierOffer = (
    rowId: string,
    field: "supplierId" | "price" | "variantId",
    value: string | undefined,
  ) => {
    setSupplierOffersField((prev) =>
      prev.map((entry) => (entry.id === rowId ? { ...entry, [field]: value ?? "" } : entry)),
    );
  };

  const handleRemoveSupplierOffer = (rowId: string) => {
    setSupplierOffersField((prev) => prev.filter((entry) => entry.id !== rowId));
  };

  return { handleProductTypeChange, handleAddVariant, handleAddVariantFromSingle, handleRemoveVariant, handleSetDefaultVariant, handleClearVariants, handleAddSupplierOffer, handleUpdateSupplierOffer, handleRemoveSupplierOffer };
}
