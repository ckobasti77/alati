// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import type { Product, ProductAdImage, ProductImage, ProductVariant } from "@/types/order";

export type ProductWithUrls = Omit<Product, "images" | "variants" | "adImage"> & {
  images?: (ProductImage & { url?: string | null })[];
  variants?: (ProductVariant & { images?: (ProductImage & { url?: string | null })[] })[];
  adImage?: (ProductAdImage & { url?: string | null }) | null;
};

export type GalleryItem = {
  id: string;
  storageId: string;
  url: string;
  alt: string;
  label: string;
  fileName?: string | null;
  isMain: boolean;
  publishFb: boolean;
  publishIg: boolean;
  origin: { type: "product" } | { type: "variant"; variantId: string };
};

export type LightboxItem = {
  id?: string;
  url: string;
  alt?: string;
};

export const isVariantOrigin = (
  origin: GalleryItem["origin"],
): origin is Extract<GalleryItem["origin"], { type: "variant"; variantId: string }> => origin.type === "variant";
