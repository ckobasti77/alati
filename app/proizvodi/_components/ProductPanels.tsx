"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { useState } from "react";
import { CloudUpload, Download, Images, Loader2, Plus, Trash2, MoreVertical } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { useProductAdminActions } from "../_hooks/useProductAdminActions";
import type { useProductMediaInbox } from "../_hooks/useProductMediaInbox";
import type { useProductsState } from "../_hooks/useProductsState";
import type { useProductsView } from "../_hooks/useProductsView";

type ProductPanelsProps = {
  newSupplierName: ReturnType<typeof useProductsState>["newSupplierName"];
  setNewSupplierName: ReturnType<typeof useProductsState>["setNewSupplierName"];
  isCreatingSupplier: ReturnType<typeof useProductsState>["isCreatingSupplier"];
  isUploadingInboxImages: ReturnType<typeof useProductsState>["isUploadingInboxImages"];
  inboxView: ReturnType<typeof useProductsState>["inboxView"];
  setInboxView: ReturnType<typeof useProductsState>["setInboxView"];
  openPanel: "dobavljaci" | "slike" | null;
  setOpenPanel: (panel: "dobavljaci" | "slike" | null) => void;
  inboxUploadInputRef: ReturnType<typeof useProductsState>["inboxUploadInputRef"];
  suppliers: ReturnType<typeof useProductsState>["suppliers"];
  inboxImages: ReturnType<typeof useProductsState>["inboxImages"];
  handleCreateSupplierEntry: ReturnType<typeof useProductAdminActions>["handleCreateSupplierEntry"];
  handleRemoveSupplierEntry: ReturnType<typeof useProductAdminActions>["handleRemoveSupplierEntry"];
  inboxWithPriceCount: ReturnType<typeof useProductsView>["inboxWithPriceCount"];
  inboxWithoutPriceCount: ReturnType<typeof useProductsView>["inboxWithoutPriceCount"];
  inboxSkipCount: ReturnType<typeof useProductsView>["inboxSkipCount"];
  inboxList: ReturnType<typeof useProductsView>["inboxList"];
  supplierCount: ReturnType<typeof useProductsView>["supplierCount"];
  inboxTotalCount: ReturnType<typeof useProductsView>["inboxTotalCount"];
  inboxEmptyMessage: ReturnType<typeof useProductsView>["inboxEmptyMessage"];
  handleInboxFilesSelected: ReturnType<typeof useProductMediaInbox>["handleInboxFilesSelected"];
  handleDeleteInboxImage: ReturnType<typeof useProductMediaInbox>["handleDeleteInboxImage"];
  handleOpenInboxPreview: ReturnType<typeof useProductMediaInbox>["handleOpenInboxPreview"];
  handleInboxContextMenu: ReturnType<typeof useProductMediaInbox>["handleInboxContextMenu"];
  handleDownloadInboxImage: ReturnType<typeof useProductMediaInbox>["handleDownloadInboxImage"];
};

export function ProductPanels({ newSupplierName, setNewSupplierName, isCreatingSupplier, isUploadingInboxImages, inboxView, setInboxView, openPanel, setOpenPanel, inboxUploadInputRef, suppliers, inboxImages, handleCreateSupplierEntry, handleRemoveSupplierEntry, inboxWithPriceCount, inboxWithoutPriceCount, inboxSkipCount, inboxList, supplierCount, inboxTotalCount, inboxEmptyMessage, handleInboxFilesSelected, handleDeleteInboxImage, handleOpenInboxPreview, handleInboxContextMenu, handleDownloadInboxImage }: ProductPanelsProps) {
  // Brisanje dobavljača traži potvrdu (umesto window.confirm).
  const [supplierToDelete, setSupplierToDelete] = useState<{ id: string; name: string; usage?: { products?: number; orders?: number } } | null>(null);
  const inboxFilters = [
    { value: "withPurchasePrice" as const, label: `Sa nabavnom${inboxWithPriceCount ? ` (${inboxWithPriceCount})` : ""}` },
    { value: "withoutPurchasePrice" as const, label: `Bez nabavne${inboxWithoutPriceCount ? ` (${inboxWithoutPriceCount})` : ""}` },
    { value: "skip" as const, label: `Ne ubacivati${inboxSkipCount ? ` (${inboxSkipCount})` : ""}` },
  ];
  return (
    <>
      <Sheet
        open={openPanel === "dobavljaci"}
        onOpenChange={(open) => setOpenPanel(open ? "dobavljaci" : null)}
        title={`Dobavljači${supplierCount ? ` (${supplierCount})` : ""}`}
        description="Dodaj ili obriši dobavljače. Vezani za proizvode se ne mogu obrisati."
        desktopWidth="md"
      >
        <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        value={newSupplierName}
                        onChange={(event) => setNewSupplierName(event.target.value)}
                        placeholder="npr. Petrit"
                      />
                      <Button
                        type="button"
                        onClick={handleCreateSupplierEntry}
                        disabled={isCreatingSupplier || !newSupplierName.trim()}
                        className="gap-2"
                      >
                        {isCreatingSupplier ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Dodaj
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {suppliers === undefined ? (
                        <p className="text-sm text-text-muted">Učitavanje dobavljača...</p>
                      ) : suppliers.length === 0 ? (
                        <p className="text-sm text-text-muted">Nema dobavljača. Dodaj Petrit i Menad za početak.</p>
                      ) : (
                        suppliers.map((supplier) => {
                          const usageProducts = supplier.usage?.products ?? 0;
                          const usageOrders = supplier.usage?.orders ?? 0;
                          const isLocked = usageProducts > 0 || usageOrders > 0;
                          return (
                            <div
                              key={supplier._id}
                              className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 shadow-sm"
                            >
                              <div>
                                <p className="text-sm font-semibold text-text">{supplier.name}</p>
                                <p className="text-xs text-text-muted">
                                  Proizvodi: {usageProducts} | Narudžbine: {usageOrders}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {isLocked ? <Badge variant="secondary">Vezan</Badge> : null}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={isLocked}
                                  onClick={() => setSupplierToDelete({ id: supplier._id, name: supplier.name, usage: supplier.usage })}
                                >
                                  Obriši
                                </Button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
        </div>
      </Sheet>
      <Sheet
        open={openPanel === "slike"}
        onOpenChange={(open) => setOpenPanel(open ? "slike" : null)}
        title={`Slike za ubacivanje${inboxTotalCount ? ` (${inboxTotalCount})` : ""}`}
        description="Privremeni inbox za slike proizvoda koji tek treba da se dodaju."
        size="full"
        desktopWidth="xl"
      >
        <div className="space-y-3">
          <SegmentedControl ariaLabel="Slike za ubacivanje" fullWidth columns={3} value={inboxView} onChange={setInboxView} options={inboxFilters} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm text-text-muted">
                        Dodaj više slika, pregledaj ih u punoj veličini i obriši kada ih povežeš sa proizvodom. Trenutno gledaš{" "}
                        {inboxView === "withPurchasePrice"
                          ? "slike sa nabavnom cenom."
                          : inboxView === "withoutPurchasePrice"
                            ? "slike bez nabavne cene."
                            : "slike označene da se ne ubacuju."}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={inboxUploadInputRef}
                          type="file"
                          aria-label="Dodaj slike za ubacivanje"
                          accept="image/*"
                          multiple
                          className="sr-only"
                          onChange={handleInboxFilesSelected}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={() => inboxUploadInputRef.current?.click()}
                          disabled={isUploadingInboxImages}
                        >
                          {isUploadingInboxImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
                          Dodaj slike
                        </Button>
                      </div>
                    </div>
                    {inboxImages === undefined ? (
                      <p className="text-sm text-text-muted">Učitavanje slika...</p>
                    ) : inboxList.length === 0 ? (
                      <p className="text-sm text-text-muted">{inboxEmptyMessage}</p>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {inboxList.map((image, index) => {
                          const safeUrl = image.url ?? "";
                          return (
                            <div
                              key={image._id}
                              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2 shadow-sm"
                              onContextMenu={(event) => handleInboxContextMenu(event, image._id)}
                            >
                              <button
                                type="button"
                                className="absolute right-2 top-2 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-text shadow transition hover:bg-surface md:hidden"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleInboxContextMenu(event, image._id);
                                }}
                                aria-label="Opcije slike"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={safeUrl}
                                alt={image.fileName ?? "Inbox slika"}
                                className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                              />
                              <div
                                className="absolute inset-0 flex cursor-pointer flex-col justify-between bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity focus:opacity-100 focus-within:opacity-100 group-hover:opacity-100"
                                role="button"
                                tabIndex={0}
                                aria-label="Otvori pregled slike"
                                onClick={() => handleOpenInboxPreview(index)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    handleOpenInboxPreview(index);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-end gap-1 p-2">
                                  {safeUrl ? (
                                    <button
                                      type="button"
                                      className="inline-flex items-center justify-center rounded-full bg-surface/95 p-1 text-text shadow hover:bg-surface"
                                      title="Preuzmi"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        void handleDownloadInboxImage(safeUrl, image.fileName);
                                      }}
                                      onKeyDown={(event) => event.stopPropagation()}
                                    >
                                      <Download className="h-4 w-4" />
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full bg-surface/95 p-1 text-danger shadow hover:bg-surface"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleDeleteInboxImage(image._id);
                                    }}
                                    onKeyDown={(event) => event.stopPropagation()}
                                    title="Obriši"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                                <div className="flex items-center justify-center gap-2 pb-3 text-sm font-semibold text-white drop-shadow">
                                  <Images className="h-5 w-5" />
                                  <span>Klik za pregled</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
        </div>
      </Sheet>
      <ConfirmDialog
        open={supplierToDelete !== null}
        onOpenChange={(open) => !open && setSupplierToDelete(null)}
        tone="danger"
        title="Obrisati dobavljača?"
        description={supplierToDelete ? `${supplierToDelete.name} će biti trajno obrisan.` : undefined}
        confirmLabel="Obriši"
        onConfirm={async () => {
          if (!supplierToDelete) return;
          await handleRemoveSupplierEntry(supplierToDelete.id, supplierToDelete.usage);
          setSupplierToDelete(null);
        }}
      />
    </>
  );
}
