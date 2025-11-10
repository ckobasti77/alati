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
}

export interface Product {
  _id: string;
  name: string;
  nabavnaCena: number;
  prodajnaCena: number;
  variants?: ProductVariant[];
  opis?: string;
  images?: ProductImage[];
  createdAt: number;
  updatedAt: number;
}

export interface Sale {
  _id: string;
  productId?: string;
  variantId?: string;
  variantLabel?: string;
  title: string;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
  napomena?: string;
  buyerName?: string;
  kreiranoAt: number;
}

export interface SaleListResponse {
  items: Sale[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface SalesSummary {
  brojProdaja: number;
  ukupnoProdajno: number;
  ukupnoNabavno: number;
  profit: number;
}
