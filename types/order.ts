export interface ProductImage {
  storageId: string;
  isMain: boolean;
  fileName?: string;
  contentType?: string;
  publishFb?: boolean;
  publishIg?: boolean;
  url?: string | null;
  uploadedAt?: number;
}

export interface ProductAdImage {
  storageId: string;
  fileName?: string;
  contentType?: string;
  url?: string | null;
  uploadedAt?: number;
}

export interface ProductVariant {
  id: string;
  label: string;
  nabavnaCena: number;
  nabavnaCenaIsReal?: boolean;
  prodajnaCena: number;
  isDefault: boolean;
  opis?: string;
  images?: ProductImage[];
}

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  iconStorageId?: string;
  iconUrl?: string | null;
  iconFileName?: string;
  iconContentType?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Product {
  _id: string;
  userId: string;
  name: string;
  kpName?: string;
  fbName?: string;
  nabavnaCena: number;
  nabavnaCenaIsReal?: boolean;
  prodajnaCena: number;
  variants?: ProductVariant[];
  categoryIds?: string[];
  categories?: Category[];
  opis?: string;
  opisKp?: string;
  opisFbInsta?: string;
  publishKp?: boolean;
  publishFb?: boolean;
  publishIg?: boolean;
  publishFbProfile?: boolean;
  publishMarketplace?: boolean;
  pickupAvailable?: boolean;
  images?: ProductImage[];
  adImage?: ProductAdImage;
  createdAt: number;
  updatedAt: number;
}

export interface ProductStats {
  productId: string;
  salesCount: number;
  revenue: number;
  profit: number;
}

export type OrderStage = "poruceno" | "poslato" | "stiglo" | "legle_pare";
export type TransportMode = "Kol" | "Joe" | "Posta" | "Bex" | "Aks";

export interface Order {
  _id: string;
  userId: string;
  stage: OrderStage;
  productId?: string;
  variantId?: string;
  variantLabel?: string;
  title: string;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
  napomena?: string;
  transportCost?: number;
  transportMode?: TransportMode;
  customerName: string;
  address: string;
  phone: string;
  myProfitPercent?: number;
  pickup?: boolean;
  kreiranoAt: number;
}

export interface OrderListResponse {
  items: Order[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface OrderWithProduct extends Order {
  product?: Product;
}

export interface OrdersSummary {
  brojNarudzbina: number;
  ukupnoProdajno: number;
  ukupnoNabavno: number;
  profit: number;
  mojProfit: number;
}
