"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { ChangeEvent } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import { toast } from "sonner";
import type { Category } from "@/types/order";
import type { useProductFormState } from "./useProductFormState";
import type { useProductsState } from "./useProductsState";

type UseProductCategoriesParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  setImageLightbox: ReturnType<typeof useProductsState>["setImageLightbox"];
  setCategorySearch: ReturnType<typeof useProductsState>["setCategorySearch"];
  setCategoryMenuOpen: ReturnType<typeof useProductsState>["setCategoryMenuOpen"];
  setIsAddingCategory: ReturnType<typeof useProductsState>["setIsAddingCategory"];
  newCategoryName: ReturnType<typeof useProductsState>["newCategoryName"];
  setNewCategoryName: ReturnType<typeof useProductsState>["setNewCategoryName"];
  newCategoryIcon: ReturnType<typeof useProductsState>["newCategoryIcon"];
  setNewCategoryIcon: ReturnType<typeof useProductsState>["setNewCategoryIcon"];
  setIsCreatingCategory: ReturnType<typeof useProductsState>["setIsCreatingCategory"];
  categoryToDelete: ReturnType<typeof useProductsState>["categoryToDelete"];
  setCategoryToDelete: ReturnType<typeof useProductsState>["setCategoryToDelete"];
  setIsDeletingCategory: ReturnType<typeof useProductsState>["setIsDeletingCategory"];
  isUploadingCategoryIcon: ReturnType<typeof useProductsState>["isUploadingCategoryIcon"];
  setIsUploadingCategoryIcon: ReturnType<typeof useProductsState>["setIsUploadingCategoryIcon"];
  createCategory: ReturnType<typeof useProductsState>["createCategory"];
  removeCategory: ReturnType<typeof useProductsState>["removeCategory"];
  generateUploadUrl: ReturnType<typeof useProductsState>["generateUploadUrl"];
  form: ReturnType<typeof useProductFormState>["form"];
};

export function useProductCategories({ sessionToken, setImageLightbox, setCategorySearch, setCategoryMenuOpen, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, setNewCategoryIcon, setIsCreatingCategory, categoryToDelete, setCategoryToDelete, setIsDeletingCategory, isUploadingCategoryIcon, setIsUploadingCategoryIcon, createCategory, removeCategory, generateUploadUrl, form }: UseProductCategoriesParams) {
  const resetNewCategoryState = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    if (newCategoryIcon?.previewUrl) {
      URL.revokeObjectURL(newCategoryIcon.previewUrl);
    }
    setNewCategoryIcon(null);
    setIsUploadingCategoryIcon(false);
    setImageLightbox(null);
  };

  const handleSelectCategory = (categoryId: string) => {
    const current = (form.getValues("categoryIds") ?? []) as string[];
    if (current.includes(categoryId)) {
      setCategorySearch("");
      setCategoryMenuOpen(false);
      return;
    }
    const next = [...current, categoryId];
    form.setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
    setCategorySearch("");
    setCategoryMenuOpen(false);
  };

  const handleRemoveCategory = (categoryId: string) => {
    const current = (form.getValues("categoryIds") ?? []) as string[];
    const next = current.filter((id) => id !== categoryId);
    form.setValue("categoryIds", next, { shouldDirty: true, shouldValidate: true });
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
      handleSelectCategory(id);
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
      const current = (form.getValues("categoryIds") ?? []) as string[];
      if (current.includes(categoryToDelete._id)) {
        form.setValue(
          "categoryIds",
          current.filter((id) => id !== categoryToDelete._id),
          { shouldDirty: true, shouldValidate: true },
        );
      }
      toast.success("Kategorija obrisana.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje kategorije nije uspelo.");
    } finally {
      setIsDeletingCategory(false);
      setCategoryToDelete(null);
    }
  };

  return { resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory };
}
