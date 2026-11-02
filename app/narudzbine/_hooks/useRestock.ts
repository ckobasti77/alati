"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { matchesAllTokensInNormalizedText, normalizeSearchText, toSearchTokens } from "@/lib/search";
import type { RestockRequest } from "@/types/restockRequest";
import { getProductDisplayName } from "../_lib/helpers";
import type { useRouter, useSearchParams } from "next/navigation";
import type { Product } from "@/types/order";

type UseRestockParams = {
  basePath: string;
  orderScope: "default" | "kalaba";
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  searchParamsString: string;
  sessionToken: string;
  products: Product[] | undefined;
  productMap: Map<string, Product>;
};

export function useRestock({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken, products, productMap }: UseRestockParams) {
  const [restockModalOpen, setRestockModalOpen] = useState(false);
  const [restockDeleteOpen, setRestockDeleteOpen] = useState(false);
  const [restockDeleteCandidate, setRestockDeleteCandidate] = useState<RestockRequest | null>(null);
  const [isDeletingRestock, setIsDeletingRestock] = useState(false);
  const [restockProductId, setRestockProductId] = useState("");
  const [restockProductInput, setRestockProductInput] = useState("");
  const [restockProductSearch, setRestockProductSearch] = useState("");
  const [restockProductMenuOpen, setRestockProductMenuOpen] = useState(false);
  const [restockVariantId, setRestockVariantId] = useState("");
  const [restockName, setRestockName] = useState("");
  const [restockPhone, setRestockPhone] = useState("");
  const [isCreatingRestock, setIsCreatingRestock] = useState(false);
  const restockProductInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (restockModalOpen) return;
    setRestockProductId("");
    setRestockProductInput("");
    setRestockProductSearch("");
    setRestockProductMenuOpen(false);
    setRestockVariantId("");
    setRestockName("");
    setRestockPhone("");
  }, [restockModalOpen]);

  const restockRequests = useConvexQuery<RestockRequest[]>("restockRequests:list", {
    token: sessionToken,
    scope: orderScope,
  });
  const createRestockRequest = useConvexMutation<{
    token: string;
    scope: "default" | "kalaba";
    name: string;
    phone: string;
    productId?: string;
    productTitle: string;
    variantLabel?: string;
  }>("restockRequests:create");
  const deleteRestockRequest = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>(
    "restockRequests:remove",
  );
  const restockEntries = restockRequests ?? [];
  const isRestockLoading = restockRequests === undefined;
  const restockFilteredProducts = useMemo(() => {
    const list = products ?? [];
    const searchTokens = toSearchTokens(restockProductSearch.trim());
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
  }, [products, restockProductSearch]);
  const restockSelectedProduct = restockProductId ? productMap.get(restockProductId) : undefined;
  const restockSelectedVariants = restockSelectedProduct?.variants ?? [];
  // "Zahtevi za dopunu" sa kontrolne table vode na ?restock=1: otvori postojeći modal pa očisti parametar.
  const isRestockRequested = searchParams?.get("restock") === "1";
  const handleRestockRequest = useEffectEvent(() => {
    setRestockModalOpen(true);
    const params = new URLSearchParams(searchParamsString);
    params.delete("restock");
    const next = params.toString();
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  });

  useEffect(() => {
    if (isRestockRequested) handleRestockRequest();
  }, [isRestockRequested]);

  const openRestockDeleteModal = (entry: RestockRequest) => {
    setRestockDeleteCandidate(entry);
    setRestockDeleteOpen(true);
  };

  const closeRestockDeleteModal = () => {
    setRestockDeleteOpen(false);
    setRestockDeleteCandidate(null);
  };

  const handleRestockDeleteOpenChange = (open: boolean) => {
    if (open) {
      setRestockDeleteOpen(true);
    } else {
      closeRestockDeleteModal();
    }
  };

  const handleRestockDelete = async (id: string) => {
    if (isDeletingRestock) return;
    setIsDeletingRestock(true);
    try {
      await deleteRestockRequest({ id, token: sessionToken, scope: orderScope });
      toast.success("Zahtev je obrisan.");
      closeRestockDeleteModal();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje zahteva nije uspelo.");
    } finally {
      setIsDeletingRestock(false);
    }
  };

  const resetRestockForm = () => {
    setRestockProductId("");
    setRestockProductInput("");
    setRestockProductSearch("");
    setRestockProductMenuOpen(false);
    setRestockVariantId("");
    setRestockName("");
    setRestockPhone("");
  };

  const handleCreateRestockRequest = async () => {
    if (isCreatingRestock) return;
    const name = restockName.trim();
    const phone = restockPhone.trim();
    const productId = restockProductId.trim();
    const product = restockSelectedProduct;
    if (!productId || !product) {
      toast.error("Izaberi proizvod.");
      return;
    }
    const productTitle = getProductDisplayName(product);
    const variants = product.variants ?? [];
    const selectedVariant =
      variants.find((variant) => variant.id === restockVariantId) ??
      variants.find((variant) => variant.isDefault) ??
      variants[0];
    if (!name) {
      toast.error("Unesi ime.");
      return;
    }
    if (!phone) {
      toast.error("Unesi broj telefona.");
      return;
    }
    setIsCreatingRestock(true);
    try {
      await createRestockRequest({
        token: sessionToken,
        scope: orderScope,
        name,
        phone,
        productId,
        productTitle,
        variantLabel: selectedVariant?.label,
      });
      toast.success("Zahtev je sacuvan.");
      resetRestockForm();
    } catch (error) {
      console.error(error);
      toast.error("Cuvanje zahteva nije uspelo.");
    } finally {
      setIsCreatingRestock(false);
    }
  };


  return { restockModalOpen, setRestockModalOpen, restockDeleteOpen, restockDeleteCandidate, isDeletingRestock, setRestockProductId, restockProductInput, setRestockProductInput, restockProductSearch, setRestockProductSearch, restockProductMenuOpen, setRestockProductMenuOpen, restockVariantId, setRestockVariantId, restockName, setRestockName, restockPhone, setRestockPhone, isCreatingRestock, restockProductInputRef, restockEntries, isRestockLoading, restockFilteredProducts, restockSelectedProduct, restockSelectedVariants, openRestockDeleteModal, closeRestockDeleteModal, handleRestockDeleteOpenChange, handleRestockDelete, resetRestockForm, handleCreateRestockRequest };
}

