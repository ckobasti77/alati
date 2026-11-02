"use client";

import { ArrowRight, Loader2, Package, Plus, Search, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Money } from "@/components/ui/money";
import { Sheet } from "@/components/ui/sheet";
import { StageBadge } from "@/components/ui/stage-badge";
import { useAuth } from "@/lib/auth-client";
import { useConvexQuery } from "@/lib/convex";
import { MORE_LINKS, NEW_ORDER_HREF, PRIMARY_NAV, visibleLinks } from "@/lib/nav";
import { matchesAllTokens, toSearchTokens } from "@/lib/search";
import { cn } from "@/lib/utils";
import type { Order, OrderListResponse, Product, ProductListResponse } from "@/types/order";

const MIN_QUERY = 2;
const RESULT_LIMIT = 6;
const DEBOUNCE_MS = 250;
const NO_ORDERS: Order[] = [];
const NO_PRODUCTS: Product[] = [];

type PaletteItem =
  | { kind: "command"; id: string; label: string; href: string; icon: React.ComponentType<{ className?: string }> }
  | { kind: "order"; id: string; href: string; order: Order }
  | { kind: "product"; id: string; href: string; product: Product };

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

/** Poslednji stigli rezultat query-ja dok je pretraga aktivna (useQuery vraća undefined dok čeka nove argumente). */
function useStickyResult<T>(value: T | undefined, active: boolean): T | undefined {
  const [last, setLast] = useState<T | undefined>(value);
  if (active && value !== undefined && value !== last) setLast(value);
  else if (!active && last !== undefined) setLast(undefined);
  return active ? (value ?? last) : undefined;
}

const productImage = (product: Product) =>
  product.images?.find((image) => image.isMain)?.url ?? product.images?.[0]?.url ?? product.adImage?.url ?? null;

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { token, user } = useAuth();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Svako zatvaranje (Esc, izbor, Ctrl+K) vraća paletu na prazno.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }
  const term = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const searching = open && Boolean(token) && term.length >= MIN_QUERY;

  const ordersResult = useConvexQuery<OrderListResponse>(
    "orders:list",
    searching ? { token, search: term, page: 1, pageSize: RESULT_LIMIT, scope: "default" } : "skip",
  );
  const productsResult = useConvexQuery<ProductListResponse>(
    "products:listPaginated",
    searching ? { token, search: term, page: 1, pageSize: RESULT_LIMIT } : "skip",
  );

  // Dok novi rezultati stižu, zadrži prethodne (bez treptanja liste).
  const orders = useStickyResult(ordersResult, searching)?.items ?? NO_ORDERS;
  const products = useStickyResult(productsResult, searching)?.items ?? NO_PRODUCTS;
  const loading = searching && (!ordersResult || !productsResult || term !== query.trim());

  const isAdmin = user?.role === "admin";
  const items = useMemo<PaletteItem[]>(() => {
    const allCommands: PaletteItem[] = [
      { kind: "command", id: "nova", label: "Nova narudžbina", href: NEW_ORDER_HREF, icon: Plus },
      ...visibleLinks([...PRIMARY_NAV, ...MORE_LINKS.slice(2)], isAdmin).map((link) => ({
        kind: "command" as const,
        id: link.href,
        label: link.label,
        href: link.href,
        icon: link.icon,
      })),
    ];
    const tokens = toSearchTokens(query);
    const commands = allCommands.filter((item) => item.kind === "command" && matchesAllTokens(item.label, tokens));
    return [
      ...commands,
      ...orders.map((order) => ({ kind: "order" as const, id: order._id, href: `/narudzbine/${order._id}`, order })),
      ...products.map((product) => ({ kind: "product" as const, id: product._id, href: `/proizvodi/${product._id}`, product })),
    ];
  }, [orders, products, query, isAdmin]);

  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const close = (next: boolean) => onOpenChange(next);

  const go = (item: PaletteItem | undefined) => {
    if (!item) return;
    close(false);
    router.push(item.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") setActiveIndex(Math.max(0, Math.min(safeIndex + 1, items.length - 1)));
    else if (event.key === "ArrowUp") setActiveIndex(Math.max(safeIndex - 1, 0));
    else if (event.key === "Enter") {
      const item = items[safeIndex];
      // Rezultati prethodnog upita su još na ekranu dok novi stižu: ne otvaraj pogrešnu stavku.
      if (loading && item?.kind !== "command") return event.preventDefault();
      go(item);
    } else return;
    event.preventDefault();
  };

  useEffect(() => {
    document.getElementById(`${listId}-${safeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [safeIndex, listId]);

  const sections: { title: string; kind: PaletteItem["kind"] }[] = [
    { title: "Prečice", kind: "command" },
    { title: "Narudžbine", kind: "order" },
    { title: "Proizvodi", kind: "product" },
  ];

  return (
    <Sheet
      open={open}
      onOpenChange={close}
      title="Pretraga"
      size="full"
      placement="top"
      desktopWidth="lg"
      hideHeader
      bodyClassName="p-0"
      onOpenAutoFocus={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-surface pt-[max(0.25rem,env(safe-area-inset-top))] pr-2 pl-4 md:pt-1">
        <Search className="size-5 shrink-0 text-text-muted" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          type="search"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          placeholder="Kupac, telefon, proizvod…"
          aria-label="Pretraga narudžbina i proizvoda"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={items.length ? `${listId}-${safeIndex}` : undefined}
          className="h-14 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-muted md:h-12 [&::-webkit-search-cancel-button]:appearance-none"
        />
        {loading ? <Loader2 className="size-4 shrink-0 animate-spin text-text-muted" aria-label="Pretražujem" /> : null}
        <kbd className="hidden rounded-md px-1.5 py-0.5 text-[11px] text-text-muted ring-1 ring-border md:inline">Esc</kbd>
        <IconButton aria-label="Zatvori pretragu" size="lg" className="md:hidden" onClick={() => close(false)}>
          <X />
        </IconButton>
      </div>

      <div id={listId} role="listbox" aria-label="Rezultati" className="px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {sections.map((section) => {
          const sectionItems = items
            .map((item, index) => ({ item, index }))
            .filter(({ item }) => item.kind === section.kind);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.kind} role="group" aria-label={section.title} className="pb-2">
              <p className="px-2 pt-2 pb-1 text-xs font-medium text-text-muted">{section.title}</p>
              {sectionItems.map(({ item, index }) => (
                <PaletteRow
                  key={`${item.kind}-${item.id}`}
                  id={`${listId}-${index}`}
                  item={item}
                  active={index === safeIndex}
                  onHover={() => setActiveIndex(index)}
                  onSelect={() => go(item)}
                />
              ))}
            </div>
          );
        })}
        {searching && !loading && orders.length === 0 && products.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-text-muted">Nema narudžbina ni proizvoda za „{term}“.</p>
        ) : null}
        {!searching && query.trim().length > 0 && query.trim().length < MIN_QUERY ? (
          <p className="px-3 py-4 text-center text-sm text-text-muted">Ukucaj bar {MIN_QUERY} znaka za pretragu.</p>
        ) : null}
      </div>
    </Sheet>
  );
}

function PaletteRow({
  id,
  item,
  active,
  onHover,
  onSelect,
}: {
  id: string;
  item: PaletteItem;
  active: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={active}
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        "flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5",
        active ? "bg-surface-2" : "hover:bg-surface-2",
      )}
    >
      {item.kind === "command" ? (
        <>
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted">
            <item.icon className="size-4" />
          </span>
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          <ArrowRight className="size-4 shrink-0 text-text-muted" aria-hidden />
        </>
      ) : item.kind === "order" ? (
        <>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.order.items?.[0]?.title ?? item.order.title}</p>
            <p className="truncate text-[13px] text-text-muted">
              {[item.order.customerName, item.order.phone].filter(Boolean).join(" · ")}
            </p>
          </div>
          <StageBadge stage={item.order.stage} showIcon={false} />
        </>
      ) : (
        <>
          <span className="relative size-9 shrink-0 overflow-hidden rounded-lg bg-surface-2">
            {productImage(item.product) ? (
              <Image src={productImage(item.product)!} alt="" fill sizes="36px" className="object-cover" unoptimized />
            ) : (
              <Package className="absolute inset-0 m-auto size-4 text-text-muted" aria-hidden />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.product.kpName ?? item.product.name}</span>
          <Money value={item.product.prodajnaCena} className="text-sm text-text-muted" />
        </>
      )}
    </div>
  );
}
