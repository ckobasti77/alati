"use client";

// Doslovno izvuceno iz app/proizvodi/page.tsx (refaktor bez promene ponasanja).
import { Images, X } from "lucide-react";
import type { useProductMediaInbox } from "../_hooks/useProductMediaInbox";
import type { useProductsState } from "../_hooks/useProductsState";

type InboxContextMenuProps = {
  inboxContextMenu: ReturnType<typeof useProductsState>["inboxContextMenu"];
  handleMoveInboxImage: ReturnType<typeof useProductMediaInbox>["handleMoveInboxImage"];
  handleCloseInboxContextMenu: ReturnType<typeof useProductMediaInbox>["handleCloseInboxContextMenu"];
};

export function InboxContextMenu({ inboxContextMenu, handleMoveInboxImage, handleCloseInboxContextMenu }: InboxContextMenuProps) {
  return (
    <>
      {inboxContextMenu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={handleCloseInboxContextMenu} />
          <div
            className="fixed z-50 min-w-[190px] overflow-hidden rounded-md border border-border bg-surface shadow-lg shadow-black/20"
            style={{ top: inboxContextMenu.y, left: inboxContextMenu.x }}
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-surface-2"
              onClick={() => handleMoveInboxImage(inboxContextMenu.imageId, "withoutPurchasePrice")}
            >
              <Images className="h-4 w-4 text-text-muted" />
              Prebaci u &quot;Bez nabavne&quot;
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
              onClick={() => handleMoveInboxImage(inboxContextMenu.imageId, "skip")}
            >
              <X className="h-4 w-4" />
              Prebaci u &quot;Ne ubacivati&quot;
            </button>
          </div>
        </>
      ) : null}

    </>
  );
}
