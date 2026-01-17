"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Facebook, Instagram, Layers, LayoutGrid, List, Search, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { LoadingDots } from "@/components/LoadingDots";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import { formatCurrency } from "@/lib/format";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";
import { clearListState, readListState, writeListState } from "@/lib/listState";
import type { Product, ProductListResponse, ProductVariant } from "@/types/order";

type Platform = "facebook" | "instagram";
type ScheduledStatus = "scheduled" | "processing" | "failed";

type ScheduledPostItem = {
  _id: string;
  productId: string;
  productName: string;
  platform: Platform;
  scheduledAt: number;
  status: ScheduledStatus;
  error?: string;
};

const PRODUCTS_PAGE_SIZE = 20;

function resolvePrimaryVariant(product: Product): ProductVariant | undefined {
  const variants = product.variants ?? [];
  return variants.find((variant) => variant.isDefault) ?? variants[0];
}

function getMainImage(product?: Product | null) {
  if (!product) return null;
  const images = product.images ?? [];
  return images.find((image) => image.isMain) ?? images[0] ?? null;
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = typeof window !== "undefined" ? window.matchMedia("(max-width: 768px)") : null;
    if (!media) return;
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export default function SocialPostsPage() {
  return (
    <RequireAuth adminOnly>
      <SocialContent />
    </RequireAuth>
  );
}

function SocialContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const searchQuery = useMemo(() => searchParams?.get("q") ?? "", [searchParamsString, searchParams]);
  const { user, token } = useAuth();
  const sessionToken = token as string | null;
  const [search, setSearch] = useState(searchQuery);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledHour, setScheduledHour] = useState<string>("");
  const [scheduledMinute, setScheduledMinute] = useState<string>("");
  const [publishing, setPublishing] = useState<Platform | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const isMobile = useIsMobile();
  const topRef = useRef<HTMLDivElement | null>(null);
  const [page, setPage] = useState(1);
  const [productsFeed, setProductsFeed] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<ProductListResponse["pagination"]>({
    page: 1,
    pageSize: PRODUCTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoadingMorePosts, setIsLoadingMorePosts] = useState(false);
  const postsLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadMorePostsTimerRef = useRef<number | null>(null);
  const skipUrlSyncRef = useRef(false);
  const skipInitialResetRef = useRef(false);
  const didRestoreRef = useRef(false);
  const listStateRef = useRef<{
    feed: Product[];
    page: number;
    pagination: ProductListResponse["pagination"];
    search: string;
    viewMode: "grid" | "list";
  }>({
    feed: [],
    page: 1,
    pagination: { page: 1, pageSize: PRODUCTS_PAGE_SIZE, total: 0, totalPages: 1 },
    search: "",
    viewMode: "grid",
  });
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(null);
  const listStateKey = useMemo(() => {
    const suffix = searchParamsString ? `?${searchParamsString}` : "";
    return `listState:${pathname}${suffix}`;
  }, [pathname, searchParamsString]);
  const schedulePost = useConvexMutation<{
    token: string;
    productId: string;
    platform: Platform;
    scheduledAt: number;
  }>("socialScheduler:schedule");
  const removeScheduledPost = useConvexMutation<{ token: string; id: string }>("socialScheduler:removeScheduled");
  const scheduledPosts = useConvexQuery<ScheduledPostItem[]>("socialScheduler:listScheduled", {
    token: sessionToken ?? "",
  });
  const scheduleFormatter = useMemo(
    () => new Intl.DateTimeFormat("sr-RS", { dateStyle: "medium", timeStyle: "short" }),
    [],
  );
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0")),
    [],
  );
  const minuteOptions = useMemo(
    () => Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0")),
    [],
  );
  const [removingScheduledId, setRemovingScheduledId] = useState<string | null>(null);

  useEffect(() => {
    listStateRef.current = {
      feed: productsFeed,
      page,
      pagination,
      search,
      viewMode,
    };
  }, [page, pagination, productsFeed, search, viewMode]);

  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const stored = readListState<Product, ProductListResponse["pagination"]>(listStateKey);
    if (!stored) return;
    const storedSearch = typeof stored.extra?.search === "string" ? stored.extra.search : "";
    if (storedSearch !== searchQuery) return;
    const storedView = stored.extra?.viewMode;
    skipInitialResetRef.current = true;
    skipUrlSyncRef.current = true;
    if (typeof storedView === "string" && (storedView === "grid" || storedView === "list")) {
      setViewMode(storedView);
    }
    setProductsFeed(stored.items ?? []);
    setPage(stored.page ?? 1);
    if (stored.pagination) {
      setPagination(stored.pagination);
    }
    setSearch(searchQuery);
    setPendingScrollY(typeof stored.scrollY === "number" ? stored.scrollY : null);
    clearListState(listStateKey);
  }, [listStateKey, searchQuery]);

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
      writeListState<Product, ProductListResponse["pagination"]>(listStateKey, {
        items: snapshot.feed,
        page: snapshot.page,
        pagination: snapshot.pagination,
        scrollY: typeof window !== "undefined" ? window.scrollY : 0,
        savedAt: Date.now(),
        extra: {
          search: snapshot.search,
          viewMode: snapshot.viewMode,
        },
      });
    };
  }, [listStateKey]);

  const resetProductsFeed = useCallback(() => {
    if (loadMorePostsTimerRef.current !== null) {
      window.clearTimeout(loadMorePostsTimerRef.current);
      loadMorePostsTimerRef.current = null;
    }
    setProductsFeed([]);
    setPage(1);
    setPagination((prev) => ({ ...prev, page: 1, total: 0, totalPages: 1 }));
    setIsLoadingMorePosts(false);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setViewMode("grid");
    }
  }, [isMobile]);

  const list = useConvexQuery<ProductListResponse>("products:listPaginated", {
    token: sessionToken ?? "",
    search: search.trim() || undefined,
    page,
    pageSize: PRODUCTS_PAGE_SIZE,
  });

  useEffect(() => {
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
    resetProductsFeed();
  }, [resetProductsFeed, sessionToken]);

  useEffect(() => {
    const current = listStateRef.current;
    const searchChanged = current.search !== searchQuery;
    if (!searchChanged) {
      skipUrlSyncRef.current = false;
      return;
    }
    setSearch(searchQuery);
    if (!skipUrlSyncRef.current) {
      resetProductsFeed();
    }
    skipUrlSyncRef.current = false;
  }, [resetProductsFeed, searchQuery]);

  useEffect(() => {
    if (!searchParams) return;
    const nextSearch = search.trim();
    if (nextSearch === searchQuery) return;
    const params = new URLSearchParams(searchParams.toString());
    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [pathname, router, search, searchParams, searchQuery]);

  useEffect(() => {
    if (!list) return;
    if (loadMorePostsTimerRef.current !== null) {
      window.clearTimeout(loadMorePostsTimerRef.current);
      loadMorePostsTimerRef.current = null;
    }
    if (list.pagination) {
      setPagination(list.pagination);
    }
    if (list.items) {
      setProductsFeed((prev) => {
        const map = new Map(prev.map((item) => [String(item._id), item]));
        list.items.forEach((item) => {
          map.set(String(item._id), item);
        });
        return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      });
    }
    setIsLoadingMorePosts(false);
  }, [list]);

  useEffect(() => {
    return () => {
      if (loadMorePostsTimerRef.current !== null) {
        window.clearTimeout(loadMorePostsTimerRef.current);
      }
    };
  }, []);

  const hasMorePosts = pagination.totalPages > page;

  const handleLoadMorePosts = useCallback(() => {
    if (isLoadingMorePosts) return;
    if (!hasMorePosts) return;
    setIsLoadingMorePosts(true);
    if (loadMorePostsTimerRef.current !== null) {
      window.clearTimeout(loadMorePostsTimerRef.current);
    }
    loadMorePostsTimerRef.current = window.setTimeout(() => {
      setPage((prev) => prev + 1);
    }, 850);
  }, [hasMorePosts, isLoadingMorePosts]);

  useEffect(() => {
    const target = postsLoaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          handleLoadMorePosts();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [handleLoadMorePosts]);

  const visibleProducts = productsFeed;

  const selectedProduct = useMemo(
    () => productsFeed.find((item) => item._id === selectedProductId) ?? null,
    [productsFeed, selectedProductId],
  );

  const mainImage = useMemo(() => {
    if (!selectedProduct) return null;
    const images = selectedProduct.images ?? [];
    return images.find((image) => image.isMain) ?? images[0] ?? null;
  }, [selectedProduct]);

  const captionPreview = useMemo(() => {
    if (!selectedProduct) return "";
    return selectedProduct.opisFbInsta || selectedProduct.opis || selectedProduct.opisKp || selectedProduct.name;
  }, [selectedProduct]);

  if (user?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pristup zabranjen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Samo admin moze da zakazuje i objavljuje objave.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product._id);
    if (typeof window !== "undefined" && window.scrollY > 120) {
      const target = topRef.current;
      if (target?.scrollIntoView) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  const publish = async (platform: Platform) => {
    if (!sessionToken) {
      toast.error("Nije pronadjen token. Prijavi se ponovo.");
      return;
    }
    if (!selectedProduct) {
      toast.error("Izaberi proizvod za objavu.");
      return;
    }
    try {
      setPublishing(platform);
      const hasSchedule = Boolean(scheduledDate.trim() || scheduledHour.trim() || scheduledMinute.trim());
      if (hasSchedule) {
        if (!scheduledDate.trim() || !scheduledHour.trim() || !scheduledMinute.trim()) {
          toast.error("Izaberi datum i vreme.");
          return;
        }
        const scheduledTs = new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}`).getTime();
        if (!Number.isFinite(scheduledTs)) {
          toast.error("Neispravan datum zakazivanja.");
          return;
        }
        await schedulePost({
          token: sessionToken,
          productId: selectedProduct._id,
          platform,
          scheduledAt: scheduledTs,
        });
        toast.success("Objava je zakazana.");
        return;
      }
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productId: selectedProduct._id,
          token: sessionToken,
          scheduledAt: null,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Neuspela objava.");
      }
      toast.success(
        platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.",
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };

  const handleRemoveScheduled = async (id: string) => {
    if (!sessionToken) {
      toast.error("Nije pronadjen token. Prijavi se ponovo.");
      return;
    }
    try {
      setRemovingScheduledId(id);
      await removeScheduledPost({ token: sessionToken, id });
      toast.success("Zakazana objava je obrisana.");
    } catch (error: any) {
      toast.error(error?.message ?? "Brisanje nije uspelo.");
    } finally {
      setRemovingScheduledId(null);
    }
  };

  return (
    <div ref={topRef} className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Objave na mreze</h1>
          <p className="text-sm text-slate-500">
            Izaberi proizvod, pogledaj opis i okaci na Facebook ili Instagram. Prazno vreme zakazivanja = odmah.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Zakazane objave</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduledPosts === undefined ? (
            <p className="text-sm text-slate-500">Ucitavanje zakazanih objava...</p>
          ) : scheduledPosts.length === 0 ? (
            <p className="text-sm text-slate-500">Nema zakazanih objava.</p>
          ) : (
            <div className="space-y-2">
              {scheduledPosts.map((item) => {
                const scheduledLabel = scheduleFormatter.format(new Date(item.scheduledAt));
                const isFailed = item.status === "failed";
                const isProcessing = item.status === "processing";
                return (
                  <div
                    key={item._id}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm",
                      isFailed ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-slate-900">
                          <span className="font-semibold">{item.productName}</span>
                          <span className="text-xs text-slate-500">{scheduledLabel}</span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          {item.platform === "facebook" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/10 px-2 py-0.5 text-blue-700">
                              <Facebook className="h-3.5 w-3.5" />
                              Facebook
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-500/10 px-2 py-0.5 text-pink-700">
                              <Instagram className="h-3.5 w-3.5" />
                              Instagram
                            </span>
                          )}
                          <span className={cn("font-semibold", isFailed && "text-rose-600")}>
                            {isProcessing ? "U toku" : isFailed ? "Neuspelo" : "Zakazano"}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveScheduled(item._id)}
                        disabled={isProcessing || removingScheduledId === item._id}
                      >
                        {removingScheduledId === item._id ? "Brisem..." : "Obrisi"}
                      </Button>
                    </div>
                    {isFailed && item.error ? (
                      <p className="text-xs text-rose-600">{item.error}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Izbor proizvoda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                placeholder={list === undefined ? "Ucitavanje..." : "Pretrazi proizvode"}
                onChange={(event) => {
                  setSearch(event.target.value);
                  resetProductsFeed();
                }}
                className="pl-9"
              />
            </div>
            <div className="hidden md:flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <Button
                type="button"
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
                Grid
              </Button>
              <Button
                type="button"
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="gap-2 rounded-full"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-inner sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full sm:max-w-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Zakazivanje</p>
              <div className="mt-1 grid grid-cols-[1fr_auto_auto] gap-2">
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(event) => setScheduledDate(event.target.value)}
                  className="h-9 text-sm"
                />
                <select
                  value={scheduledHour}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      setScheduledHour("");
                      setScheduledMinute("");
                      return;
                    }
                    setScheduledHour(value);
                    if (value && !scheduledMinute) {
                      setScheduledMinute("00");
                    }
                  }}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  aria-label="Sati"
                >
                  <option value="">hh</option>
                  {hourOptions.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour}
                    </option>
                  ))}
                </select>
                <select
                  value={scheduledMinute}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      setScheduledMinute("");
                      setScheduledHour("");
                      return;
                    }
                    setScheduledMinute(value);
                    if (value && !scheduledHour) {
                      setScheduledHour("00");
                    }
                  }}
                  className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
                  aria-label="Minuti"
                >
                  <option value="">mm</option>
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-[11px] text-slate-500">Prazno = objava odmah.</p>
            </div>
            {selectedProduct ? (
              <div className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2 text-left shadow-sm ring-1 ring-slate-200 sm:max-w-sm">
                <div className="h-12 w-12 overflow-hidden rounded-md bg-slate-100">
                  {mainImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainImage.url} alt={selectedProduct.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                      Bez slike
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Izabrano za objavu</p>
                  <p className="truncate text-sm font-semibold text-slate-900">{selectedProduct.kpName ?? selectedProduct.name}</p>
                </div>
              </div>
            ) : null}
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Button
                size="sm"
                className="h-9 sm:w-40"
                onClick={() => publish("facebook")}
                disabled={publishing !== null || !selectedProduct}
              >
                {publishing === "facebook" ? "Objavljivanje..." : "Okaci na Facebook"}
              </Button>
              <Button
                size="sm"
                className="h-9 sm:w-40"
                variant="outline"
                onClick={() => publish("instagram")}
                disabled={publishing !== null || !selectedProduct}
              >
                {publishing === "instagram" ? "Objavljivanje..." : "Okaci na Instagram"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[7fr,5fr]">
            <div className="space-y-3">
              {list === undefined && productsFeed.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Ucitavanje proizvoda...
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                  Nema proizvoda koji odgovaraju pretrazi.
                </div>
              ) : viewMode === "list" && !isMobile ? (
                <div className="space-y-2">
                  {visibleProducts.map((product) => {
                    const main = getMainImage(product);
                    const isActive = selectedProductId === product._id;
                    const primaryVariant = resolvePrimaryVariant(product);
                    const price = formatCurrency(primaryVariant?.prodajnaCena ?? product.prodajnaCena, "EUR");
                    const isVariantProduct = (product.variants ?? []).length > 0;
                    return (
                      <button
                        key={product._id}
                        type="button"
                        className={cn(
                          "relative flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                          isActive
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm",
                        )}
                        onClick={() => handleSelectProduct(product)}
                      >
                        {isActive ? (
                          <span className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md ring-2 ring-white">
                            <Check className="h-4 w-4" />
                          </span>
                        ) : null}
                        <div className="relative h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                          {main?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={main.url} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                              Bez slike
                            </div>
                          )}
                          {isVariantProduct ? (
                            <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                              <Layers className="h-3 w-3" />
                              Tipski
                            </span>
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{product.kpName ?? product.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
                              {price}
                            </span>
                            {product.pickupAvailable ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                                <UserRound className="h-3.5 w-3.5" />
                                Licno
                              </span>
                            ) : null}
                            {product.publishIg ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                <Instagram className="h-3.5 w-3.5" />
                                IG
                              </span>
                            ) : null}
                            {product.publishFb ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                                <Facebook className="h-3.5 w-3.5" />
                                FB
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {visibleProducts.map((product) => {
                    const main = getMainImage(product);
                    const primaryVariant = resolvePrimaryVariant(product);
                    const price = formatCurrency(primaryVariant?.prodajnaCena ?? product.prodajnaCena, "EUR");
                    const isVariantProduct = (product.variants ?? []).length > 0;
                    const isActive = selectedProductId === product._id;
                    return (
                      <button
                        key={product._id}
                        type="button"
                        className={cn(
                          "group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
                          isActive && "ring-2 ring-blue-500 ring-offset-2",
                        )}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <div className="absolute right-2 top-2 z-20 flex items-center gap-2">
                          {isActive ? (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-2 ring-white/90">
                              <Check className="h-4 w-4" />
                            </span>
                          ) : null}
                          <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-slate-900 shadow">
                            {price}
                          </span>
                        </div>
                        {main?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={main.url}
                            alt={product.kpName ?? product.name}
                            className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:blur-[1px]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Bez slike
                          </div>
                        )}
                        <div className="absolute inset-0 z-0 bg-black/35" />
                        {isVariantProduct ? (
                          <span className="absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold text-white shadow-lg">
                            <Layers className="h-5 w-5" />
                            Tipski
                          </span>
                        ) : null}
                        {product.pickupAvailable ? (
                          <span className="absolute left-2 bottom-2 z-20 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-slate-900 shadow">
                            <UserRound className="h-4 w-4" />
                            Licno
                          </span>
                        ) : null}
                        <div className="absolute right-2 bottom-2 z-30 flex gap-2">
                          {product.publishIg ? (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-[0_0_16px_rgba(244,114,182,0.55)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                              <Instagram className="h-5 w-5 drop-shadow-[0_0_8px_rgba(244,114,182,0.55)]" />
                            </span>
                          ) : null}
                          {product.publishFb ? (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_16px_rgba(37,99,235,0.5)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                              <Facebook className="h-5 w-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                            </span>
                          ) : null}
                        </div>
                        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pr-16 pb-6 pt-8 text-left">
                          <p className="truncate text-sm font-semibold text-white mb-1">{product.kpName ?? product.name}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {visibleProducts.length > 0 ? (
              <div ref={postsLoaderRef} className="flex justify-center">
                <LoadingDots show={isLoadingMorePosts && hasMorePosts} />
              </div>
            ) : null}

            {selectedProduct ? (
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {mainImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainImage.url} alt={selectedProduct.name} className="h-64 w-full object-cover" />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-slate-500">Nema slike</div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Opis za FB/IG</p>
                  <div
                    className={richTextOutputClassNames}
                    dangerouslySetInnerHTML={{ __html: formatRichTextToHtml(captionPreview) }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
                Izaberi proizvod da vidis pregled.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
