"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { Category, InboxImage, Product, ProductListResponse, ProductStats, Supplier } from "@/types/order";
import { readListState } from "@/lib/listState";
import { useAuth } from "@/lib/auth-client";
import { readProductsViewPref, sortOptions, PRODUCTS_PAGE_SIZE, generateId, type DraftImage, type DraftCategoryIcon, type DraftAdImage, type SortOption, type InboxImageStatus, type InboxViewFilter, type LightboxItem } from "../_lib/productHelpers";

export function useProductsState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = useMemo(() => searchParams?.toString() ?? "", [searchParams]);
  const searchQuery = useMemo(() => searchParams?.get("q") ?? "", [searchParamsString, searchParams]);
  const { token, user } = useAuth();
  const sessionToken = token as string;
  const isKodMajstor = user?.username === "kodmajstora";
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const editingProductId = editingProduct?._id ?? null;
  const [images, setImages] = useState<DraftImage[]>([]);
  const [variantImages, setVariantImages] = useState<Record<string, DraftImage[]>>({});
  const [adImage, setAdImage] = useState<DraftAdImage | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [isAdDragActive, setIsAdDragActive] = useState(false);
  const [isInboxDragActive, setIsInboxDragActive] = useState(false);
  // Povratak sa detalja: sačuvana lista (strane, sort, arhiva, skrol) se čita u prvom renderu, a ne u efektu,
  // pa radi i uz StrictMode dvostruki mount u dev-u (isti obrazac kao useOrdersFeed). Snimak se briše u feed hooku.
  const [restore] = useState(() => {
    const key = `listState:${pathname}${searchParamsString ? `?${searchParamsString}` : ""}`;
    const stored = readListState<Product, ProductListResponse["pagination"]>(key);
    const storedSearch = typeof stored?.extra?.search === "string" ? stored.extra.search : "";
    const usable = stored && storedSearch === searchQuery && (stored.pagination?.pageSize ?? PRODUCTS_PAGE_SIZE) === PRODUCTS_PAGE_SIZE;
    if (!usable) return { key, restored: null };
    const sort = stored.extra?.sortBy;
    const archive = stored.extra?.archiveView;
    return {
      key,
      restored: {
        items: stored.items ?? [],
        page: stored.page ?? 1,
        pagination: stored.pagination,
        scrollY: typeof stored.scrollY === "number" ? stored.scrollY : null,
        sortBy: typeof sort === "string" && sortOptions.includes(sort as SortOption) ? (sort as SortOption) : "created_desc",
        archiveView: archive === "archived" ? ("archived" as const) : ("active" as const),
      },
    };
  });
  const restored = restore.restored;
  const [viewMode, setViewMode] = useState<"list" | "grid">(readProductsViewPref);
  const [archiveView, setArchiveView] = useState<"active" | "archived">(restored?.archiveView ?? "active");
  const [isMobile, setIsMobile] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>(restored?.sortBy ?? "created_desc");
  const [productSearch, setProductSearch] = useState(searchQuery);
  const [productPage, setProductPage] = useState(restored?.page ?? 1);
  const [productFeed, setProductFeed] = useState<Product[]>(restored?.items ?? []);
  const [productPagination, setProductPagination] = useState<ProductListResponse["pagination"]>(restored?.pagination ?? {
    page: 1,
    pageSize: PRODUCTS_PAGE_SIZE,
    total: 0,
    totalPages: 1,
  });
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [hasSeededCategories, setHasSeededCategories] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [hasSeededSuppliers, setHasSeededSuppliers] = useState(false);
  const [isUploadingInboxImages, setIsUploadingInboxImages] = useState(false);
  const [inboxView, setInboxView] = useState<InboxViewFilter>("withPurchasePrice");
  const [inboxContextMenu, setInboxContextMenu] = useState<{ x: number; y: number; width: number; imageId: string } | null>(null);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showUtilityPanels, setShowUtilityPanels] = useState(false);
  const variantUploadInputsRef = useRef<Record<string, HTMLInputElement | null>>({});
  const productUploadInputRef = useRef<HTMLInputElement | null>(null);
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const inboxUploadInputRef = useRef<HTMLInputElement | null>(null);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);
  const dialogScrollRef = useRef<HTMLDivElement | null>(null);
  const modalSnapshotRef = useRef<string>("");
  const wasModalOpenRef = useRef(false);
  const productsLoaderRef = useRef<HTMLDivElement | null>(null);
  const loadMoreProductsTimerRef = useRef<number | null>(null);
  const scrollYRef = useRef(0);
  const skipUrlSyncRef = useRef(Boolean(restored));
  const skipInitialResetRef = useRef(Boolean(restored));
  const didRestoreRef = useRef(true);
  const listStateRef = useRef<{
    feed: Product[];
    page: number;
    pagination: ProductListResponse["pagination"];
    search: string;
    sortBy: SortOption;
    archiveView: "active" | "archived";
    viewMode: "list" | "grid";
  }>({
    feed: [],
    page: 1,
    pagination: { page: 1, pageSize: PRODUCTS_PAGE_SIZE, total: 0, totalPages: 1 },
    search: "",
    sortBy: "created_desc",
    archiveView: "active",
    viewMode: "grid",
  });
  const [pendingScrollY, setPendingScrollY] = useState<number | null>(restored?.scrollY ?? null);
  const listStateKey = useMemo(() => {
    const suffix = searchParamsString ? `?${searchParamsString}` : "";
    return `listState:${pathname}${suffix}`;
  }, [pathname, searchParamsString]);
  const fileInputId = useMemo(() => `product-images-${generateId()}`, []);
  const adUploadInputId = useMemo(() => `ad-image-${generateId()}`, []);
  const hiddenFileInputStyle = useMemo<CSSProperties>(
    () => ({ position: "fixed", top: -9999, left: -9999, width: 1, height: 1, opacity: 0 }),
    [],
  );
  const productList = useConvexQuery<ProductListResponse>("products:listPaginated", {
    token: sessionToken,
    search: productSearch.trim() || undefined,
    page: productPage,
    pageSize: PRODUCTS_PAGE_SIZE,
    sortBy,
    archived: archiveView,
  });
  const productStats = useConvexQuery<ProductStats[]>("products:stats", { token: sessionToken });
  const createProduct = useConvexMutation("products:create");
  const updateProduct = useConvexMutation("products:update");
  const removeProduct = useConvexMutation<{ id: string; token: string }>("products:remove");
  const setProductArchived = useConvexMutation<{ id: string; token: string; archived: boolean }>("products:setArchived");
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const inboxImages = useConvexQuery<InboxImage[]>("inboxImages:list", { token: sessionToken });
  const createCategory = useConvexMutation<
    {
      token: string;
      name: string;
      icon?: { storageId: string; fileName?: string; contentType?: string };
    },
    string
  >("categories:create");
  const removeCategory = useConvexMutation<{ token: string; id: string; force?: boolean }, { removed: boolean; productCount: number }>(
    "categories:remove",
  );
  const ensureDefaultCategories = useConvexMutation<{ token: string }, { created: number }>("categories:ensureDefaults");
  const createSupplier = useConvexMutation<{ token: string; name: string }, string>("suppliers:create");
  const removeSupplier = useConvexMutation<{ token: string; id: string }>("suppliers:remove");
  const ensureDefaultSuppliers = useConvexMutation<{ token: string }, { created: number }>("suppliers:ensureDefaults");
  const addInboxImage = useConvexMutation<{
    token: string;
    storageId: string;
    fileName?: string;
    contentType?: string;
    uploadedAt?: number;
    hasPurchasePrice?: boolean;
    status?: InboxImageStatus;
  }>("inboxImages:add");
  const updateInboxImage = useConvexMutation<{ token: string; id: string; status: InboxImageStatus }>("inboxImages:update");
  const deleteInboxImage = useConvexMutation<{ token: string; id: string }>("inboxImages:remove");
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");

  return { restore, router, pathname, searchParams, searchQuery, sessionToken, isKodMajstor, isModalOpen, setIsModalOpen, exitConfirmOpen, setExitConfirmOpen, editingProduct, setEditingProduct, editingProductId, images, setImages, variantImages, setVariantImages, adImage, setAdImage, imageLightbox, setImageLightbox, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isDraggingFiles, setIsDraggingFiles, isAdDragActive, setIsAdDragActive, isInboxDragActive, setIsInboxDragActive, viewMode, setViewMode, archiveView, setArchiveView, isMobile, setIsMobile, sortBy, setSortBy, productSearch, setProductSearch, productPage, setProductPage, productFeed, setProductFeed, productPagination, setProductPagination, isLoadingMoreProducts, setIsLoadingMoreProducts, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isCreatingCategory, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, hasSeededCategories, setHasSeededCategories, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, hasSeededSuppliers, setHasSeededSuppliers, isUploadingInboxImages, setIsUploadingInboxImages, inboxView, setInboxView, inboxContextMenu, setInboxContextMenu, showSupplierForm, setShowSupplierForm, showUtilityPanels, setShowUtilityPanels, variantUploadInputsRef, productUploadInputRef, adImageInputRef, inboxUploadInputRef, categoryIconInputRef, categoryDropdownRef, dialogScrollRef, modalSnapshotRef, wasModalOpenRef, productsLoaderRef, loadMoreProductsTimerRef, scrollYRef, skipUrlSyncRef, skipInitialResetRef, didRestoreRef, listStateRef, pendingScrollY, setPendingScrollY, listStateKey, fileInputId, adUploadInputId, hiddenFileInputStyle, productList, productStats, createProduct, updateProduct, removeProduct, setProductArchived, categories, suppliers, inboxImages, createCategory, removeCategory, ensureDefaultCategories, createSupplier, removeSupplier, ensureDefaultSuppliers, addInboxImage, updateInboxImage, deleteInboxImage, generateUploadUrl };
}
