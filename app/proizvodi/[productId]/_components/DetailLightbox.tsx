"use client";

import { Lightbox } from "@/components/ui/lightbox";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";

type DetailLightboxProps = {
  imageLightbox: ReturnType<typeof useProductDetailState>["imageLightbox"];
  handleCloseLightbox: ReturnType<typeof useProductGalleryManager>["handleCloseLightbox"];
  handleStepLightbox: ReturnType<typeof useProductGalleryManager>["handleStepLightbox"];
  /** Unutar otvorenog Sheet-a: bez portala, da ostane u njegovom fokus trap-u i sloju. */
  inline?: boolean;
};

/** Pregled slike na detalju proizvoda (zajednički `Lightbox`, isti kao na listi). */
export function DetailLightbox({ imageLightbox, handleCloseLightbox, handleStepLightbox, inline = false }: DetailLightboxProps) {
  return (
    <Lightbox
      open={Boolean(imageLightbox)}
      items={imageLightbox?.items ?? []}
      index={imageLightbox?.index ?? 0}
      onClose={handleCloseLightbox}
      onStep={handleStepLightbox}
      inline={inline}
    />
  );
}
