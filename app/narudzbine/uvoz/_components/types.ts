import type { BrojReconcile } from "@/lib/receiptBarcode";
import type { ReceiptExtraction } from "@/lib/receiptExtract";

export type RowStatus = "queued" | "processing" | "ready" | "failed";

export type ReceiptRow = {
  key: string;
  file: File;
  previewUrl: string;
  status: RowStatus;
  error?: string;
  extracted?: ReceiptExtraction;
  barcode?: string | null;
  broj?: BrojReconcile;
  matchInit?: boolean;
  selectedOrderId?: string;
  brojDraft?: string;
  accepted: boolean;
  writeResult?: { status: "updated" | "skipped"; reason?: string };
};
