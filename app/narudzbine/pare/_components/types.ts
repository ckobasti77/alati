export type UploadStatus = "processing" | "done" | "failed";

export type UploadState = {
  key: string;
  name: string;
  previewUrl: string;
  status: UploadStatus;
  error?: string;
  rowCount?: number;
};

// Jedan red tabele = jedna stavka (red) sa AKS specifikacije.
export type LegleItem = {
  key: string;
  uploadKey: string;
  platilac: string;
  nalogId: string;
  extractWarning?: string;
  matchInit?: boolean;
  selectedOrderId?: string;
  accepted: boolean;
  writeResult?: { status: "updated" | "skipped"; reason?: string };
};
