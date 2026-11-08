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
            className="fixed z-50 min-w-[190px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg shadow-slate-400/30"
            style={{ top: inboxContextMenu.y, left: inboxContextMenu.x }}
            role="menu"
          >
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => handleMoveInboxImage(inboxContextMenu.imageId, "withoutPurchasePrice")}
            >
              <Images className="h-4 w-4 text-slate-500" />
              Prebaci u &quot;Bez nabavne&quot;
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
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
