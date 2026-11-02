"use client";

import { LayoutGrid, Rows3 } from "lucide-react";
import { SegmentedControl } from "@/components/ui/segmented-control";

export type OrdersView = "tabela" | "kartice";

export type ViewToggleProps = {
  value: OrdersView;
  onChange: (value: OrdersView) => void;
  /** Prikaži i tekst pored ikonica. */
  showLabels?: boolean;
  className?: string;
};

export function ViewToggle({ value, onChange, showLabels = false, className }: ViewToggleProps) {
  return (
    <SegmentedControl
      ariaLabel="Prikaz"
      value={value}
      onChange={onChange}
      className={className}
      options={[
        { value: "tabela", icon: Rows3, ariaLabel: "Tabela", label: showLabels ? "Tabela" : undefined },
        { value: "kartice", icon: LayoutGrid, ariaLabel: "Kartice", label: showLabels ? "Kartice" : undefined },
      ]}
    />
  );
}
