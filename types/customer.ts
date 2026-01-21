import type { OrderScope } from "./order";

export interface Customer {
  _id: string;
  userId?: string;
  scope?: OrderScope;
  name: string;
  phone: string;
  address: string;
  pickup?: boolean;
  createdAt: number;
  updatedAt: number;
  lastUsedAt: number;
}
