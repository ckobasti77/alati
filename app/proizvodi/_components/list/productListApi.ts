import type { ActionMenuItem } from "@/components/ui/action-menu";
import type { Category, Product } from "@/types/order";

/** Sve što kartica, red i tabela čitaju o proizvodu (getteri iz useProductsView, isti brojevi kao ranije). */
export type ProductListApi = {
  getName: (product: Product) => string;
  getPrice: (product: Product) => number;
  getPurchase: (product: Product) => { price: number | undefined; supplierName?: string };
  getSold: (product: Product) => number;
  getProfit: (product: Product) => number;
  getImageUrl: (product: Product) => string | undefined;
  getCategories: (product: Product) => Category[];
  menuFor: (product: Product) => ActionMenuItem[];
};

export const productHref = (product: Product) => `/proizvodi/${product._id}`;

export const productFlags = (product: Product) => ({
  isVariant: (product.variants?.length ?? 0) > 0,
  isPickup: Boolean(product.pickupAvailable),
  isArchived: Boolean(product.archivedAt),
});

/** Oznake objave: KP, FB (Marketplace ili profil Kod Majstora), IG — isto kao stara lista. */
export const productPublishMarks = (product: Product) => [
  { key: "KP", label: "KupujemProdajem", active: Boolean(product.publishKp) },
  { key: "FB", label: "Facebook", active: Boolean(product.publishMarketplace || product.publishFbProfile) },
  { key: "IG", label: "Instagram", active: Boolean(product.publishIg) },
];
