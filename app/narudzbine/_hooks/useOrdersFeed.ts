"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConvexQuery } from "@/lib/convex";
import { clearListState, readListState, writeListState } from "@/lib/listState";
import type { Order, OrderListResponse, OrderStage } from "@/types/order";
import { emptyOrderListTotals } from "../_lib/types";
import { normalizeStageFilters, areArraysEqual, normalizeDateInput, resolveDateTimestamp, resolveTodayEndTimestamp, resolveOrderSortValue } from "../_lib/helpers";
import type { useRouter, useSearchParams } from "next/navigation";

type UseOrdersFeedParams = {
  basePath: string;
  orderScope: "default" | "kalaba";
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  searchParamsString: string;
  sessionToken: string;
};

export function useOrdersFeed({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken }: UseOrdersFeedParams) {
  const searchQuery = useMemo(() => searchParams?.get("q") ?? "", [searchParamsString, searchParams]);
  const dateFromQuery = useMemo(
    () => normalizeDateInput(searchParams?.get("from")),
    [searchParamsString, searchParams],
  );
  const dateToQuery = useMemo(
    () => normalizeDateInput(searchParams?.get("to")),
    [searchParamsString, searchParams],
  );
  const stageQuery = useMemo(
    () => normalizeStageFilters(searchParams ? searchParams.getAll("stage") : []),
    [searchParamsString, searchParams],
  );
  const unreturnedQuery = useMemo(() => searchParams?.get("unreturned") === "1", [searchParamsString, searchParams]);
  const returnedQuery = useMemo(() => searchParams?.get("returned") === "1", [searchParamsString, searchParams]);
  const pickupQuery = useMemo(() => searchParams?.get("pickup") === "1", [searchParamsString, searchParams]);
  const shippingQuery = useMemo(() => searchParams?.get("shipping") === "1", [searchParamsString, searchParams]);
  const lateQuery = useMemo(() => searchParams?.get("late") === "1", [searchParamsString, searchParams]);
  const effectiveUnreturnedQuery = unreturnedQuery && !returnedQuery;
  const effectiveReturnedQuery = returnedQuery;
  const effectiveShippingQuery = shippingQuery && !pickupQuery;
  const [search, setSearch] = useState(searchQuery);
  const [dateFrom, setDateFrom] = useState(dateFromQuery);
  const [dateTo, setDateTo] = useState(dateToQuery);
  const [stageFilters, setStageFilters] = useState<OrderStage[]>(stageQuery);
  const [showUnreturnedOnly, setShowUnreturnedOnly] = useState(effectiveUnreturnedQuery);
  const [showReturnedOnly, setShowReturnedOnly] = useState(effectiveReturnedQuery);
  const [showPickupOnly, setShowPickupOnly] = useState(pickupQuery);
  const [showShippingOnly, setShowShippingOnly] = useState(effectiveShippingQuery);
  const [showLateOnly, setShowLateOnly] = useState(lateQuery);
  const [filterMenuMode, setFilterMenuMode] = useState<"closed" | "hover" | "pinned">("closed");
  const [page, setPage] = useState(1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);
  const [ordersPagination, setOrdersPagination] = useState<OrderListResponse["pagination"]>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [ordersTotals, setOrdersTotals] = useState<OrderListResponse["totals"]>(emptyOrderListTotals);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const ordersLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadMoreOrdersTimerRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const skipUrlSyncRef = useRef(false);
  const skipInitialResetRef = useRef(false);
  const didRestoreRef = useRef(false);
  const listStateRef = useRef<{
    orders: Order[];
    page: number;
    pagination: OrderListResponse["pagination"];
    search: string;
    stageFilters: OrderStage[];
    showUnreturnedOnly: boolean;
    showReturnedOnly: boolean;
    showPickupOnly: boolean;
    showShippingOnly: boolean;
    showLateOnly: boolean;
    dateFrom: string;
    dateTo: string;
  }>({
    orders: [],
    page: 1,
    pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
    search: "",
    stageFilters: [],
    showUnreturnedOnly: false,
    showReturnedOnly: false,
    showPickupOnly: false,
    showShippingOnly: false,
    showLateOnly: false,
    dateFrom: "",
    dateTo: "",
  });
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);
  const listStateKey = useMemo(() => {
    const params = new URLSearchParams(searchParamsString);
    params.delete("productId");
    params.delete("orderModal");
    params.delete("nova");
    params.delete("restock");
    const suffix = params.toString();
    return `listState:${basePath}${suffix ? `?${suffix}` : ""}`;
  }, [basePath, searchParamsString]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const dateFromTimestamp = useMemo(() => resolveDateTimestamp(dateFrom, "start"), [dateFrom]);
  const dateToTimestamp = useMemo(() => {
    if (dateTo) return resolveDateTimestamp(dateTo, "end");
    if (dateFrom) return resolveTodayEndTimestamp();
    return undefined;
  }, [dateFrom, dateTo]);

  const orderListQueryArgs = useMemo<{
    token: string;
    search: string | undefined;
    stages: OrderStage[];
    unreturnedOnly: boolean;
    returnedOnly: boolean;
    pickupOnly: boolean;
    shippingOnly: boolean;
    lateOnly: boolean;
    dateFrom: number | undefined;
    dateTo: number | undefined;
    scope: "default" | "kalaba";
  }>(
    () => ({
      token: sessionToken,
      search: search.trim() ? search.trim() : undefined,
      stages: stageFilters,
      unreturnedOnly: showUnreturnedOnly,
      returnedOnly: showReturnedOnly,
      pickupOnly: showPickupOnly,
      shippingOnly: showShippingOnly,
      lateOnly: showLateOnly,
      dateFrom: dateFromTimestamp,
      dateTo: dateToTimestamp,
      scope: orderScope,
    }),
    [
      dateFromTimestamp,
      dateToTimestamp,
      orderScope,
      search,
      sessionToken,
      showPickupOnly,
      showShippingOnly,
      showLateOnly,
      showReturnedOnly,
      showUnreturnedOnly,
      stageFilters,
    ],
  );

  const list = useConvexQuery<OrderListResponse>("orders:list", {
    ...orderListQueryArgs,
    page,
    pageSize: 10,
  });
  const isOrdersLoading = list === undefined && orders.length === 0;
  const hasMoreOrders = ordersPagination.totalPages > page;
  const dateFilterActive = Boolean(dateFrom || dateTo);
  const activeFilterCount =
    stageFilters.length +
    (showUnreturnedOnly ? 1 : 0) +
    (showReturnedOnly ? 1 : 0) +
    (showPickupOnly ? 1 : 0) +
    (showShippingOnly ? 1 : 0) +
    (showLateOnly ? 1 : 0) +
    (dateFilterActive ? 1 : 0);
  const isFilterMenuOpen = filterMenuMode !== "closed";
  useEffect(() => {
    listStateRef.current = {
      orders,
      page,
      pagination: ordersPagination,
      search,
      stageFilters,
      showUnreturnedOnly,
      showReturnedOnly,
      showPickupOnly,
      showShippingOnly,
      showLateOnly,
      dateFrom,
      dateTo,
    };
  }, [orders, ordersPagination, page, search, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, stageFilters, dateFrom, dateTo]);

  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const stored = readListState<Order, OrderListResponse["pagination"]>(listStateKey);
    if (!stored) return;
    const storedSearch = typeof stored.extra?.search === "string" ? stored.extra.search : "";
    const storedStagesRaw = Array.isArray(stored.extra?.stageFilters) ? (stored.extra.stageFilters as string[]) : [];
    const storedStages = normalizeStageFilters(storedStagesRaw);
    const storedUnreturned = stored.extra?.showUnreturnedOnly === true;
    const storedReturned = stored.extra?.showReturnedOnly === true;
    const storedPickup = stored.extra?.showPickupOnly === true;
    const storedShipping = stored.extra?.showShippingOnly === true;
    const storedLate = stored.extra?.showLateOnly === true;
    const storedDateFrom = normalizeDateInput(
      typeof stored.extra?.dateFrom === "string" ? stored.extra.dateFrom : "",
    );
    const storedDateTo = normalizeDateInput(
      typeof stored.extra?.dateTo === "string" ? stored.extra.dateTo : "",
    );
    if (
      storedSearch !== searchQuery ||
      !areArraysEqual(storedStages, stageQuery) ||
      storedUnreturned !== effectiveUnreturnedQuery ||
      storedReturned !== effectiveReturnedQuery ||
      storedPickup !== pickupQuery ||
      storedShipping !== effectiveShippingQuery ||
      storedLate !== lateQuery ||
      storedDateFrom !== dateFromQuery ||
      storedDateTo !== dateToQuery
    ) {
      return;
    }
    skipInitialResetRef.current = true;
    skipUrlSyncRef.current = true;
    setOrders(stored.items ?? []);
    setPage(stored.page ?? 1);
    if (stored.pagination) {
      setOrdersPagination(stored.pagination);
    }
    setSearch(searchQuery);
    setDateFrom(dateFromQuery);
    setDateTo(dateToQuery);
    setStageFilters(stageQuery);
    setShowUnreturnedOnly(effectiveUnreturnedQuery);
    setShowReturnedOnly(effectiveReturnedQuery);
    setShowPickupOnly(pickupQuery);
    setShowShippingOnly(effectiveShippingQuery);
    setShowLateOnly(lateQuery);
    setPendingScrollY(typeof stored.scrollY === "number" ? stored.scrollY : null);
    clearListState(listStateKey);
  }, [
    listStateKey,
    searchQuery,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    effectiveShippingQuery,
    lateQuery,
    dateFromQuery,
    dateToQuery,
  ]);

  useEffect(() => {
    if (pendingScrollY === null) return;
    const target = pendingScrollY;
    setPendingScrollY(null);
    if (typeof window !== "undefined") {
      requestAnimationFrame(() => {
        window.scrollTo({ top: target, behavior: "auto" });
      });
    }
  }, [pendingScrollY]);

  useEffect(() => {
    return () => {
      const snapshot = listStateRef.current;
      if (!snapshot) return;
      writeListState<Order, OrderListResponse["pagination"]>(listStateKey, {
        items: snapshot.orders,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: scrollYRef.current,
        savedAt: Date.now(),
        extra: {
          search: snapshot.search,
          stageFilters: snapshot.stageFilters,
          showUnreturnedOnly: snapshot.showUnreturnedOnly,
          showReturnedOnly: snapshot.showReturnedOnly,
          showPickupOnly: snapshot.showPickupOnly,
          showShippingOnly: snapshot.showShippingOnly,
          showLateOnly: snapshot.showLateOnly,
          dateFrom: snapshot.dateFrom,
          dateTo: snapshot.dateTo,
        },
      });
    };
  }, [listStateKey]);

  const resetOrdersFeed = useCallback(() => {
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
      loadMoreOrdersTimerRef.current = null;
    }
    setOrders([]);
    setDraggingOrderId(null);
    setDragOverOrderId(null);
    setPage(1);
    setOrdersPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setOrdersTotals(emptyOrderListTotals);
    setIsLoadingMoreOrders(false);
  }, []);

  useEffect(() => {
    const current = listStateRef.current;
    const normalizedStageFilters = normalizeStageFilters(current.stageFilters);
    const searchChanged = current.search !== searchQuery;
    const dateFromChanged = current.dateFrom !== dateFromQuery;
    const dateToChanged = current.dateTo !== dateToQuery;
    const stagesChanged = !areArraysEqual(normalizedStageFilters, stageQuery);
    const unreturnedChanged = current.showUnreturnedOnly !== effectiveUnreturnedQuery;
    const returnedChanged = current.showReturnedOnly !== effectiveReturnedQuery;
    const pickupChanged = current.showPickupOnly !== pickupQuery;
    const shippingChanged = current.showShippingOnly !== effectiveShippingQuery;
    const lateChanged = current.showLateOnly !== lateQuery;
    if (!searchChanged && !dateFromChanged && !dateToChanged && !stagesChanged && !unreturnedChanged && !returnedChanged && !pickupChanged && !shippingChanged && !lateChanged) {
      skipUrlSyncRef.current = false;
      return;
    }
    if (searchChanged) {
      setSearch(searchQuery);
    }
    if (dateFromChanged) {
      setDateFrom(dateFromQuery);
    }
    if (dateToChanged) {
      setDateTo(dateToQuery);
    }
    if (stagesChanged) {
      setStageFilters(stageQuery);
    }
    if (unreturnedChanged) {
      setShowUnreturnedOnly(effectiveUnreturnedQuery);
    }
    if (returnedChanged) {
      setShowReturnedOnly(effectiveReturnedQuery);
    }
    if (pickupChanged) {
      setShowPickupOnly(pickupQuery);
    }
    if (shippingChanged) {
      setShowShippingOnly(effectiveShippingQuery);
    }
    if (lateChanged) {
      setShowLateOnly(lateQuery);
    }
    if (!skipUrlSyncRef.current) {
      resetOrdersFeed();
    }
    skipUrlSyncRef.current = false;
  }, [
    resetOrdersFeed,
    searchQuery,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    effectiveShippingQuery,
    lateQuery,
    dateFromQuery,
    dateToQuery,
  ]);

  useEffect(() => {
    if (!searchParams) return;
    const normalizedStages = normalizeStageFilters(stageFilters);
    const nextSearch = search.trim();
    const needsUpdate =
      nextSearch !== searchQuery ||
      dateFrom !== dateFromQuery ||
      dateTo !== dateToQuery ||
      !areArraysEqual(normalizedStages, stageQuery) ||
      showUnreturnedOnly !== effectiveUnreturnedQuery ||
      showReturnedOnly !== effectiveReturnedQuery ||
      showPickupOnly !== pickupQuery ||
      showShippingOnly !== effectiveShippingQuery ||
      showLateOnly !== lateQuery;
    if (!needsUpdate) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }
    if (dateFrom) {
      params.set("from", dateFrom);
    } else {
      params.delete("from");
    }
    if (dateTo) {
      params.set("to", dateTo);
    } else {
      params.delete("to");
    }
    params.delete("stage");
    normalizedStages.forEach((stage) => params.append("stage", stage));
    if (showUnreturnedOnly) {
      params.set("unreturned", "1");
    } else {
      params.delete("unreturned");
    }
    if (showReturnedOnly) {
      params.set("returned", "1");
    } else {
      params.delete("returned");
    }
    if (showPickupOnly) {
      params.set("pickup", "1");
    } else {
      params.delete("pickup");
    }
    if (showShippingOnly) {
      params.set("shipping", "1");
    } else {
      params.delete("shipping");
    }
    if (showLateOnly) {
      params.set("late", "1");
    } else {
      params.delete("late");
    }
    const next = params.toString();
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  }, [
    basePath,
    router,
    search,
    searchParams,
    searchQuery,
    showUnreturnedOnly,
    showReturnedOnly,
    showPickupOnly,
    showShippingOnly,
    showLateOnly,
    stageFilters,
    stageQuery,
    effectiveUnreturnedQuery,
    effectiveReturnedQuery,
    pickupQuery,
    effectiveShippingQuery,
    lateQuery,
    dateFrom,
    dateTo,
    dateFromQuery,
    dateToQuery,
  ]);

  const handleStageFilterToggle = useCallback(
    (stage: OrderStage) => {
      setStageFilters((prev) => (prev.includes(stage) ? prev.filter((item) => item !== stage) : [...prev, stage]));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleUnreturnedToggle = useCallback(
    (checked: boolean) => {
      setShowUnreturnedOnly(checked);
      if (checked) {
        setShowReturnedOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleReturnedToggle = useCallback(
    (checked: boolean) => {
      setShowReturnedOnly(checked);
      if (checked) {
        setShowUnreturnedOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handlePickupToggle = useCallback(
    (checked: boolean) => {
      setShowPickupOnly(checked);
      if (checked) {
        setShowShippingOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleShippingToggle = useCallback(
    (checked: boolean) => {
      setShowShippingOnly(checked);
      if (checked) {
        setShowPickupOnly(false);
      }
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleLateToggle = useCallback(
    (checked: boolean) => {
      setShowLateOnly(checked);
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleDateFromChange = useCallback(
    (value: string) => {
      setDateFrom(normalizeDateInput(value));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleDateToChange = useCallback(
    (value: string) => {
      setDateTo(normalizeDateInput(value));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  const handleClearDateFilter = useCallback(() => {
    setDateFrom("");
    setDateTo("");
    resetOrdersFeed();
  }, [resetOrdersFeed]);

  const handleFilterMenuEnter = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "pinned" ? prev : "hover"));
  }, []);

  const handleFilterMenuLeave = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "hover" ? "closed" : prev));
  }, []);

  const handleFilterMenuToggle = useCallback(() => {
    setFilterMenuMode((prev) => (prev === "pinned" ? "closed" : "pinned"));
  }, []);

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
    resetOrdersFeed();
  }, [resetOrdersFeed, sessionToken, orderScope]);

  useEffect(() => {
    if (!list) return;
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
      loadMoreOrdersTimerRef.current = null;
    }
    if (list.pagination) {
      setOrdersPagination(list.pagination);
    }
    if (list.totals) {
      setOrdersTotals(list.totals);
    }
    if (list.items) {
      setOrders((prev) => {
        const map = new Map(prev.map((entry) => [String(entry._id), entry]));
        list.items.forEach((entry) => {
          map.set(String(entry._id), entry);
        });
        return Array.from(map.values()).sort(
          (a, b) => resolveOrderSortValue(b) - resolveOrderSortValue(a) || b.kreiranoAt - a.kreiranoAt,
        );
      });
    }
    setIsLoadingMoreOrders(false);
  }, [list]);

  useEffect(() => {
    return () => {
      if (loadMoreOrdersTimerRef.current !== null) {
        window.clearTimeout(loadMoreOrdersTimerRef.current);
      }
    };
  }, []);

  const handleLoadMoreOrders = useCallback(() => {
    if (isLoadingMoreOrders) return;
    if (!hasMoreOrders) return;
    setIsLoadingMoreOrders(true);
    if (loadMoreOrdersTimerRef.current !== null) {
      window.clearTimeout(loadMoreOrdersTimerRef.current);
    }
    loadMoreOrdersTimerRef.current = window.setTimeout(() => {
      setPage((prev) => prev + 1);
    }, 850);
  }, [hasMoreOrders, isLoadingMoreOrders]);

  useEffect(() => {
    const target = ordersLoaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          handleLoadMoreOrders();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMoreOrders]);


  return { search, setSearch, dateFrom, dateTo, stageFilters, showUnreturnedOnly, showReturnedOnly, showPickupOnly, showShippingOnly, showLateOnly, setFilterMenuMode, page, orders, setOrders, draggingOrderId, setDraggingOrderId, dragOverOrderId, setDragOverOrderId, ordersPagination, ordersTotals, isLoadingMoreOrders, ordersLoaderRef, orderListQueryArgs, isOrdersLoading, hasMoreOrders, dateFilterActive, activeFilterCount, isFilterMenuOpen, resetOrdersFeed, handleStageFilterToggle, handleUnreturnedToggle, handleReturnedToggle, handlePickupToggle, handleShippingToggle, handleLateToggle, handleDateFromChange, handleDateToChange, handleClearDateFilter, handleFilterMenuEnter, handleFilterMenuLeave, handleFilterMenuToggle };
}

