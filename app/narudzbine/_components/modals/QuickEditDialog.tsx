"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet } from "@/components/ui/sheet";
import type { useOrderRowActions } from "../../_hooks/useOrderRowActions";

type QuickEditDialogProps = {
  rowActions: ReturnType<typeof useOrderRowActions>;
};

const labelClass = "text-[13px] text-text-muted";

export function QuickEditDialog({ rowActions }: QuickEditDialogProps) {
  const { quickEdit, setQuickEdit, isQuickEditSaving, closeQuickEdit, handleQuickEditSave } = rowActions;
  // Poslednja vrednost ostaje prikazana dok traje izlazna animacija (inače sadržaj i naslov "skoče").
  const [lastShown, setLastShown] = useState(quickEdit);
  if (quickEdit && quickEdit !== lastShown) setLastShown(quickEdit);
  const view = quickEdit ?? lastShown;
  const submitOnEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleQuickEditSave();
    }
  };
  const title =
    view?.field === "contact"
      ? "Kupac i telefon"
      : view?.field === "address"
        ? "Adresa"
        : view?.field === "transport"
          ? "Transport"
          : "Profit %";
  return (
    <Sheet
      open={Boolean(quickEdit)}
      onOpenChange={(open) => {
        if (!open) closeQuickEdit();
      }}
      title={title}
      description={view?.order.title}
      size="auto"
      desktopWidth="sm"
      footer={
        <div className="flex gap-2 md:justify-end">
          <Button type="button" variant="ghost" onClick={closeQuickEdit} disabled={isQuickEditSaving}>
            Otkaži
          </Button>
          <Button
            type="button"
            className="flex-1 md:flex-none"
            onClick={() => void handleQuickEditSave()}
            disabled={isQuickEditSaving}
          >
            {isQuickEditSaving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Sačuvaj
          </Button>
        </div>
      }
    >
      {view?.field === "contact" ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-edit-name" className={labelClass}>
              Ime i prezime
            </label>
            <Input
              id="quick-edit-name"
              autoFocus
              autoComplete="name"
              enterKeyHint="next"
              value={view.customerName}
              onChange={(event) =>
                setQuickEdit((current) =>
                  current?.field === "contact" ? { ...current, customerName: event.target.value } : current,
                )
              }
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quick-edit-phone" className={labelClass}>
              Telefon
            </label>
            <Input
              id="quick-edit-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              enterKeyHint="done"
              value={view.phone}
              onKeyDown={submitOnEnter}
              onChange={(event) =>
                setQuickEdit((current) =>
                  current?.field === "contact" ? { ...current, phone: event.target.value } : current,
                )
              }
            />
          </div>
        </div>
      ) : null}
      {view?.field === "address" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-edit-address" className={labelClass}>
            Adresa
          </label>
          <Input
            id="quick-edit-address"
            autoFocus
            autoComplete="street-address"
            enterKeyHint="done"
            value={view.address}
            onKeyDown={submitOnEnter}
            onChange={(event) =>
              setQuickEdit((current) =>
                current?.field === "address" ? { ...current, address: event.target.value } : current,
              )
            }
          />
        </div>
      ) : null}
      {view?.field === "transport" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-edit-transport" className={labelClass}>
            Trošak transporta
          </label>
          <Input
            id="quick-edit-transport"
            autoFocus
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="npr. 15 ili 15,5"
            value={view.transportCost}
            onKeyDown={submitOnEnter}
            onChange={(event) =>
              setQuickEdit((current) =>
                current?.field === "transport" ? { ...current, transportCost: event.target.value } : current,
              )
            }
          />
        </div>
      ) : null}
      {view?.field === "profit" ? (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="quick-edit-profit" className={labelClass}>
            Procenat profita
          </label>
          <Input
            id="quick-edit-profit"
            autoFocus
            inputMode="decimal"
            enterKeyHint="done"
            placeholder="npr. 50"
            value={view.myProfitPercent}
            onKeyDown={submitOnEnter}
            onChange={(event) =>
              setQuickEdit((current) =>
                current?.field === "profit" ? { ...current, myProfitPercent: event.target.value } : current,
              )
            }
          />
          <p className={labelClass}>Unesi vrednost između 0 i 100.</p>
        </div>
      ) : null}
    </Sheet>
  );
}
