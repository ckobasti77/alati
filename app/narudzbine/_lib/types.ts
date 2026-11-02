import type { Order, OrderListResponse, OrderStage, Product, ProductVariant } from "@/types/order";

export const slanjeModes = ["Posta", "Aks", "Bex"] as const;
export const slanjeSwitchModes = ["Aks", "Posta"] as const;
export const shippingModes = ["Posta", "Aks", "Bex"] as const;
export type ShippingMode = (typeof shippingModes)[number];
export const deleteConfirmPhrase = "potvrdjujem da brisem";

export const emptyOrderListTotals: OrderListResponse["totals"] = {
  nabavno: 0,
  transport: 0,
  prodajno: 0,
  profit: 0,
  povrat: 0,
};

export type OrderItemDraft = {
  id: string;
  product: Product;
  variant?: ProductVariant;
  supplierId?: string;
  kolicina: number;
  nabavnaCena: number;
  prodajnaCena: number;
  manualProdajna?: boolean;
  manualNabavna?: boolean;
  variantLabel?: string;
  title: string;
};

export type QuickEditField = "address" | "contact" | "profit" | "transport";

export type QuickEditState =
  | {
      field: "address";
      order: Order;
      address: string;
    }
  | {
      field: "contact";
      order: Order;
      customerName: string;
      phone: string;
    }
  | {
      field: "profit";
      order: Order;
      myProfitPercent: string;
    }
  | {
      field: "transport";
      order: Order;
      transportCost: string;
    };

export type ShipmentStageModalState = {
  order: Order;
  nextStage: OrderStage;
};
