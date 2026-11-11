"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { ArrowLeft, Share2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailState } from "../_hooks/useProductDetailState";

type DetailToolbarProps = {
  router: ReturnType<typeof useProductDetailState>["router"];
  productId: ReturnType<typeof useProductDetailState>["productId"];
  handleBack: ReturnType<typeof useProductDetailState>["handleBack"];
  product: ProductWithUrls;
  setShareOpen: ReturnType<typeof useProductDetailState>["setShareOpen"];
};

export function DetailToolbar({ router, productId, handleBack, product, setShareOpen }: DetailToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="ghost" className="gap-2" onClick={handleBack}>
        <ArrowLeft className="h-4 w-4" />
        Nazad na listu
      </Button>
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => router.push(`/narudzbine?productId=${encodeURIComponent(product._id)}`)}
      >
        <ShoppingBag className="h-4 w-4" />
        Nova narudzbina
      </Button>
      <Button variant="outline" className="gap-2" onClick={() => setShareOpen(true)}>
        <Share2 className="h-4 w-4" />
        Podeli
      </Button>
      <Badge variant="blue">ID: {product._id}</Badge>
      <Badge variant="green">Azurirano: {formatDate(product.updatedAt)}</Badge>
    </div>
  );
}
