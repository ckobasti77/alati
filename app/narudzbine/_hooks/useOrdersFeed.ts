"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useConvexQuery } from "@/lib/convex";
import { clearListState, readListState, writeListState } from "@/lib/listState";
import type { Order, OrderListResponse, OrderStage } from "@/types/order";
import { emptyOrderListTotals } from "../_lib/types";
import { normalizeStageFilters, areArraysEqual, normalizeDateInput, resolveDateTimestamp, resolveTodayEndTimestamp, resolveOrderSortValue } from "../_lib/helpers";
import type { useRouter, useSearchParams } from "next/navigation";

/** Veličina strane liste (infinite scroll). */
export const PAGE_SIZE = 30;
/** Pretraga se primenjuje kad korisnik zastane sa kucanjem. */
const SEARCH_DEBOUNCE_MS = 250;

type UseOrdersFeedParams = {
  basePath: string;
  orderScope: "default" | "kalaba";
  router: ReturnType<typeof useRouter>;
  searchParams: ReturnType<typeof useSearchParams>;
  searchParamsString: string;
  sessionToken: string;
};

type Pagination = OrderListResponse["pagination"];

export type OrderFilters = {
  /** Primenjena pretraga (bez razmaka na krajevima). */
  search: string;
  stages: OrderStage[];
  unreturned: boolean;
  returned: boolean;
  pickup: boolean;
  shipping: boolean;
  late: boolean;
  refund100: boolean;
  dateFrom: string;
  dateTo: string;
};

const EMPTY_PAGINATION: Pagination = { page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 1 };

/** Filteri iz URL-a. "returned" pobeđuje "unreturned", "pickup" pobeđuje "shipping" (kao ranije). */
export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const returned = params.get("returned") === "1";
  const pickup = params.get("pickup") === "1";
  return {
    search: (params.get("q") ?? "").trim(),
    stages: normalizeStageFilters(params.getAll("stage")),
    unreturned: params.get("unreturned") === "1" && !returned,
    returned,
    pickup,
    shipping: params.get("shipping") === "1" && !pickup,
    late: params.get("late") === "1",
    refund100: params.get("povrat100") === "1",
    dateFrom: normalizeDateInput(params.get("from")),
    dateTo: normalizeDateInput(params.get("to")),
  };
}

export const orderFiltersKey = (filters: OrderFilters) =>
  JSON.stringify({ ...filters, search: filters.search.trim(), stages: normalizeStageFilters(filters.stages) });

/** Upisuje filtere u postojeće parametre (ostali parametri, npr. prikaz/nova/productId, ostaju). */
export function writeOrderFilters(params: URLSearchParams, filters: OrderFilters) {
  const toggle = (key: string, on: boolean) => (on ? params.set(key, "1") : params.delete(key));
  const search = filters.search.trim();
  if (search) params.set("q", search);
  else params.delete("q");
  if (filters.dateFrom) params.set("from", filters.dateFrom);
  else params.delete("from");
  if (filters.dateTo) params.set("to", filters.dateTo);
  else params.delete("to");
  params.delete("stage");
  normalizeStageFilters(filters.stages).forEach((stage) => params.append("stage", stage));
  toggle("unreturned", filters.unreturned);
  toggle("returned", filters.returned);
  toggle("pickup", filters.pickup);
  toggle("shipping", filters.shipping);
  toggle("late", filters.late);
  toggle("povrat100", filters.refund100);
  return params;
}

/** Ključ za čuvanje liste (sessionStorage). Parametri koji ne menjaju listu se izostavljaju. */
export function buildListStateKey(basePath: string, searchParamsString: string) {
  const params = new URLSearchParams(searchParamsString);
  ["productId", "orderModal", "nova", "restock", "prikaz"].forEach((key) => params.delete(key));
  const suffix = params.toString();
  return `listState:${basePath}${suffix ? `?${suffix}` : ""}`;
}

type StoredExtra = Record<string, unknown> | undefined;

export function storedFiltersMatch(extra: StoredExtra, filters: OrderFilters) {
  const text = (value: unknown) => (typeof value === "string" ? value : "");
  return (
    text(extra?.search).trim() === filters.search &&
    areArraysEqual(normalizeStageFilters(Array.isArray(extra?.stageFilters) ? (extra.stageFilters as string[]) : []), filters.stages) &&
    (extra?.showUnreturnedOnly === true) === filters.unreturned &&
    (extra?.showReturnedOnly === true) === filters.returned &&
    (extra?.showPickupOnly === true) === filters.pickup &&
    (extra?.showShippingOnly === true) === filters.shipping &&
    (extra?.showLateOnly === true) === filters.late &&
    (extra?.showRefund100Only === true) === filters.refund100 &&
    normalizeDateInput(text(extra?.dateFrom)) === filters.dateFrom &&
    normalizeDateInput(text(extra?.dateTo)) === filters.dateTo
  );
}

// Oznaka da je feed resetovan: sledeći rezultat liste se spaja čak i ako je isti objekat kao pre.
const LIST_RESET = Symbol("list-reset");

export function useOrdersFeed({ basePath, orderScope, router, searchParams, searchParamsString, sessionToken }: UseOrdersFeedParams) {
  // Prvi render: filteri iz URL-a i, ako se poklapaju, sačuvana lista + skrol (povratak sa detalja).
  // Stranica se renderuje samo na klijentu (RequireAuth), pa je sessionStorage dostupan.
  const [initial] = useState(() => {
    const filters = parseOrderFilters(new URLSearchParams(searchParamsString));
    const key = buildListStateKey(basePath, searchParamsString);
    const stored = readListState<Order, Pagination>(key);
    // Sačuvane strane drugačije veličine bi preskočile redove pri sledećem učitavanju.
    const restorable =
      stored && storedFiltersMatch(stored.extra, filters) && (stored.pagination?.pageSize ?? PAGE_SIZE) === PAGE_SIZE ? stored : null;
    return { filters, key, restored: restorable };
  });

  const [filters, setFilters] = useState<OrderFilters>(initial.filters);
  const [searchInput, setSearchInputState] = useState(initial.filters.search);
  const [page, setPage] = useState(initial.restored?.page ?? 1);
  const [orders, setOrders] = useState<Order[]>(initial.restored?.items ?? []);
  const [ordersPagination, setOrdersPagination] = useState<Pagination>(initial.restored?.pagination ?? EMPTY_PAGINATION);
  const [ordersTotals, setOrdersTotals] = useState<OrderListResponse["totals"]>(emptyOrderListTotals);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);
  const [dragOverOrderId, setDragOverOrderId] = useState<string | null>(null);
  const [mergedList, setMergedList] = useState<OrderListResponse | undefined | typeof LIST_RESET>(undefined);

  const ordersLoaderRef = useRef<HTMLDivElement | null>(null);
  const scrollYRef = useRef(0);
  const searchTimerRef = useRef<number | null>(null);
  const listStateRef = useRef({ orders, page, pagination: ordersPagination, filters });
  const filtersRef = useRef(filters);
  const listStateKey = useMemo(() => buildListStateKey(basePath, searchParamsString), [basePath, searchParamsString]);

  const resetOrdersFeed = useCallback(() => {
    setOrders([]);
    setDraggingOrderId(null);
    setDragOverOrderId(null);
    setPage(1);
    setOrdersPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setOrdersTotals(emptyOrderListTotals);
    setIsLoadingMoreOrders(false);
    setMergedList(LIST_RESET);
  }, []);

  // URL → filteri (nazad/napred, link sa table). Sopstveni upis u URL daje isti ključ, pa ne resetuje.
  const urlFilters = useMemo(() => parseOrderFilters(new URLSearchParams(searchParamsString)), [searchParamsString]);
  const urlKey = orderFiltersKey(urlFilters);
  const [syncedUrlKey, setSyncedUrlKey] = useState(urlKey);
  if (urlKey !== syncedUrlKey) {
    setSyncedUrlKey(urlKey);
    if (urlKey !== orderFiltersKey(filters)) {
      setFilters(urlFilters);
      setSearchInputState(urlFilters.search);
      resetOrdersFeed();
    }
  }

  // Nova sesija ili scope: lista kreće iz početka.
  const sessionKey = `${sessionToken}|${orderScope}`;
  const [syncedSessionKey, setSyncedSessionKey] = useState(sessionKey);
  if (sessionKey !== syncedSessionKey) {
    setSyncedSessionKey(sessionKey);
    resetOrdersFeed();
  }

  const dateFromTimestamp = useMemo(() => resolveDateTimestamp(filters.dateFrom, "start"), [filters.dateFrom]);
  const dateToTimestamp = useMemo(() => {
    if (filters.dateTo) return resolveDateTimestamp(filters.dateTo, "end");
    if (filters.dateFrom) return resolveTodayEndTimestamp();
    return undefined;
  }, [filters.dateFrom, filters.dateTo]);

  const orderListQueryArgs = useMemo<{
    token: string;
    search: string | undefined;
    stages: OrderStage[];
    unreturnedOnly: boolean;
    returnedOnly: boolean;
    pickupOnly: boolean;
    shippingOnly: boolean;
    lateOnly: boolean;
    refund100Only?: true;
    dateFrom: number | undefined;
    dateTo: number | undefined;
    scope: "default" | "kalaba";
  }>(
    () => ({
      token: sessionToken,
      search: filters.search || undefined,
      stages: filters.stages,
      unreturnedOnly: filters.unreturned,
      returnedOnly: filters.returned,
      pickupOnly: filters.pickup,
      shippingOnly: filters.shipping,
      lateOnly: filters.late,
      // Šalje se samo kad je uključen (stariji backend ne zna za argument).
      ...(filters.refund100 ? { refund100Only: true as const } : {}),
      dateFrom: dateFromTimestamp,
      dateTo: dateToTimestamp,
      scope: orderScope,
    }),
    [dateFromTimestamp, dateToTimestamp, filters, orderScope, sessionToken],
  );

  const list = useConvexQuery<OrderListResponse>("orders:list", { ...orderListQueryArgs, page, pageSize: PAGE_SIZE });

  // Rezultat strane → lista (spaja se po ID-u, pa realtime izmene učitanih stavki stižu same).
  if (list !== mergedList) {
    setMergedList(list);
    if (list) {
      if (list.pagination) setOrdersPagination(list.pagination);
      if (list.totals) setOrdersTotals(list.totals);
      if (list.items) {
        setOrders((prev) => {
          const map = new Map(prev.map((entry) => [String(entry._id), entry]));
          list.items.forEach((entry) => map.set(String(entry._id), entry));
          return Array.from(map.values()).sort(
            (a, b) => resolveOrderSortValue(b) - resolveOrderSortValue(a) || b.kreiranoAt - a.kreiranoAt,
          );
        });
      }
      setIsLoadingMoreOrders(false);
    }
  }

  const isOrdersLoading = list === undefined && orders.length === 0;
  const hasMoreOrders = ordersPagination.totalPages > page;
  const dateFilterActive = Boolean(filters.dateFrom || filters.dateTo);
  const activeFilterCount =
    filters.stages.length +
    (filters.unreturned ? 1 : 0) +
    (filters.returned ? 1 : 0) +
    (filters.pickup ? 1 : 0) +
    (filters.shipping ? 1 : 0) +
    (filters.late ? 1 : 0) +
    (filters.refund100 ? 1 : 0) +
    (dateFilterActive ? 1 : 0);

  // Snimci za čuvanje pri odlasku i za pretragu (ref, bez novog rendera).
  useEffect(() => {
    listStateRef.current = { orders, page, pagination: ordersPagination, filters };
    filtersRef.current = filters;
  }, [orders, page, ordersPagination, filters]);

  useEffect(() => {
    const handleScroll = () => {
      scrollYRef.current = window.scrollY;
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Vraćena lista: snimak je jednokratan; skrol se vraća posle prvog crtanja.
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
      writeListState<Order, Pagination>(listStateKey, {
        items: snapshot.orders,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: scrollYRef.current,
        savedAt: Date.now(),
        extra: {
          search: snapshot.filters.search,
          stageFilters: snapshot.filters.stages,
          showUnreturnedOnly: snapshot.filters.unreturned,
          showReturnedOnly: snapshot.filters.returned,
          showPickupOnly: snapshot.filters.pickup,
          showShippingOnly: snapshot.filters.shipping,
          showLateOnly: snapshot.filters.late,
          showRefund100Only: snapshot.filters.refund100,
          dateFrom: snapshot.filters.dateFrom,
          dateTo: snapshot.filters.dateTo,
        },
      });
    };
  }, [listStateKey]);

  // Filteri → URL (ostali parametri ostaju).
  useEffect(() => {
    if (!searchParams) return;
    const current = searchParams.toString();
    if (orderFiltersKey(filters) === orderFiltersKey(parseOrderFilters(new URLSearchParams(current)))) return;
    const next = writeOrderFilters(new URLSearchParams(current), filters).toString();
    router.replace(next ? `${basePath}?${next}` : basePath, { scroll: false });
  }, [basePath, filters, router, searchParams]);

  const updateFilters = useCallback(
    (patch: Partial<OrderFilters>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );

  // Pretraga: polje odmah, lista posle pauze. Samo razmak na kraju ne menja primenjenu pretragu.
  const applySearch = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (filtersRef.current.search === trimmed) return;
      updateFilters({ search: trimmed });
    },
    [updateFilters],
  );
  const setSearchInput = useCallback(
    (value: string) => {
      setSearchInputState(value);
      if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = window.setTimeout(() => {
        searchTimerRef.current = null;
        applySearch(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [applySearch],
  );
  const clearSearch = useCallback(() => {
    if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = null;
    setSearchInputState("");
    applySearch("");
  }, [applySearch]);
  useEffect(
    () => () => {
      if (searchTimerRef.current !== null) window.clearTimeout(searchTimerRef.current);
    },
    [],
  );

  const handleStageFilterToggle = useCallback(
    (stage: OrderStage) => {
      setFilters((prev) => ({
        ...prev,
        stages: prev.stages.includes(stage) ? prev.stages.filter((item) => item !== stage) : normalizeStageFilters([...prev.stages, stage]),
      }));
      resetOrdersFeed();
    },
    [resetOrdersFeed],
  );
  const handleUnreturnedToggle = useCallback(
    (checked: boolean) => updateFilters(checked ? { unreturned: true, returned: false } : { unreturned: false }),
    [updateFilters],
  );
  const handleReturnedToggle = useCallback(
    (checked: boolean) => updateFilters(checked ? { returned: true, unreturned: false } : { returned: false }),
    [updateFilters],
  );
  const handlePickupToggle = useCallback(
    (checked: boolean) => updateFilters(checked ? { pickup: true, shipping: false } : { pickup: false }),
    [updateFilters],
  );
  const handleShippingToggle = useCallback(
    (checked: boolean) => updateFilters(checked ? { shipping: true, pickup: false } : { shipping: false }),
    [updateFilters],
  );
  const handleLateToggle = useCallback((checked: boolean) => updateFilters({ late: checked }), [updateFilters]);
  const handleRefund100Toggle = useCallback((checked: boolean) => updateFilters({ refund100: checked }), [updateFilters]);
  const handleDateFromChange = useCallback((value: string) => updateFilters({ dateFrom: normalizeDateInput(value) }), [updateFilters]);
  const handleDateToChange = useCallback((value: string) => updateFilters({ dateTo: normalizeDateInput(value) }), [updateFilters]);
  /** Ceo period odjednom (brzi izbori: Danas, 7 dana…). */
  const handleDateRangeChange = useCallback(
    (from: string, to: string) => updateFilters({ dateFrom: normalizeDateInput(from), dateTo: normalizeDateInput(to) }),
    [updateFilters],
  );
  const handleClearDateFilter = useCallback(() => updateFilters({ dateFrom: "", dateTo: "" }), [updateFilters]);
  /** Briše sve filtere (pretraga ostaje). */
  const clearAllFilters = useCallback(
    () =>
      updateFilters({
        stages: [],
        unreturned: false,
        returned: false,
        pickup: false,
        shipping: false,
        late: false,
        refund100: false,
        dateFrom: "",
        dateTo: "",
      }),
    [updateFilters],
  );

  const handleLoadMoreOrders = useCallback(() => {
    if (isLoadingMoreOrders || !hasMoreOrders) return;
    setIsLoadingMoreOrders(true);
    setPage((prev) => prev + 1);
  }, [hasMoreOrders, isLoadingMoreOrders]);

  useEffect(() => {
    const target = ordersLoaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) handleLoadMoreOrders();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMoreOrders]);

  return {
    search: filters.search,
    searchInput,
    setSearchInput,
    clearSearch,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    stageFilters: filters.stages,
    showUnreturnedOnly: filters.unreturned,
    showReturnedOnly: filters.returned,
    showPickupOnly: filters.pickup,
    showShippingOnly: filters.shipping,
    showLateOnly: filters.late,
    showRefund100Only: filters.refund100,
    page,
    orders,
    setOrders,
    draggingOrderId,
    setDraggingOrderId,
    dragOverOrderId,
    setDragOverOrderId,
    ordersPagination,
    ordersTotals,
    isLoadingMoreOrders,
    ordersLoaderRef,
    orderListQueryArgs,
    isOrdersLoading,
    hasMoreOrders,
    dateFilterActive,
    activeFilterCount,
    resetOrdersFeed,
    handleStageFilterToggle,
    handleUnreturnedToggle,
    handleReturnedToggle,
    handlePickupToggle,
    handleShippingToggle,
    handleLateToggle,
    handleRefund100Toggle,
    handleDateRangeChange,
    clearAllFilters,
    handleDateFromChange,
    handleDateToChange,
    handleClearDateFilter,
  };
}
