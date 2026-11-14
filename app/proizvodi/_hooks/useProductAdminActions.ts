"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import type { Product } from "@/types/order";
import type { useProductFormSubmit } from "./useProductFormSubmit";
import type { useProductsFeed } from "./useProductsFeed";
import type { useProductsState } from "./useProductsState";

type UseProductAdminActionsParams = {
  sessionToken: ReturnType<typeof useProductsState>["sessionToken"];
  editingProduct: ReturnType<typeof useProductsState>["editingProduct"];
  newSupplierName: ReturnType<typeof useProductsState>["newSupplierName"];
  setNewSupplierName: ReturnType<typeof useProductsState>["setNewSupplierName"];
  isCreatingSupplier: ReturnType<typeof useProductsState>["isCreatingSupplier"];
  setIsCreatingSupplier: ReturnType<typeof useProductsState>["setIsCreatingSupplier"];
  removeProduct: ReturnType<typeof useProductsState>["removeProduct"];
  setProductArchived: ReturnType<typeof useProductsState>["setProductArchived"];
  createSupplier: ReturnType<typeof useProductsState>["createSupplier"];
  removeSupplier: ReturnType<typeof useProductsState>["removeSupplier"];
  resetProductsFeed: ReturnType<typeof useProductsFeed>["resetProductsFeed"];
  closeModal: ReturnType<typeof useProductFormSubmit>["closeModal"];
};

export function useProductAdminActions({ sessionToken, editingProduct, newSupplierName, setNewSupplierName, isCreatingSupplier, setIsCreatingSupplier, removeProduct, setProductArchived, createSupplier, removeSupplier, resetProductsFeed, closeModal }: UseProductAdminActionsParams) {
  const handleArchive = async (product: Product, archived: boolean) => {
    try {
      await setProductArchived({ id: product._id, token: sessionToken, archived });
      toast.success(archived ? "Proizvod je arhiviran." : "Proizvod je vracen iz arhive.");
      resetProductsFeed();
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Azuriranje arhive nije uspelo.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeProduct({ id, token: sessionToken });
      toast.success("Proizvod je trajno obrisan.");
      if (editingProduct?._id === id) {
        closeModal();
      }
      resetProductsFeed();
      return true;
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje nije uspelo.");
      return false;
    }
  };

  const handleCreateSupplierEntry = async () => {
    const name = newSupplierName.trim();
    if (!name) {
      toast.error("Unesi naziv dobavljaca.");
      return;
    }
    if (isCreatingSupplier) return;
    setIsCreatingSupplier(true);
    try {
      await createSupplier({ token: sessionToken, name });
      setNewSupplierName("");
      toast.success("Dobavljac je dodat.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Nije moguce dodati dobavljaca.");
    } finally {
      setIsCreatingSupplier(false);
    }
  };

  const handleRemoveSupplierEntry = async (id: string, usage?: { products?: number; orders?: number }) => {
    const productsUsing = usage?.products ?? 0;
    const ordersUsing = usage?.orders ?? 0;
    if (productsUsing > 0 || ordersUsing > 0) {
      toast.error("Dobavljac je vezan za proizvode ili narudzbine.");
      return;
    }
    // Potvrdu traži ConfirmDialog u panelu Dobavljači (pre poziva).
    try {
      await removeSupplier({ token: sessionToken, id });
      toast.success("Dobavljac je obrisan.");
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Brisanje dobavljaca nije uspelo.");
    }
  };


  return { handleArchive, handleDelete, handleCreateSupplierEntry, handleRemoveSupplierEntry };
}
