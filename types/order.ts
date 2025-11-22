export interface ProductImage {
  storageId: string;
  isMain: boolean;
  fileName?: string;
  contentType?: string;
  url?: string | null;
}

export interface ProductVariant {
  id: string;
  label: string;
  nabavnaCena: number;
  prodajnaCena: number;
  isDefault: boolean;
  opis?: string;
  images?: ProductImage[];
}

export interface Product {
  _id: string;
  userId: string;
  name: string;
  nabavnaCena: number;
  prodajnaCena: number;
  variants?: ProductVariant[];
  opis?: string;
  images?: ProductImage[];
  createdAt: number;
  updatedAt: number;
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
