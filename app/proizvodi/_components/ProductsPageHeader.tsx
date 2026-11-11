"use client";

import { Images, Plus, Truck } from "lucide-react";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HeaderActions } from "@/components/shell/ShellProvider";

type ProductsPageHeaderProps = {
  total: number;
  supplierCount: number;
  inboxCount: number;
  onCreate: () => void;
  onOpenPanel: (panel: "dobavljaci" | "slike") => void;
};

/** Desktop: naslov + brojač, Dodaj (primarno) i ⋯. Telefon: + i ⋯ u headeru aplikacije. */
export function ProductsPageHeader({ total, supplierCount, inboxCount, onCreate, onOpenPanel }: ProductsPageHeaderProps) {
  const panelItems: ActionMenuItem[] = [
    { label: `Dobavljači${supplierCount ? ` (${supplierCount})` : ""}`, icon: Truck, onSelect: () => onOpenPanel("dobavljaci") },
    { label: `Slike za ubacivanje${inboxCount ? ` (${inboxCount})` : ""}`, icon: Images, onSelect: () => onOpenPanel("slike") },
  ];
  return (
    <>
      <HeaderActions>
        <IconButton aria-label="Dodaj proizvod" onClick={onCreate}>
          <Plus />
        </IconButton>
        <ActionMenu items={[{ label: "Dodaj proizvod", icon: Plus, onSelect: onCreate }, ...panelItems.map((item, index) => ({ ...item, separatorBefore: index === 0 }))]} label="Više akcija za proizvode" />
      </HeaderActions>
      <h1 className="sr-only md:hidden">Proizvodi</h1>
      <header className="hidden items-center justify-between gap-4 md:flex">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Proizvodi <span className="num ml-1 text-lg font-normal text-text-muted">{total}</span>
        </h1>
        <div className="flex items-center gap-2">
          <Button type="button" className="gap-2 rounded-xl" onClick={onCreate}>
            <Plus className="size-4" aria-hidden />
            Dodaj proizvod
          </Button>
          <ActionMenu items={panelItems} label="Više akcija za proizvode" />
        </div>
      </header>
    </>
  );
}
