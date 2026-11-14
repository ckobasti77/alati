import type { DraftOrder } from "@/lib/waIntake/types";

export type ProductOption = { _id: string; name: string; kpName?: string };

export type WaChat = { id: string; name: string; isGroup: boolean; lastMessageAt?: number };

export type DraftRow = {
  key: string;
  draft: DraftOrder;
  customerName: string;
  phone: string;
  address: string;
  title: string;
  productId: string; // "" = bez proizvoda iz kataloga
  nabavnaDraft: string;
  prodajnaDraft: string;
  napomena: string;
  pickup: boolean;
  accepted: boolean;
  writeResult?: { status: "inserted" | "skipped"; reason?: string };
};

export type ProductSelectOption = { id: string; label: string };
