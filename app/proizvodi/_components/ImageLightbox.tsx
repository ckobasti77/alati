"use client";

import { useState } from "react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Lightbox } from "@/components/ui/lightbox";
import type { useProductImages } from "../_hooks/useProductImages";
import type { useProductMediaInbox } from "../_hooks/useProductMediaInbox";
import type { useProductsState } from "../_hooks/useProductsState";

type ImageLightboxProps = {
  imageLightbox: ReturnType<typeof useProductsState>["imageLightbox"];
  handleDeleteInboxImage: ReturnType<typeof useProductMediaInbox>["handleDeleteInboxImage"];
  handleDownloadInboxImage: ReturnType<typeof useProductMediaInbox>["handleDownloadInboxImage"];
  handleStepLightbox: ReturnType<typeof useProductImages>["handleStepLightbox"];
  handleCloseLightbox: ReturnType<typeof useProductImages>["handleCloseLightbox"];
};

const overlayButton = "bg-white/15 text-white hover:bg-white/25";

/**
 * Pregled slike na listi proizvoda: isti `Lightbox` kao na detalju. Slike iz prijemnog sandučeta imaju
 * Preuzmi i Obriši; brisanje traži potvrdu u samom pregledu (dijalog bi bio ispod sloja pregleda).
 */
export function ImageLightbox({ imageLightbox, handleDeleteInboxImage, handleDownloadInboxImage, handleStepLightbox, handleCloseLightbox }: ImageLightboxProps) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const item = imageLightbox?.items[imageLightbox.index];
  // Potvrda važi samo za sliku na kojoj je tražena (posle listanja se poništava).
  const confirming = Boolean(confirmId && item?.deleteId === confirmId);

  return (
    <Lightbox
      open={Boolean(imageLightbox)}
      items={imageLightbox?.items ?? []}
      index={imageLightbox?.index ?? 0}
      onClose={() => {
        setConfirmId(null);
        handleCloseLightbox();
      }}
      onStep={handleStepLightbox}
      actions={
        <>
          {item?.downloadUrl ? (
            <IconButton aria-label="Preuzmi sliku" size="lg" className={overlayButton} onClick={() => void handleDownloadInboxImage(item.downloadUrl, item.downloadName)}>
              <Download />
            </IconButton>
          ) : null}
          {item?.deleteId ? (
            <IconButton aria-label="Obriši sliku" size="lg" className={overlayButton} onClick={() => setConfirmId(item.deleteId ?? null)}>
              <Trash2 />
            </IconButton>
          ) : null}
        </>
      }
      footer={
        confirming && item?.deleteId ? (
          <div role="alertdialog" aria-label="Potvrda brisanja" className="flex w-full max-w-sm flex-col gap-3 rounded-2xl bg-raised p-4 text-text shadow-lg ring-1 ring-border">
            <p className="text-sm font-medium">Obrisati ovu sliku iz prijemnog sandučeta? Ovo ne može da se vrati.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" onClick={() => setConfirmId(null)} disabled={deleting}>
                Otkaži
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting}
                onClick={async () => {
                  const id = item.deleteId;
                  if (!id) return;
                  setDeleting(true);
                  try {
                    await handleDeleteInboxImage(id);
                  } finally {
                    setDeleting(false);
                    setConfirmId(null);
                  }
                }}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Obriši
              </Button>
            </div>
          </div>
        ) : null
      }
    />
  );
}
