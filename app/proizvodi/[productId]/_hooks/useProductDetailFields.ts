"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { toast } from "sonner";
import type { SocialPlatform } from "../../_lib/productHelpers";
import type { useProductDetailState } from "./useProductDetailState";
import type { useProductDetailUpdate } from "./useProductDetailUpdate";

type UseProductDetailFieldsParams = {
  sessionToken: ReturnType<typeof useProductDetailState>["sessionToken"];
  isKodMajstor: ReturnType<typeof useProductDetailState>["isKodMajstor"];
  productRef: ReturnType<typeof useProductDetailState>["productRef"];
  setPublishing: ReturnType<typeof useProductDetailState>["setPublishing"];
  applyUpdate: ReturnType<typeof useProductDetailUpdate>["applyUpdate"];
};

export function useProductDetailFields({ sessionToken, isKodMajstor, productRef, setPublishing, applyUpdate }: UseProductDetailFieldsParams) {
  const publishNow = async (platform: SocialPlatform) => {
    if (!isKodMajstor) {
      toast.error("Objavljivanje je dostupno samo sa glavnog profila.");
      return;
    }
    if (!sessionToken) {
      toast.error("Nedostaje token za objavu. Prijavi se ponovo.");
      return;
    }
    const latestProduct = productRef.current;
    if (!latestProduct) {
      toast.error("Proizvod nije ucitan.");
      return;
    }
    try {
      setPublishing(platform);
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productId: latestProduct._id,
          token: sessionToken,
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.error) {
        throw new Error(result?.error || "Objava nije uspela.");
      }
      toast.success(
        platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.",
      );
      const publishField: "publishFb" | "publishIg" = platform === "facebook" ? "publishFb" : "publishIg";
      if (!latestProduct[publishField]) {
        try {
          await applyUpdate((current) => ({ ...current, [publishField]: true }));
        } catch (error) {
          console.error(error);
          toast.error("Objava je poslata, ali cuvanje oznake nije uspelo.");
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error?.message ?? "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };


  return { publishNow };
}
