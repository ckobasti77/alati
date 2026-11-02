"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useMemo } from "react";
import { useConvexQuery } from "@/lib/convex";
import type { Product, Supplier } from "@/types/order";

type UseOrderCatalogParams = {
  sessionToken: string;
};

export function useOrderCatalog({ sessionToken }: UseOrderCatalogParams) {
  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const productMap = useMemo(
    () => new Map((products ?? []).map((product) => [product._id, product])),
    [products],
  );
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const isProductsLoading = products === undefined;

  return { products, productMap, supplierMap, isProductsLoading };
}

