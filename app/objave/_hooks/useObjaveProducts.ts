"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexQuery } from "@/lib/convex";
import { clearListState, readListState, writeListState } from "@/lib/listState";
import type { Product, ProductListResponse } from "@/types/order";

const PRODUCTS_PAGE_SIZE = 20;
type Pagination = ProductListResponse["pagination"];
const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: PRODUCTS_PAGE_SIZE, total: 0, totalPages: 1 };

const mergeProducts = (prev: Product[], items: Product[]) => {
  const map = new Map(prev.map((item) => [String(item._id), item]));
  items.forEach((item) => map.set(String(item._id), item));
  return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
};

/**
 * Proizvodi za izbor objave: pretraga ⇄ `?q`, strane od 20 (infinite scroll), čuvanje liste i skrola pri
 * povratku. Isto ponašanje kao ranije u app/objave/page.tsx, bez veštačkog kašnjenja od 850 ms. Stanje se
 * usklađuje tokom rendera (kao useOrdersFeed), a restore je lazy init.
 */
export function useObjaveProducts(sessionToken: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams?.toString() ?? "";
  const urlSearch = searchParams?.get("q") ?? "";
  const listStateKey = useMemo(() => `listState:${pathname}${searchParamsString ? `?${searchParamsString}` : ""}`, [pathname, searchParamsString]);

  // Povratak sa druge stranice: učitane strane i skrol iz sessionStorage (jednokratno).
  const [initial] = useState(() => {
    const stored = readListState<Product, Pagination>(listStateKey);
    const storedSearch = typeof stored?.extra?.search === "string" ? stored.extra.search : "";
    return { key: listStateKey, restored: stored && storedSearch === urlSearch ? stored : null };
  });

  const [search, setSearch] = useState(urlSearch);
  const [page, setPage] = useState(initial.restored?.page ?? 1);
  const [products, setProducts] = useState<Product[]>(initial.restored?.items ?? []);
  const [pagination, setPagination] = useState<Pagination>(initial.restored?.pagination ?? EMPTY_PAGINATION);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef(0);
  const listStateRef = useRef({ products, page, pagination, search });

  const reset = useCallback(() => {
    setProducts([]);
    setPage(1);
    setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setIsLoadingMore(false);
  }, []);

  // Spoljna promena ?q (nazad/napred): pretraga iz URL-a, lista iz početka. Sopstveni upis u URL daje istu
  // (trim) vrednost, pa ne resetuje i ne briše razmak koji se upravo kuca.
  const [syncedUrlSearch, setSyncedUrlSearch] = useState(urlSearch);
  if (urlSearch !== syncedUrlSearch) {
    setSyncedUrlSearch(urlSearch);
    if (urlSearch !== search.trim()) {
      setSearch(urlSearch);
      reset();
    }
  }

  // Nova sesija: lista iz početka.
  const [syncedToken, setSyncedToken] = useState(sessionToken);
  if (sessionToken !== syncedToken) {
    setSyncedToken(sessionToken);
    reset();
  }

  const list = useConvexQuery<ProductListResponse>("products:listPaginated", {
    token: sessionToken ?? "",
    search: search.trim() || undefined,
    page,
    pageSize: PRODUCTS_PAGE_SIZE,
  });

  // Rezultat strane → lista (spaja po ID-u, realtime izmene učitanih stavki stižu same).
  const [mergedList, setMergedList] = useState<ProductListResponse | undefined>(undefined);
  if (list !== mergedList) {
    setMergedList(list);
    if (list) {
      if (list.pagination) setPagination(list.pagination);
      if (list.items) setProducts((prev) => mergeProducts(prev, list.items));
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    listStateRef.current = { products, page, pagination, search };
  }, [page, pagination, products, search]);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useLayoutEffect(() => {
    if (!initial.restored) return;
    clearListState(initial.key);
    const top = initial.restored.scrollY;
    if (typeof top !== "number") return;
    const frame = requestAnimationFrame(() => window.scrollTo({ top, behavior: "auto" }));
    return () => cancelAnimationFrame(frame);
  }, [initial]);

  useEffect(() => {
    return () => {
      const snapshot = listStateRef.current;
      writeListState<Product, Pagination>(listStateKey, {
        items: snapshot.products,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: scrollYRef.current,
        savedAt: Date.now(),
        extra: { search: snapshot.search },
      });
    };
  }, [listStateKey]);

  // Pretraga → URL (ostali parametri ostaju).
  useEffect(() => {
    if (!searchParams) return;
    const nextSearch = search.trim();
    if (nextSearch === urlSearch.trim()) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) params.set("q", nextSearch);
    else params.delete("q");
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, search, searchParams, urlSearch]);

  const hasMore = pagination.totalPages > page;
  const loadMore = useCallback(() => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    setPage((prev) => prev + 1);
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  const changeSearch = useCallback(
    (value: string) => {
      setSearch(value);
      reset();
    },
    [reset],
  );

  return {
    search,
    changeSearch,
    products,
    total: pagination.total,
    isLoading: list === undefined && products.length === 0,
    isLoadingMore: isLoadingMore && hasMore,
    hasMore,
    loaderRef,
  };
}
