"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQuery } from "@/lib/convex";
import type { Category, Order, ProductImage, Supplier } from "@/types/order";
import { type ProductWithUrls, type GalleryItem, type LightboxItem } from "../_lib/detailTypes";
import { type DraftCategoryIcon, type SocialPlatform } from "../../_lib/productHelpers";

export function useProductDetailState() {
  function ensureMainImage(
    list: (ProductImage & { url?: string | null })[] = [],
    preferredMainId?: string,
  ) {
    if (list.length === 0) return [];
    const next = [...list];
    const preferredIndex = preferredMainId ? next.findIndex((image) => image.storageId === preferredMainId) : -1;
    const flaggedIndex = preferredIndex === -1 ? next.findIndex((image) => image.isMain) : -1;
    const targetIndex = preferredIndex >= 0 ? preferredIndex : flaggedIndex >= 0 ? flaggedIndex : 0;
    if (targetIndex > 0) {
      const [main] = next.splice(targetIndex, 1);
      next.unshift(main);
    }
    return next.map((image, index) => ({ ...image, isMain: index === 0 }));
  }

  function normalizeProductImages(current: ProductWithUrls): ProductWithUrls {
    return {
      ...current,
      images: current.images ? ensureMainImage(current.images) : current.images,
      variants:
        current.variants?.map((variant) => ({
          ...variant,
          images: variant.images ? ensureMainImage(variant.images) : variant.images,
        })) ?? current.variants,
    };
  }

  const { token, user } = useAuth();
  const sessionToken = token as string;
  const isKodMajstor = user?.username === "kodmajstora";
  const params = useParams();
  const router = useRouter();
  const productId = params?.productId as string;
  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/proizvodi");
  }, [router]);
  const uploadInputId = useMemo(() => `product-upload-${productId}`, [productId]);
  const adUploadInputId = useMemo(() => `ad-upload-${productId}`, [productId]);
  const queryResult = useConvexQuery<ProductWithUrls | null>("products:get", { token: sessionToken, id: productId });
  const categories = useConvexQuery<Category[]>("categories:list", { token: sessionToken });
  const suppliers = useConvexQuery<Supplier[]>("suppliers:list", { token: sessionToken });
  const productOrders = useConvexQuery<Order[]>("orders:byProduct", {
    token: sessionToken,
    productId,
    scope: "default",
  });
  const updateProduct = useConvexMutation("products:update");
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
  const generateUploadUrl = useConvexMutation<{ token: string }, string>("images:generateUploadUrl");
  const [product, setProduct] = useState<ProductWithUrls | null>(null);
  const productRef = useRef<ProductWithUrls | null>(null);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [isUploadingAdImage, setIsUploadingAdImage] = useState(false);
  const [isGalleryDropActive, setIsGalleryDropActive] = useState(false);
  const [imageUploadTarget, setImageUploadTarget] = useState<"product" | string>("product");
  const [isAdDropActive, setIsAdDropActive] = useState(false);
  const [publishing, setPublishing] = useState<SocialPlatform | null>(null);
  const [isTouchDevice, setIsTouchDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(pointer: coarse)").matches;
  });
  const adImageInputRef = useRef<HTMLInputElement | null>(null);
  const [imageLightbox, setImageLightbox] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const [draggingItem, setDraggingItem] = useState<GalleryItem | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<DraftCategoryIcon | null>(null);
  const [isUploadingCategoryIcon, setIsUploadingCategoryIcon] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [reorderEditingId, setReorderEditingId] = useState<string | null>(null);
  const [reorderInputValue, setReorderInputValue] = useState("");
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [isSavingVariant, setIsSavingVariant] = useState(false);
  const [newVariantLabel, setNewVariantLabel] = useState("");
  const [newVariantOpis, setNewVariantOpis] = useState("");
  const [newVariantNabavna, setNewVariantNabavna] = useState("");
  const [newVariantProdajna, setNewVariantProdajna] = useState("");
  const [newVariantIsDefault, setNewVariantIsDefault] = useState(false);
  const [newVariantNabavnaIsReal, setNewVariantNabavnaIsReal] = useState(true);
  const supplierMap = useMemo(
    () => new Map((suppliers ?? []).map((supplier) => [supplier._id, supplier])),
    [suppliers],
  );
  const [supplierEdits, setSupplierEdits] = useState<Record<string, string>>({});
  const [showAddSupplierForm, setShowAddSupplierForm] = useState(false);
  const [newSupplierId, setNewSupplierId] = useState("");
  const [newSupplierVariantId, setNewSupplierVariantId] = useState("base");
  const [newSupplierPrice, setNewSupplierPrice] = useState("");
  const [isSavingSupplierOffer, setIsSavingSupplierOffer] = useState(false);
  const categoryIconInputRef = useRef<HTMLInputElement | null>(null);
  const categoryDropdownRef = useRef<HTMLDivElement | null>(null);

  const isLoading = queryResult === undefined;

  useEffect(() => {
    if (queryResult === undefined) return;
    const normalized = queryResult ? normalizeProductImages(queryResult) : null;
    productRef.current = normalized;
    setProduct(normalized);
  }, [queryResult]);


  return { ensureMainImage, normalizeProductImages, sessionToken, isKodMajstor, router, productId, handleBack, uploadInputId, adUploadInputId, categories, suppliers, productOrders, updateProduct, createCategory, removeCategory, generateUploadUrl, product, setProduct, productRef, isUploadingImages, setIsUploadingImages, isUploadingAdImage, setIsUploadingAdImage, isGalleryDropActive, setIsGalleryDropActive, imageUploadTarget, setImageUploadTarget, isAdDropActive, setIsAdDropActive, publishing, setPublishing, isTouchDevice, setIsTouchDevice, adImageInputRef, imageLightbox, setImageLightbox, draggingItem, setDraggingItem, dragOverId, setDragOverId, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, shareOpen, setShareOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isUploadingCategoryIcon, setIsUploadingCategoryIcon, isCreatingCategory, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, isDeletingCategory, setIsDeletingCategory, reorderEditingId, setReorderEditingId, reorderInputValue, setReorderInputValue, isAddingVariant, setIsAddingVariant, isSavingVariant, setIsSavingVariant, newVariantLabel, setNewVariantLabel, newVariantOpis, setNewVariantOpis, newVariantNabavna, setNewVariantNabavna, newVariantProdajna, setNewVariantProdajna, newVariantIsDefault, setNewVariantIsDefault, newVariantNabavnaIsReal, setNewVariantNabavnaIsReal, supplierMap, supplierEdits, setSupplierEdits, showAddSupplierForm, setShowAddSupplierForm, newSupplierId, setNewSupplierId, newSupplierVariantId, setNewSupplierVariantId, newSupplierPrice, setNewSupplierPrice, isSavingSupplierOffer, setIsSavingSupplierOffer, categoryIconInputRef, categoryDropdownRef, isLoading };
}
