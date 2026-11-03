"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useState } from "react";
import { toast } from "sonner";
import { useConvexMutation } from "@/lib/convex";
import type { Order } from "@/types/order";
import { deleteConfirmPhrase } from "../_lib/types";
import { requiresDeleteConfirmation } from "../_lib/helpers";

type UseOrderDeleteParams = {
  orderScope: "default" | "kalaba";
  sessionToken: string;
  resetOrdersFeed: () => void;
  editingOrder: Order | null;
  resetOrderForm: (options?: { closeModal?: boolean }) => void;
};

export function useOrderDelete({ orderScope, sessionToken, resetOrdersFeed, editingOrder, resetOrderForm }: UseOrderDeleteParams) {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Order | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const deleteOrder = useConvexMutation<{ id: string; token: string; scope: "default" | "kalaba" }>("orders:remove");
  const deleteRequiresConfirmation = deleteCandidate ? requiresDeleteConfirmation(deleteCandidate.stage) : false;
  const isDeletePhraseValid = deleteConfirmText.trim().toLowerCase() === deleteConfirmPhrase;
  const isDeleteDisabled = !deleteCandidate || isDeletingOrder || (deleteRequiresConfirmation && !isDeletePhraseValid);
  const openDeleteModal = (order: Order) => {
    setDeleteCandidate(order);
    setDeleteConfirmText("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setDeleteCandidate(null);
    setDeleteConfirmText("");
  };

  const handleDeleteModalOpenChange = (open: boolean) => {
    if (open) {
      setDeleteModalOpen(true);
    } else {
      closeDeleteModal();
    }
  };

  const handleDelete = async (id: string) => {
    if (isDeletingOrder) return;
    setIsDeletingOrder(true);
    try {
      await deleteOrder({ id, token: sessionToken, scope: orderScope });
      toast.success("Narudzbina je obrisana.");
      resetOrdersFeed();
      if (editingOrder?._id === id) {
        resetOrderForm({ closeModal: true });
      }
      closeDeleteModal();
    } catch (error) {
      console.error(error);
      toast.error("Brisanje nije uspelo.");
    } finally {
      setIsDeletingOrder(false);
    }
  };


  return { deleteModalOpen, deleteCandidate, deleteConfirmText, setDeleteConfirmText, isDeletingOrder, deleteRequiresConfirmation, isDeleteDisabled, openDeleteModal, closeDeleteModal, handleDeleteModalOpenChange, handleDelete };
}

