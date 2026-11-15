"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LayoutGrid, List, PackageSearch, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { useListEntrance } from "@/lib/motion/useListEntrance";
import { useViewFlip } from "@/lib/motion/useViewFlip";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/order";
import { sortOptions, type SortOption } from "../../_lib/productHelpers";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import { ProductRows } from "./ProductRows";
import { ProductTable } from "./ProductTable";
import type { ProductListApi } from "./productListApi";

export const SORT_LABELS: Record<SortOption, string> = {
  created_desc: "Najnovije",
  price_desc: "Cena: više prvo",
  price_asc: "Cena: manje prvo",
  sales_desc: "Najviše prodaja",
  profit_desc: "Najveći profit",
};

const ARCHIVE_OPTIONS = [
  { value: "active" as const, label: "Aktivni" },
  { value: "archived" as const, label: "Arhiva" },
];
const VIEW_OPTIONS = [
  { value: "grid" as const, label: "Mreža", icon: LayoutGrid },
  { value: "list" as const, label: "Lista", icon: List },
];

const SEARCH_DEBOUNCE_MS = 250;

const pluralProizvod = (count: number) => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return "proizvod";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "proizvoda";
  return "proizvoda";
};

type ProductsCatalogProps = {
  products: Product[];
  api: ProductListApi;
  total: number;
  isDesktop: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loaderRef: React.RefObject<HTMLDivElement | null>;
  search: string;
  onSearch: (value: string) => void;
  sortBy: SortOption;
  onSort: (value: SortOption) => void;
  archiveView: "active" | "archived";
  onArchiveView: (value: "active" | "archived") => void;
  viewMode: "grid" | "list";
  /** Lista je vraćena iz memorije (povratak sa detalja): bez ulazne animacije. */
  restored?: boolean;
  onViewMode: (value: "grid" | "list") => void;
  onOpen: (product: Product) => void;
  onCreate: () => void;
};

/** Pretraga + filteri (Sheet na telefonu, red kontrola na desktopu), brojač, mreža/lista/tabela i beskonačni skrol. */
export function ProductsCatalog(props: ProductsCatalogProps) {
  const { products, api, total, isDesktop, isLoading, isLoadingMore, hasMore, loaderRef, search, onSearch, sortBy, onSort, archiveView, onArchiveView, viewMode, onViewMode: setViewMode, onOpen, onCreate, restored = false } = props;
  // Mreža ↔ Lista: Flip po data-flip-id (samo vidljive stavke); prvo učitavanje: stagger; nova strana: fade.
  const listRef = useRef<HTMLDivElement | null>(null);
  const captureViewFlip = useViewFlip(viewMode, listRef);
  const onViewMode = (value: "grid" | "list") => {
    captureViewFlip();
    setViewMode(value);
  };
  const productKeys = useMemo(() => products.map((product) => product._id), [products]);
  useListEntrance(listRef, productKeys, { skip: restored });
  const [draft, setDraft] = useState(search);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  // Spoljna promena pretrage (URL, restore) prepisuje polje.
  const [lastSearch, setLastSearch] = useState(search);
  if (search !== lastSearch) {
    setLastSearch(search);
    if (search.trim() !== draft.trim()) setDraft(search);
  }
  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const changeSearch = (value: string) => {
    setDraft(value);
    window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      if (value.trim() !== search.trim()) onSearch(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const activeFilters = (sortBy !== "created_desc" ? 1 : 0) + (archiveView !== "active" ? 1 : 0);
  const showTable = isDesktop && viewMode === "list";

  const searchField = (
    <div className="relative min-w-0 flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted" aria-hidden />
      <Input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label="Pretraži proizvode"
        placeholder="Pretraži proizvode"
        value={draft}
        onChange={(event) => changeSearch(event.target.value)}
        className="pr-11 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {draft ? (
        <button
          type="button"
          aria-label="Obriši pretragu"
          onClick={() => changeSearch("")}
          className="absolute top-0 right-0 inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-text-muted hover:text-text md:size-10"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );

  const sortList = (
    <div role="group" aria-label="Sortiranje" className="flex flex-col">
      {sortOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={sortBy === option}
          onClick={() => onSort(option)}
          className={cn(
            "flex min-h-12 cursor-pointer items-center justify-between rounded-xl px-3 text-left text-[15px] text-text hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-ring",
            sortBy === option && "bg-accent-soft font-medium text-accent-text",
          )}
        >
          {SORT_LABELS[option]}
          {sortBy === option ? <Check className="size-4" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );

  return (
    <section aria-labelledby="lista-proizvoda" className="flex flex-col gap-3">
      <h2 id="lista-proizvoda" className="sr-only">
        Lista proizvoda
      </h2>
      {/* Toolbar: telefon = pretraga + Filteri (sticky), desktop = sve kontrole u jednom redu. */}
      <div className="sticky top-(--header-h) z-(--z-sticky) -mx-4 flex items-center gap-2 bg-bg/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
        {searchField}
        {isDesktop ? (
          <>
            <Select value={sortBy} onValueChange={(value) => onSort(value as SortOption)}>
              <SelectTrigger aria-label="Sortiranje" className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {SORT_LABELS[option]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <SegmentedControl ariaLabel="Aktivni ili arhiva" value={archiveView} onChange={onArchiveView} options={ARCHIVE_OPTIONS} />
            <SegmentedControl ariaLabel="Prikaz" value={viewMode} onChange={onViewMode} options={VIEW_OPTIONS} />
          </>
        ) : (
          <Button type="button" variant="outline" className="relative shrink-0 gap-2 rounded-xl" onClick={() => setFiltersOpen(true)} aria-label={`Filteri${activeFilters ? `, aktivno ${activeFilters}` : ""}`}>
            <SlidersHorizontal className="size-4" aria-hidden />
            Filteri
            {activeFilters ? <span className="num inline-flex size-5 items-center justify-center rounded-full bg-accent text-xs text-accent-fg">{activeFilters}</span> : null}
          </Button>
        )}
      </div>

      <p className="text-[13px] text-text-muted">
        <span className="num font-medium text-text" aria-live="polite">{total}</span> {pluralProizvod(total)}
        {archiveView === "archived" ? " u arhivi" : ""}
        {products.length < total ? <span className="num"> · prikazano {products.length}</span> : null}
        {sortBy !== "created_desc" ? ` · ${SORT_LABELS[sortBy].toLowerCase()}` : ""}
      </p>

      {isLoading && products.length === 0 ? (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" aria-busy="true" aria-label="Učitavanje proizvoda">
          {Array.from({ length: 8 }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </ul>
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={search.trim() ? "Nema proizvoda za ovu pretragu" : archiveView === "archived" ? "Arhiva je prazna" : "Još nema proizvoda"}
          description={search.trim() ? "Probaj drugi naziv ili obriši pretragu." : undefined}
          action={
            search.trim() ? (
              <Button type="button" variant="outline" onClick={() => changeSearch("")}>
                Obriši pretragu
              </Button>
            ) : archiveView === "active" ? (
              <Button type="button" onClick={onCreate}>
                Dodaj proizvod
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div ref={listRef}>
          {showTable ? (
            <ProductTable products={products} api={api} sortBy={sortBy} onSort={onSort} onOpen={onOpen} />
          ) : viewMode === "list" ? (
            <ProductRows products={products} api={api} />
          ) : (
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} api={api} />
              ))}
              {isLoadingMore ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={`s${index}`} />) : null}
            </ul>
          )}
        </div>
      )}

      <div ref={loaderRef} className="h-px" aria-hidden />
      {!hasMore && products.length > 0 && products.length >= total ? <p className="py-4 text-center text-[13px] text-text-muted">To su svi proizvodi.</p> : null}
      {isLoadingMore && viewMode === "list" ? <p className="py-3 text-center text-[13px] text-text-muted">Učitavanje…</p> : null}

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filteri" description={`${total} ${pluralProizvod(total)}`}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text" aria-hidden>
              Prikaži
            </span>
            <SegmentedControl ariaLabel="Aktivni ili arhiva" fullWidth value={archiveView} onChange={onArchiveView} options={ARCHIVE_OPTIONS} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-text" aria-hidden>
              Prikaz
            </span>
            <SegmentedControl ariaLabel="Prikaz" fullWidth value={viewMode} onChange={onViewMode} options={VIEW_OPTIONS} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-text" aria-hidden>
              Sortiranje
            </span>
            {sortList}
          </div>
        </div>
      </Sheet>
    </section>
  );
}
