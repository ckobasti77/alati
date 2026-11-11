"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import type { ProductVariant } from "@/types/order";
import { generateId, parsePrice, type SocialPlatform } from "../../_lib/productHelpers";
import type { useProductDetailState } from "./useProductDetailState";
import type { useProductDetailUpdate } from "./useProductDetailUpdate";

type UseProductDetailFieldsParams = {
  sessionToken: ReturnType<typeof useProductDetailState>["sessionToken"];
  isKodMajstor: ReturnType<typeof useProductDetailState>["isKodMajstor"];
  product: ReturnType<typeof useProductDetailState>["product"];
  productRef: ReturnType<typeof useProductDetailState>["productRef"];
  setPublishing: ReturnType<typeof useProductDetailState>["setPublishing"];
  setIsAddingVariant: ReturnType<typeof useProductDetailState>["setIsAddingVariant"];
  setIsSavingVariant: ReturnType<typeof useProductDetailState>["setIsSavingVariant"];
  newVariantLabel: ReturnType<typeof useProductDetailState>["newVariantLabel"];
  setNewVariantLabel: ReturnType<typeof useProductDetailState>["setNewVariantLabel"];
  newVariantOpis: ReturnType<typeof useProductDetailState>["newVariantOpis"];
  setNewVariantOpis: ReturnType<typeof useProductDetailState>["setNewVariantOpis"];
  newVariantNabavna: ReturnType<typeof useProductDetailState>["newVariantNabavna"];
  setNewVariantNabavna: ReturnType<typeof useProductDetailState>["setNewVariantNabavna"];
  newVariantProdajna: ReturnType<typeof useProductDetailState>["newVariantProdajna"];
  setNewVariantProdajna: ReturnType<typeof useProductDetailState>["setNewVariantProdajna"];
  newVariantIsDefault: ReturnType<typeof useProductDetailState>["newVariantIsDefault"];
  setNewVariantIsDefault: ReturnType<typeof useProductDetailState>["setNewVariantIsDefault"];
  newVariantNabavnaIsReal: ReturnType<typeof useProductDetailState>["newVariantNabavnaIsReal"];
  setNewVariantNabavnaIsReal: ReturnType<typeof useProductDetailState>["setNewVariantNabavnaIsReal"];
  applyUpdate: ReturnType<typeof useProductDetailUpdate>["applyUpdate"];
};

export function useProductDetailFields({ sessionToken, isKodMajstor, product, productRef, setPublishing, setIsAddingVariant, setIsSavingVariant, newVariantLabel, setNewVariantLabel, newVariantOpis, setNewVariantOpis, newVariantNabavna, setNewVariantNabavna, newVariantProdajna, setNewVariantProdajna, newVariantIsDefault, setNewVariantIsDefault, newVariantNabavnaIsReal, setNewVariantNabavnaIsReal, applyUpdate }: UseProductDetailFieldsParams) {
  const handleBaseFieldSave = async (
    field: "name" | "kpName" | "opisKp" | "opisFbInsta" | "nabavnaCena" | "prodajnaCena",
    value: string,
  ) => {
    const trimmed = value.trim();
    if (!product) return;
    if ((field === "name" || field === "kpName") && trimmed.length < 2) {
      toast.error("Naziv mora imati bar 2 karaktera.");
      throw new Error("Invalid name");
    }

    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const parsed = parsePrice(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Upisi broj veci ili jednak nuli.");
        throw new Error("Invalid price");
      }
      await applyUpdate(
        (current) => {
          const variantsList = current.variants ?? [];
          const hasDefault = variantsList.some((variant) => variant.isDefault);
          const updatedVariants = variantsList.map((variant, index) => {
            const shouldSync = variant.isDefault || (!hasDefault && index === 0);
            return shouldSync ? { ...variant, [field]: parsed } : variant;
          });
          return {
            ...current,
            [field]: parsed,
            variants: variantsList.length ? updatedVariants : undefined,
          };
        },
        "Cena sacuvana.",
      );
      return;
    }

    await applyUpdate(
      (current) => ({
        ...current,
        [field]: trimmed.length === 0 ? (field === "kpName" ? current.kpName ?? current.name : current.name) : trimmed,
      }),
      "Sacuvano.",
    );
  };

  const handlePublishToggle = async (
    field: "publishKp" | "publishFb" | "publishIg" | "publishFbProfile" | "publishMarketplace" | "pickupAvailable",
    value: boolean,
  ) => {
    if (!isKodMajstor) {
      toast.error("Samo glavni profil moze da menja objave.");
      return;
    }
    await applyUpdate(
      (current) => ({
        ...current,
        [field]: value,
      }),
      "Sacuvano.",
    );
  };

  const publishNow = async (platform: SocialPlatform) => {
    if (!isKodMajstor) {
      toast.error("Objavljivanje je dostupno samo sa glavnog profila.");
      return;
    }
    if (!sessionToken) {
      toast.error("Nedostaje token za objavu. Prijavi se ponovo.");
      return;
    }
    const latestProduct = productRef.current;
    if (!latestProduct) {
      toast.error("Proizvod nije ucitan.");
      return;
    }
    try {
      setPublishing(platform);
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productId: latestProduct._id,
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
      const publishField: "publishFb" | "publishIg" = platform === "facebook" ? "publishFb" : "publishIg";
      if (!latestProduct[publishField]) {
        try {
          await applyUpdate((current) => ({ ...current, [publishField]: true }));
        } catch (error) {
          console.error(error);
          toast.error("Objava je poslata, ali cuvanje oznake nije uspelo.");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };

  const handleVariantFieldSave = async (
    variantId: string,
    field: "label" | "nabavnaCena" | "prodajnaCena" | "opis",
    value: string,
  ) => {
    if (!product) return;
    const trimmed = value.trim();
    if (field === "label" && trimmed.length === 0) {
      toast.error("Naziv tipa ne sme biti prazan.");
      throw new Error("Invalid variant label");
    }
    if (field === "nabavnaCena" || field === "prodajnaCena") {
      const parsed = parsePrice(trimmed);
      if (!Number.isFinite(parsed) || parsed < 0) {
        toast.error("Upisi broj veci ili jednak nuli.");
        throw new Error("Invalid price");
      }
      await applyUpdate(
        (current) => {
          const nextVariants =
            current.variants?.map((variant) =>
              variant.id === variantId ? { ...variant, [field]: parsed } : variant,
            ) ?? [];
          const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
          return {
            ...current,
            variants: nextVariants,
            nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
            nabavnaCenaIsReal: defaultVariant?.nabavnaCenaIsReal ?? current.nabavnaCenaIsReal ?? true,
            prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
          };
        },
        "Tip sacuvan.",
      );
      return;
    }

    await applyUpdate(
      (current) => ({
        ...current,
        variants: current.variants?.map((variant) =>
          variant.id === variantId ? { ...variant, [field]: trimmed.length === 0 ? undefined : trimmed } : variant,
        ),
      }),
      "Tip sacuvan.",
    );
  };

  const handleBasePurchaseRealityToggle = async (value: boolean) => {
    await applyUpdate(
      (current) => {
        const variantsList = current.variants ?? [];
        const defaultVariant = variantsList.find((variant) => variant.isDefault) ?? variantsList[0];
        const nextVariants =
          variantsList.length && defaultVariant
            ? variantsList.map((variant) =>
                variant.id === defaultVariant.id ? { ...variant, nabavnaCenaIsReal: value } : variant,
              )
            : current.variants;
        return {
          ...current,
          nabavnaCenaIsReal: value,
          variants: nextVariants,
        };
      },
      value ? "Oznaceno kao prava nabavna cena." : "Oznaceno kao procenjena nabavna cena.",
    );
  };

  const handleVariantPurchaseRealityToggle = async (variantId: string, value: boolean) => {
    await applyUpdate(
      (current) => {
        const currentVariants = current.variants ?? [];
        if (currentVariants.length === 0) return current;
        const nextVariants = currentVariants.map((variant) =>
          variant.id === variantId ? { ...variant, nabavnaCenaIsReal: value } : variant,
        );
        const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
        return {
          ...current,
          variants: nextVariants,
          nabavnaCenaIsReal:
            defaultVariant && defaultVariant.id === variantId
              ? value
              : current.nabavnaCenaIsReal ?? defaultVariant?.nabavnaCenaIsReal ?? true,
        };
      },
      value ? "Oznaceno kao prava nabavna cena." : "Oznaceno kao procenjena nabavna cena.",
    );
  };

  const resetNewVariantForm = () => {
    setNewVariantLabel("");
    setNewVariantOpis("");
    setNewVariantNabavna("");
    setNewVariantProdajna("");
    setNewVariantIsDefault(false);
    setNewVariantNabavnaIsReal(product?.nabavnaCenaIsReal ?? true);
  };

  const handleStartAddVariant = () => {
    if (!product) return;
    setNewVariantLabel(product.kpName ?? product.name);
    setNewVariantOpis(product.opisFbInsta ?? product.opis ?? "");
    setNewVariantNabavna(String(product.nabavnaCena ?? ""));
    setNewVariantProdajna(String(product.prodajnaCena ?? ""));
    const hasVariants = (product.variants ?? []).length > 0;
    const hasDefault = (product.variants ?? []).some((variant) => variant.isDefault);
    setNewVariantIsDefault(!hasVariants || !hasDefault);
    setNewVariantNabavnaIsReal(product.nabavnaCenaIsReal ?? true);
    setIsAddingVariant(true);
  };

  const handleCancelAddVariant = () => {
    resetNewVariantForm();
    setIsAddingVariant(false);
  };

  const handleCreateVariant = async () => {
    if (!product) return;
    const label = newVariantLabel.trim();
    if (!label) {
      toast.error("Upisi naziv tipa.");
      return;
    }
    const nabavna = parsePrice(newVariantNabavna);
    if (!Number.isFinite(nabavna) || nabavna < 0) {
      toast.error("Unesi ispravnu nabavnu cenu.");
      return;
    }
    const prodajna = parsePrice(newVariantProdajna);
    if (!Number.isFinite(prodajna) || prodajna < 0) {
      toast.error("Unesi ispravnu prodajnu cenu.");
      return;
    }
    setIsSavingVariant(true);
    const hasExistingVariants = (product.variants ?? []).length > 0;
    const opis = newVariantOpis.trim();
    const draftVariant: ProductVariant = {
      id: generateId(),
      label,
      nabavnaCena: nabavna,
      nabavnaCenaIsReal: newVariantNabavnaIsReal,
      prodajnaCena: prodajna,
      isDefault: newVariantIsDefault || !hasExistingVariants,
      opis: opis ? opis : undefined,
      images: [],
    };
    try {
      await applyUpdate(
        (current) => {
          const existing = current.variants ?? [];
          const hasDefault = existing.some((variant) => variant.isDefault);
          const normalizedVariant = {
            ...draftVariant,
            isDefault: draftVariant.isDefault || !hasDefault || existing.length === 0,
          };
          const nextVariants = [...existing, normalizedVariant];
          const defaultVariant = nextVariants.find((variant) => variant.isDefault) ?? nextVariants[0];
          return {
            ...current,
            variants: nextVariants,
            nabavnaCena: defaultVariant?.nabavnaCena ?? current.nabavnaCena,
            nabavnaCenaIsReal: defaultVariant?.nabavnaCenaIsReal ?? current.nabavnaCenaIsReal ?? true,
            prodajnaCena: defaultVariant?.prodajnaCena ?? current.prodajnaCena,
          };
        },
        "Tip dodat.",
      );
      resetNewVariantForm();
      setIsAddingVariant(false);
    } catch (error) {
      console.error(error);
      toast.error("Dodavanje tipa nije uspelo.");
    } finally {
      setIsSavingVariant(false);
    }
  };


  return { handleBaseFieldSave, handlePublishToggle, publishNow, handleVariantFieldSave, handleBasePurchaseRealityToggle, handleVariantPurchaseRealityToggle, handleStartAddVariant, handleCancelAddVariant, handleCreateVariant };
}
