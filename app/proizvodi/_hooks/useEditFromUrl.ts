"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useConvexQuery } from "@/lib/convex";
import type { Product } from "@/types/order";

type UseEditFromUrlParams = {
  sessionToken: string;
  searchParams: ReadonlyURLSearchParams | null;
  pathname: string;
  router: { replace: (href: string, options?: { scroll?: boolean }) => void; back: () => void };
  isModalOpen: boolean;
  handleStartEdit: (product: Product) => void;
};

/**
 * `/proizvodi?izmeni=<id>` (dugme „Izmeni“ na detalju proizvoda) otvara istu formu kao „Izmeni“ u listi.
 * Parametar se čisti, a posle zatvaranja forme korisnik se vraća na detalj (istorija nazad).
 */
export function useEditFromUrl({ sessionToken, searchParams, pathname, router, isModalOpen, handleStartEdit }: UseEditFromUrlParams) {
  const editId = searchParams?.get("izmeni") ?? null;
  const target = useConvexQuery<Product | null>("products:get", editId ? { token: sessionToken, id: editId } : "skip");
  const openedFromUrlRef = useRef(false);
  const wasOpenRef = useRef(false);

  const open = useEffectEvent((product: Product) => {
    openedFromUrlRef.current = true;
    handleStartEdit(product);
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("izmeni");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  });

  useEffect(() => {
    if (editId && target) open(target);
  }, [editId, target]);

  const backAfterClose = useEffectEvent(() => {
    if (!openedFromUrlRef.current) return;
    openedFromUrlRef.current = false;
    router.back();
  });

  useEffect(() => {
    if (isModalOpen) {
      wasOpenRef.current = true;
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      backAfterClose();
    }
  }, [isModalOpen]);
}
