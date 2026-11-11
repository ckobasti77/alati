"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { useEffect, type ChangeEvent, type DragEvent as ReactDragEvent } from "react";
import { toast } from "sonner";
import type { Category } from "@/types/order";
import type { useProductDetailState } from "./useProductDetailState";
import type { useProductDetailUpdate } from "./useProductDetailUpdate";

type UseProductDetailCategoriesParams = {
  sessionToken: ReturnType<typeof useProductDetailState>["sessionToken"];
  createCategory: ReturnType<typeof useProductDetailState>["createCategory"];
  removeCategory: ReturnType<typeof useProductDetailState>["removeCategory"];
  generateUploadUrl: ReturnType<typeof useProductDetailState>["generateUploadUrl"];
  setProduct: ReturnType<typeof useProductDetailState>["setProduct"];
  productRef: ReturnType<typeof useProductDetailState>["productRef"];
  setCategorySearch: ReturnType<typeof useProductDetailState>["setCategorySearch"];
  categoryMenuOpen: ReturnType<typeof useProductDetailState>["categoryMenuOpen"];
  setCategoryMenuOpen: ReturnType<typeof useProductDetailState>["setCategoryMenuOpen"];
  setIsAddingCategory: ReturnType<typeof useProductDetailState>["setIsAddingCategory"];
  newCategoryName: ReturnType<typeof useProductDetailState>["newCategoryName"];
  setNewCategoryName: ReturnType<typeof useProductDetailState>["setNewCategoryName"];
  newCategoryIcon: ReturnType<typeof useProductDetailState>["newCategoryIcon"];
  setNewCategoryIcon: ReturnType<typeof useProductDetailState>["setNewCategoryIcon"];
  isUploadingCategoryIcon: ReturnType<typeof useProductDetailState>["isUploadingCategoryIcon"];
  setIsUploadingCategoryIcon: ReturnType<typeof useProductDetailState>["setIsUploadingCategoryIcon"];
  setIsCreatingCategory: ReturnType<typeof useProductDetailState>["setIsCreatingCategory"];
  categoryToDelete: ReturnType<typeof useProductDetailState>["categoryToDelete"];
  setCategoryToDelete: ReturnType<typeof useProductDetailState>["setCategoryToDelete"];
  setIsDeletingCategory: ReturnType<typeof useProductDetailState>["setIsDeletingCategory"];
  categoryDropdownRef: ReturnType<typeof useProductDetailState>["categoryDropdownRef"];
  applyUpdate: ReturnType<typeof useProductDetailUpdate>["applyUpdate"];
};

export function useProductDetailCategories({ sessionToken, createCategory, removeCategory, generateUploadUrl, setProduct, productRef, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, isUploadingCategoryIcon, setIsUploadingCategoryIcon, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, categoryDropdownRef, applyUpdate }: UseProductDetailCategoriesParams) {
  useEffect(() => {
    if (!categoryMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const node = categoryDropdownRef.current;
      if (!node) return;
      const path = typeof event.composedPath === "function" ? event.composedPath() : undefined;
      if (path && path.includes(node)) return;
      if (node.contains(event.target as Node)) return;
      setCategoryMenuOpen(false);
      resetNewCategoryState();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [categoryMenuOpen]);

  const resetNewCategoryState = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
  };

  const handleSelectCategory = async (categoryId: string) => {
    await applyUpdate(
      (current) => {
        const existing = new Set(current.categoryIds ?? []);
        if (existing.has(categoryId)) return current;
        return { ...current, categoryIds: [...existing, categoryId] as any };
      },
      "Kategorija dodata.",
    );
    setCategoryMenuOpen(false);
    setCategorySearch("");
  };

  const handleRemoveCategory = async (categoryId: string) => {
    await applyUpdate(
      (current) => ({
        ...current,
        categoryIds: (current.categoryIds ?? []).filter((id) => id !== categoryId),
      }),
      "Kategorija uklonjena.",
    );
  };

  const handleUploadCategoryIcon = async (file: File) => {
    if (isUploadingCategoryIcon) return;
    const isImage = file.type?.startsWith("image/") || /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(file.name);
    if (!isImage) {
      toast.error("Prevuci ili izaberi fajl tipa slike za ikonicu.");
      return;
    }
    setIsUploadingCategoryIcon(true);
    try {
      const uploadUrl = await generateUploadUrl({ token: sessionToken });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Upload ikonice nije uspeo.");
      }
      const { storageId } = await response.json();
      if (newCategoryIcon?.previewUrl) {
        URL.revokeObjectURL(newCategoryIcon.previewUrl);
      }
      setNewCategoryIcon({
        storageId,
        previewUrl: URL.createObjectURL(file),
        fileName: file.name,
        contentType: file.type,
      });
      toast.success("Ikonica je spremna.");
    } catch (error) {
      console.error(error);
      toast.error("Upload ikonice nije uspeo.");
    } finally {
      setIsUploadingCategoryIcon(false);
    }
  };

  const handleCategoryIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await handleUploadCategoryIcon(file);
    }
    event.target.value = "";
  };

  const handleCategoryIconDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      await handleUploadCategoryIcon(file);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      toast.error("Upisi naziv kategorije.");
      return;
    }
    setIsCreatingCategory(true);
    try {
      const id = await createCategory({
        token: sessionToken,
        name,
        icon: newCategoryIcon
          ? {
              storageId: newCategoryIcon.storageId,
              fileName: newCategoryIcon.fileName,
              contentType: newCategoryIcon.contentType,
            }
          : undefined,
      });
      await handleSelectCategory(id);
      toast.success("Kategorija dodata.");
      resetNewCategoryState();
    } catch (error) {
      console.error(error);
      toast.error("Kreiranje kategorije nije uspelo.");
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleRequestDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeletingCategory(true);
    try {
      await removeCategory({ token: sessionToken, id: categoryToDelete._id, force: true });
      setProduct((current) => {
        if (!current) return current;
        const nextCategoryIds = (current.categoryIds ?? []).filter((id) => id !== categoryToDelete._id);
        const next = { ...current, categoryIds: nextCategoryIds };
        productRef.current = next;
        return next;
      });
      toast.success("Kategorija obrisana.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje kategorije nije uspelo.");
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };


  return { resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory, handleConfirmDeleteCategory };
}
