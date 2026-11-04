"use client";

// Doslovno izvuceno iz app/narudzbine/[orderId]/page.tsx (refaktor bez promene ponasanja).
import { useState } from "react";
import { toast } from "sonner";
import type { useOrderDetailData } from "./useOrderDetailData";

type UseOrderDetailDeleteParams = {
  handleBack: () => void;
  orderScope: "default" | "kalaba";
  sessionToken: ReturnType<typeof useOrderDetailData>["sessionToken"];
  deleteOrder: ReturnType<typeof useOrderDetailData>["deleteOrder"];
  order: ReturnType<typeof useOrderDetailData>["order"];
};

export function useOrderDetailDelete({ handleBack, orderScope, sessionToken, deleteOrder, order }: UseOrderDetailDeleteParams) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const openDeleteModal = () => {
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteConfirmText("");
  };

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (open) {
      setDeleteModalOpen(true);
    } else {
      closeDeleteModal();
    }
  };

  const handleDeleteOrder = async () => {
    if (!order || isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder({ id: order._id, token: sessionToken, scope: orderScope });
      toast.success("Narudzbina je obrisana.");
      closeDeleteModal();
      handleBack();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    } finally {
      setIsDeletingOrder(false);
    }
  };


  return { deleteModalOpen, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, openDeleteModal, closeDeleteModal, handleDeleteModalOpenChange, handleDeleteOrder };
}
