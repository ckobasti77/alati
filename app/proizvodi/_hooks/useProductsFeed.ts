"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useLayoutEffect } from "react";
import { clearListState, writeListState } from "@/lib/listState";
import type { Product, ProductListResponse } from "@/types/order";
import type { useProductsState } from "./useProductsState";

type UseProductsFeedParams = {
  restore: ReturnType<typeof useProductsState>["restore"];
  router: ReturnType<typeof useProductsState>["router"];
  pathname: ReturnType<typeof useProductsState>["pathname"];
  searchParams: ReturnType<typeof useProductsState>["searchParams"];
  searchQuery: ReturnType<typeof useProductsState>["searchQuery"];
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  viewMode: ReturnType<typeof useProductsState>["viewMode"];
  archiveView: ReturnType<typeof useProductsState>["archiveView"];
  sortBy: ReturnType<typeof useProductsState>["sortBy"];
  productSearch: ReturnType<typeof useProductsState>["productSearch"];
  setProductSearch: ReturnType<typeof useProductsState>["setProductSearch"];
  productPage: ReturnType<typeof useProductsState>["productPage"];
  setProductPage: ReturnType<typeof useProductsState>["setProductPage"];
  productFeed: ReturnType<typeof useProductsState>["productFeed"];
  setProductFeed: ReturnType<typeof useProductsState>["setProductFeed"];
  productPagination: ReturnType<typeof useProductsState>["productPagination"];
  setProductPagination: ReturnType<typeof useProductsState>["setProductPagination"];
  isLoadingMoreProducts: ReturnType<typeof useProductsState>["isLoadingMoreProducts"];
  setIsLoadingMoreProducts: ReturnType<typeof useProductsState>["setIsLoadingMoreProducts"];
  productsLoaderRef: ReturnType<typeof useProductsState>["productsLoaderRef"];
  loadMoreProductsTimerRef: ReturnType<typeof useProductsState>["loadMoreProductsTimerRef"];
  scrollYRef: ReturnType<typeof useProductsState>["scrollYRef"];
  skipUrlSyncRef: ReturnType<typeof useProductsState>["skipUrlSyncRef"];
  skipInitialResetRef: ReturnType<typeof useProductsState>["skipInitialResetRef"];
  listStateRef: ReturnType<typeof useProductsState>["listStateRef"];
  pendingScrollY: ReturnType<typeof useProductsState>["pendingScrollY"];
  setPendingScrollY: ReturnType<typeof useProductsState>["setPendingScrollY"];
  listStateKey: ReturnType<typeof useProductsState>["listStateKey"];
  productList: ReturnType<typeof useProductsState>["productList"];
};

export function useProductsFeed({ restore, router, pathname, searchParams, searchQuery, sessionToken, viewMode, archiveView, sortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, productList }: UseProductsFeedParams) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [scrollYRef]);

  useEffect(() => {
    listStateRef.current = {
      feed: productFeed,
      page: productPage,
      pagination: productPagination,
      search: productSearch,
      sortBy,
      archiveView,
      viewMode,
    };
  }, [archiveView, productFeed, productPage, productPagination, productSearch, sortBy, viewMode, listStateRef]);

  // Snimak liste je jednokratan: pročitan je u prvom renderu (useProductsState), ovde se briše.
  useEffect(() => {
    if (restore.restored) clearListState(restore.key);
  }, [restore]);

  useEffect(() => {
    if (pendingScrollY === null) return;
    const target = pendingScrollY;
    setPendingScrollY(null);
    if (typeof window === "undefined") return;
    // Router posle povratka može sam da postavi skrol na vrh (htmlElement.scrollTop = 0) posle našeg poziva,
    // pa se cilj ponovo primenjuje još kratko, osim ako korisnik u međuvremenu sam skroluje.
    let userScrolled = false;
    const markUser = () => {
      userScrolled = true;
    };
    window.addEventListener("wheel", markUser, { passive: true, once: true });
    window.addEventListener("touchstart", markUser, { passive: true, once: true });
    const apply = () => {
      if (!userScrolled && Math.abs(window.scrollY - target) > 2) window.scrollTo({ top: target, behavior: "auto" });
    };
    requestAnimationFrame(apply);
    // Bez cleanup-a: setPendingScrollY(null) odmah ponovo pokreće efekat, a ponavljanja moraju da prežive taj render.
    [60, 160, 320].forEach((delay) => window.setTimeout(apply, delay));
    window.setTimeout(() => {
      window.removeEventListener("wheel", markUser);
      window.removeEventListener("touchstart", markUser);
    }, 400);
  }, [pendingScrollY, setPendingScrollY]);

  // Layout cleanup: upis pre nego što Next skroluje novu stranicu na vrh (inače bi se sačuvao skrol 0).
  useLayoutEffect(() => {
    return () => {
      const snapshot = listStateRef.current;
      if (!snapshot) return;
      writeListState<Product, ProductListResponse["pagination"]>(listStateKey, {
        items: snapshot.feed,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: scrollYRef.current,
        savedAt: Date.now(),
        extra: {
          search: snapshot.search,
          sortBy: snapshot.sortBy,
          archiveView: snapshot.archiveView,
          viewMode: snapshot.viewMode,
        },
      });
    };
  }, [listStateKey, listStateRef, scrollYRef]);

  const resetProductsFeed = useCallback(() => {
    if (loadMoreProductsTimerRef.current !== null) {
      window.clearTimeout(loadMoreProductsTimerRef.current);
      loadMoreProductsTimerRef.current = null;
    }
    setProductFeed([]);
    setProductPage(1);
    setProductPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setIsLoadingMoreProducts(false);
  }, [loadMoreProductsTimerRef, setIsLoadingMoreProducts, setProductFeed, setProductPage, setProductPagination]);

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
    resetProductsFeed();
  }, [resetProductsFeed, sessionToken, archiveView, skipInitialResetRef]);

  useEffect(() => {
    const current = listStateRef.current;
    const searchChanged = current.search !== searchQuery;
    if (!searchChanged) {
      skipUrlSyncRef.current = false;
      return;
    }
    setProductSearch(searchQuery);
    if (!skipUrlSyncRef.current) {
      resetProductsFeed();
    }
    skipUrlSyncRef.current = false;
  }, [resetProductsFeed, searchQuery, listStateRef, setProductSearch, skipUrlSyncRef]);

  useEffect(() => {
    if (!searchParams) return;
    const nextSearch = productSearch.trim();
    if (nextSearch === searchQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, productSearch, router, searchParams, searchQuery]);

  useEffect(() => {
    if (!productList) return;
    if (loadMoreProductsTimerRef.current !== null) {
      window.clearTimeout(loadMoreProductsTimerRef.current);
      loadMoreProductsTimerRef.current = null;
    }
    if (productList.pagination) {
      setProductPagination(productList.pagination);
    }
    if (productList.items) {
      setProductFeed((prev) => {
        const map = new Map(prev.map((entry) => [String(entry._id), entry]));
        productList.items.forEach((entry) => {
          map.set(String(entry._id), entry);
        });
        return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      });
    }
    setIsLoadingMoreProducts(false);
  }, [productList, loadMoreProductsTimerRef, setIsLoadingMoreProducts, setProductFeed, setProductPagination]);

  useEffect(() => {
    return () => {
      if (loadMoreProductsTimerRef.current !== null) {
        window.clearTimeout(loadMoreProductsTimerRef.current);
      }
    };
  }, [loadMoreProductsTimerRef]);

  const hasMoreProducts = productPagination.totalPages > productPage;

  const handleLoadMoreProducts = useCallback(() => {
    if (isLoadingMoreProducts) return;
    if (!hasMoreProducts) return;
    setIsLoadingMoreProducts(true);
    if (loadMoreProductsTimerRef.current !== null) {
      window.clearTimeout(loadMoreProductsTimerRef.current);
    }
    // Sledeća strana odmah (ranije veštačko čekanje od 850 ms); skeleton pokriva učitavanje.
    setProductPage((prev) => prev + 1);
  }, [hasMoreProducts, isLoadingMoreProducts, loadMoreProductsTimerRef, setIsLoadingMoreProducts, setProductPage]);

  useEffect(() => {
    const target = productsLoaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          handleLoadMoreProducts();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMoreProducts, productsLoaderRef]);

  return { resetProductsFeed, hasMoreProducts };
}
