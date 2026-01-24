import type { OrderScope } from "./order";

export interface RestockRequest {
  _id: string;
  userId?: string;
  scope: OrderScope;
  name: string;
  phone: string;
  productId?: string;
  productTitle: string;
  variantLabel?: string;
  createdAt: number;
}
