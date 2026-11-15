"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import type { useProductDetailState } from "./useProductDetailState";

type UseProductDetailShareParams = {
  product: ReturnType<typeof useProductDetailState>["product"];
  setShareOpen: ReturnType<typeof useProductDetailState>["setShareOpen"];
};

export function useProductDetailShare({ product, setShareOpen }: UseProductDetailShareParams) {
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const resolveShareUrl = () => (typeof window !== "undefined" ? window.location.href : "");

  const handleCopyShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success("Link kopiran.");
      setShareOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Kopiranje nije uspelo.");
    }
  };

  const handleShareLink = async () => {
    const shareUrl = resolveShareUrl();
    if (!shareUrl) {
      toast.error("Link nije dostupan.");
      return;
    }
    if (!canShare || typeof navigator === "undefined") {
      toast.error("Share nije podržan.");
      return;
    }
    setShareOpen(false);
    try {
      await navigator.share({
        title: product?.kpName ?? product?.name ?? "Proizvod",
        url: shareUrl,
      });
    } catch (error) {
      if ((error as Error)?.name === "AbortError") return;
      console.error(error);
      toast.error("Sharovanje nije uspelo.");
    }
  };


  return { canShare, handleCopyShareLink, handleShareLink };
}
