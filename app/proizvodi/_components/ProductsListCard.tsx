"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { ArrowUpRight, Facebook, Instagram, Layers, LayoutGrid, List, Search, ShoppingBag, Share2, Tag, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingDots } from "@/components/LoadingDots";
import { formatCurrency } from "@/lib/format";
import type { Category } from "@/types/order";
import { type SortOption } from "../_lib/productHelpers";
import type { useProductAdminActions } from "../_hooks/useProductAdminActions";
import type { useProductEdit } from "../_hooks/useProductEdit";
import type { useProductsFeed } from "../_hooks/useProductsFeed";
import type { useProductsState } from "../_hooks/useProductsState";
import type { useProductsView } from "../_hooks/useProductsView";

type ProductsListCardProps = {
  viewMode: ReturnType<typeof useProductsState>["viewMode"];
  setViewMode: ReturnType<typeof useProductsState>["setViewMode"];
  archiveView: ReturnType<typeof useProductsState>["archiveView"];
  setArchiveView: ReturnType<typeof useProductsState>["setArchiveView"];
  isMobile: ReturnType<typeof useProductsState>["isMobile"];
  sortBy: ReturnType<typeof useProductsState>["sortBy"];
  setSortBy: ReturnType<typeof useProductsState>["setSortBy"];
  productSearch: ReturnType<typeof useProductsState>["productSearch"];
  setProductSearch: ReturnType<typeof useProductsState>["setProductSearch"];
  productPagination: ReturnType<typeof useProductsState>["productPagination"];
  isLoadingMoreProducts: ReturnType<typeof useProductsState>["isLoadingMoreProducts"];
  productsLoaderRef: ReturnType<typeof useProductsState>["productsLoaderRef"];
  resetProductsFeed: ReturnType<typeof useProductsFeed>["resetProductsFeed"];
  hasMoreProducts: ReturnType<typeof useProductsFeed>["hasMoreProducts"];
  handleArchive: ReturnType<typeof useProductAdminActions>["handleArchive"];
  handleDelete: ReturnType<typeof useProductAdminActions>["handleDelete"];
  items: ReturnType<typeof useProductsView>["items"];
  categoryMap: ReturnType<typeof useProductsView>["categoryMap"];
  hasProductSearch: ReturnType<typeof useProductsView>["hasProductSearch"];
  getDisplayPrice: ReturnType<typeof useProductsView>["getDisplayPrice"];
  getBestSupplier: ReturnType<typeof useProductsView>["getBestSupplier"];
  getMainImage: ReturnType<typeof useProductsView>["getMainImage"];
  hasSocialMainImage: ReturnType<typeof useProductsView>["hasSocialMainImage"];
  getSalesCount: ReturnType<typeof useProductsView>["getSalesCount"];
  sortedProducts: ReturnType<typeof useProductsView>["sortedProducts"];
  visibleProducts: ReturnType<typeof useProductsView>["visibleProducts"];
  emptyProductsMessage: ReturnType<typeof useProductsView>["emptyProductsMessage"];
  handleStartEdit: ReturnType<typeof useProductEdit>["handleStartEdit"];
  handleRowClick: ReturnType<typeof useProductEdit>["handleRowClick"];
  handleCreateOrderFromProduct: ReturnType<typeof useProductEdit>["handleCreateOrderFromProduct"];
};

export function ProductsListCard({ viewMode, setViewMode, archiveView, setArchiveView, isMobile, sortBy, setSortBy, productSearch, setProductSearch, productPagination, isLoadingMoreProducts, productsLoaderRef, resetProductsFeed, hasMoreProducts, handleArchive, handleDelete, items, categoryMap, hasProductSearch, getDisplayPrice, getBestSupplier, getMainImage, hasSocialMainImage, getSalesCount, sortedProducts, visibleProducts, emptyProductsMessage, handleStartEdit, handleRowClick, handleCreateOrderFromProduct }: ProductsListCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>
            Lista proizvoda (
            {hasProductSearch ? `${sortedProducts.length} od ${productPagination.total}` : productPagination.total || items.length}
            )
          </CardTitle>
          <p className="text-sm text-slate-500">
            {viewMode === "list"
              ? "Klikni na red da otvoris pregled proizvoda."
              : "Klikni na karticu da otvoris pregled proizvoda."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-3">
          <div className="flex flex-col gap-2 md:w-auto md:flex-row md:items-center md:gap-2">
            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  resetProductsFeed();
                }}
                placeholder="Pretrazi proizvode"
                className="pl-9"
                aria-label="Pretraga proizvoda"
              />
            </div>
            <Select
              value={sortBy}
              onValueChange={(value) => {
                setSortBy(value as SortOption);
                resetProductsFeed();
              }}
            >
              <SelectTrigger className="md:w-56 text-slate-100" aria-label="Sortiranje proizvoda">
                <SelectValue className="text-slate-100 data-placeholder:text-slate-400" placeholder="Sortiraj" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_desc">Najnovije</SelectItem>
                <SelectItem value="price_desc">Cena (vise prvo)</SelectItem>
                <SelectItem value="price_asc">Cena (manje prvo)</SelectItem>
                <SelectItem value="sales_desc">Najvise prodaja</SelectItem>
                <SelectItem value="profit_desc">Najveci profit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
            <Button
              type="button"
              variant={archiveView === "active" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-3"
              onClick={() => setArchiveView("active")}
            >
              Aktivni
            </Button>
            <Button
              type="button"
              variant={archiveView === "archived" ? "default" : "ghost"}
              size="sm"
              className="rounded-full px-3"
              onClick={() => setArchiveView("archived")}
            >
              Arhiva
            </Button>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1 md:flex">
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
      </CardHeader>
      <CardContent className="pb-6">
        {sortedProducts.length === 0 ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
            {emptyProductsMessage}
          </div>
        ) : viewMode === "list" && !isMobile ? (
          <div className="space-y-2">
            {visibleProducts.map((product) => {
              const mainImage = getMainImage(product);
              const productCategories = (product.categoryIds ?? [])
                .map((id) => categoryMap.get(id))
                .filter(Boolean) as Category[];
              const isVariantProduct = (product.variants ?? []).length > 0;
              const hasSocialImage = hasSocialMainImage(product);
              const hasFacebookTarget = Boolean(product.publishMarketplace || product.publishFbProfile);
              const hasSocialTargets = Boolean(product.publishIg || hasFacebookTarget);
              const salesCount = getSalesCount(product);
              const bestSupplier = getBestSupplier(product);
              const isArchived = Boolean(product.archivedAt);
              return (
                <div
                  key={product._id}
                  className="group cursor-pointer rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-blue-200 hover:shadow-md"
                  onClick={() => handleRowClick(product._id)}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="relative h-16 w-16 overflow-hidden rounded-md bg-slate-100">
                      {mainImage?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={mainImage.url} alt={product.kpName ?? product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase text-slate-400">
                          Bez slike
                        </div>
                      )}
                      {isVariantProduct ? (
                        <span className="absolute left-1 top-1 inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                          <Layers className="h-3 w-3" />
                          Tipski
                        </span>
                      ) : null}
                      {hasSocialImage ? (
                        <span className="absolute right-1 top-1 inline-flex items-center gap-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[10px] font-semibold text-slate-800 shadow">
                          <Share2 className="h-3 w-3 text-blue-600" />
                          Social
                        </span>
                      ) : null}
                      {hasSocialTargets ? (
                        <div className="absolute bottom-1 right-1 flex gap-1">
                          {product.publishIg ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                              <Instagram className="h-3 w-3" />
                              IG
                            </span>
                          ) : null}
                          {hasFacebookTarget ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow">
                              <Facebook className="h-3 w-3" />
                              FB
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">{product.kpName ?? product.name}</p>
                        <ArrowUpRight className="h-4 w-4 text-slate-400" />
                      </div>
                      {productCategories.length ? (
                        <div className="flex flex-wrap gap-1">
                          {productCategories.slice(0, 3).map((category) => (
                            <span
                              key={category._id}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                            >
                              <Tag className="h-3 w-3 text-slate-500" />
                              {category.name}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/90 px-2.5 py-1 text-xs font-semibold text-white shadow">
                          {getDisplayPrice(product)}
                        </span>
                        {bestSupplier ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow ring-1 ring-emerald-100">
                            {formatCurrency(bestSupplier.price, "EUR")}
                            {bestSupplier.supplierName ? (
                              <span className="text-[10px] font-medium text-emerald-700/90">- {bestSupplier.supplierName}</span>
                            ) : null}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Prodato: {salesCount}
                        </span>
                        {isArchived ? <Badge variant="yellow">Arhiva</Badge> : null}
                        {isVariantProduct ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 shadow ring-1 ring-slate-200">
                            <Layers className="h-3.5 w-3.5" />
                            Tipovi
                          </span>
                        ) : null}
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
                        {hasFacebookTarget ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white shadow">
                            <Facebook className="h-3.5 w-3.5" />
                            FB
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleStartEdit(product);
                        }}
                      >
                        Izmeni
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleArchive(product, !isArchived);
                        }}
                      >
                        {isArchived ? "Vrati" : "Arhiviraj"}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDelete(product._id);
                        }}
                      >
                        Obrisi trajno
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleProducts.map((product) => {
              const mainImage = getMainImage(product);
              const productCategories = (product.categoryIds ?? [])
                .map((id) => categoryMap.get(id))
                .filter(Boolean) as Category[];
              const isVariantProduct = (product.variants ?? []).length > 0;
              const hasSocialImage = hasSocialMainImage(product);
              const hasFacebookTarget = Boolean(product.publishMarketplace || product.publishFbProfile);
              const salesCount = getSalesCount(product);
              const bestSupplier = getBestSupplier(product);
              const isArchived = Boolean(product.archivedAt);
              return (
                <div
                  key={product._id}
                  role="button"
                  tabIndex={0}
                  className="group relative aspect-square cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
                  onClick={() => handleRowClick(product._id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleRowClick(product._id);
                    }
                  }}
                >
                  <button
                    type="button"
                    className="absolute left-1/2 top-1/2 z-30 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg opacity-0 transition group-hover:opacity-100 group-hover:shadow-xl group-focus-within:opacity-100 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCreateOrderFromProduct(product);
                    }}
                  >
                    <ShoppingBag className="h-4 w-4 text-slate-800" />
                    Nova narudzbina
                  </button>
                  {mainImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={mainImage.url}
                      alt={product.kpName ?? product.name}
                      className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.01] group-hover:blur-[1px]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Bez slike
                    </div>
                  )}
                  <div className="absolute inset-0 z-0 bg-black/35" />
                  <div className="absolute right-2 top-2 z-20 flex flex-col items-end gap-2">
                    <span className="inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-slate-900 shadow">
                      {getDisplayPrice(product)}
                    </span>
                    {bestSupplier ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 shadow">
                        {formatCurrency(bestSupplier.price, "EUR")} {bestSupplier.supplierName ? `(${bestSupplier.supplierName})` : ""}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                      <ShoppingBag className="h-4 w-4" />
                      Prodato: {salesCount}
                    </span>
                    {hasSocialImage ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow">
                        <Share2 className="h-4 w-4 text-blue-600" />
                        Social
                      </span>
                    ) : null}
                  </div>
                  {isVariantProduct || isArchived ? (
                    <div className="absolute left-2 top-2 z-20 flex flex-col gap-2">
                      {isVariantProduct ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/85 px-3 py-1 text-sm font-bold text-white shadow-lg">
                          <Layers className="h-5 w-5" />
                          Tipski
                        </span>
                      ) : null}
                      {isArchived ? (
                        <Badge variant="yellow" className="shadow">
                          Arhiva
                        </Badge>
                      ) : null}
                    </div>
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
                    {hasFacebookTarget ? (
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-[0_0_16px_rgba(37,99,235,0.5)] ring-1 ring-white/25 backdrop-blur-[1.5px]">
                        <Facebook className="h-5 w-5 drop-shadow-[0_0_8px_rgba(59,130,246,0.55)]" />
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent px-3 pr-16 pb-6 pt-10 text-left">
                    {productCategories.length > 0 ? (
                      <div className="mb-1 flex flex-wrap gap-1 text-[11px] font-semibold text-slate-200 -translate-y-6">
                        {productCategories.slice(0, 2).map((category) => (
                          <span key={category._id} className="rounded-full bg-white/20 px-2 py-0.5 backdrop-blur">
                            {category.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-start gap-2 -translate-y-6">
                      <p className="w-full wrap-break-word text-sm font-semibold leading-snug text-white">{product.kpName ?? product.name}</p>
                      <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-white/80" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {sortedProducts.length > 0 ? (
          <div ref={productsLoaderRef} className="flex justify-center">
            <LoadingDots show={isLoadingMoreProducts && hasMoreProducts} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
