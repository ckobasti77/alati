"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { Check, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/format";
import { InlineField } from "./LegacyFields";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailFields } from "../_hooks/useProductDetailFields";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";

type VariantsCardProps = {
  product: ProductWithUrls;
  isAddingVariant: ReturnType<typeof useProductDetailState>["isAddingVariant"];
  isSavingVariant: ReturnType<typeof useProductDetailState>["isSavingVariant"];
  newVariantLabel: ReturnType<typeof useProductDetailState>["newVariantLabel"];
  setNewVariantLabel: ReturnType<typeof useProductDetailState>["setNewVariantLabel"];
  newVariantOpis: ReturnType<typeof useProductDetailState>["newVariantOpis"];
  setNewVariantOpis: ReturnType<typeof useProductDetailState>["setNewVariantOpis"];
  newVariantNabavna: ReturnType<typeof useProductDetailState>["newVariantNabavna"];
  setNewVariantNabavna: ReturnType<typeof useProductDetailState>["setNewVariantNabavna"];
  newVariantProdajna: ReturnType<typeof useProductDetailState>["newVariantProdajna"];
  setNewVariantProdajna: ReturnType<typeof useProductDetailState>["setNewVariantProdajna"];
  newVariantIsDefault: ReturnType<typeof useProductDetailState>["newVariantIsDefault"];
  setNewVariantIsDefault: ReturnType<typeof useProductDetailState>["setNewVariantIsDefault"];
  newVariantNabavnaIsReal: ReturnType<typeof useProductDetailState>["newVariantNabavnaIsReal"];
  setNewVariantNabavnaIsReal: ReturnType<typeof useProductDetailState>["setNewVariantNabavnaIsReal"];
  handleVariantFieldSave: ReturnType<typeof useProductDetailFields>["handleVariantFieldSave"];
  handleVariantPurchaseRealityToggle: ReturnType<typeof useProductDetailFields>["handleVariantPurchaseRealityToggle"];
  handleStartAddVariant: ReturnType<typeof useProductDetailFields>["handleStartAddVariant"];
  handleCancelAddVariant: ReturnType<typeof useProductDetailFields>["handleCancelAddVariant"];
  handleCreateVariant: ReturnType<typeof useProductDetailFields>["handleCreateVariant"];
  baseNabavnaIsReal: ReturnType<typeof useProductGalleryManager>["baseNabavnaIsReal"];
  hasVariants: ReturnType<typeof useProductGalleryManager>["hasVariants"];
};

export function VariantsCard({ product, isAddingVariant, isSavingVariant, newVariantLabel, setNewVariantLabel, newVariantOpis, setNewVariantOpis, newVariantNabavna, setNewVariantNabavna, newVariantProdajna, setNewVariantProdajna, newVariantIsDefault, setNewVariantIsDefault, newVariantNabavnaIsReal, setNewVariantNabavnaIsReal, handleVariantFieldSave, handleVariantPurchaseRealityToggle, handleStartAddVariant, handleCancelAddVariant, handleCreateVariant, baseNabavnaIsReal, hasVariants }: VariantsCardProps) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">Tipovi proizvoda</CardTitle>
          <p className="text-sm text-slate-500">
            Edit dugme otvara input sa selektovanim tekstom, copy kopira vrednost polja.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant={isAddingVariant ? "ghost" : "outline"}
          className="gap-2"
          onClick={isAddingVariant ? handleCancelAddVariant : handleStartAddVariant}
          disabled={isSavingVariant}
        >
          {isAddingVariant ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAddingVariant ? "Zatvori" : "Dodaj tip"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAddingVariant ? (
          <div className="space-y-4 rounded-lg border border-dashed border-blue-200 bg-blue-50/50 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Naziv tipa</p>
                <Input
                  value={newVariantLabel}
                  onChange={(event) => setNewVariantLabel(event.target.value)}
                  placeholder="npr. 18V bez baterije"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prodajna cena (EUR)</p>
                <Input
                  value={newVariantProdajna}
                  onChange={(event) => setNewVariantProdajna(event.target.value)}
                  placeholder="Prodajna cena"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavna cena (EUR)</p>
                <Input
                  value={newVariantNabavna}
                  onChange={(event) => setNewVariantNabavna(event.target.value)}
                  placeholder="Nabavna cena"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Opis tipa (opciono)
                </p>
                <Textarea
                  autoResize
                  rows={3}
                  value={newVariantOpis}
                  onChange={(event) => setNewVariantOpis(event.target.value)}
                  placeholder="Kratak opis koji razlikuje ovaj tip."
                />
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                <div className="flex flex-col">
                  <span>{newVariantNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                  <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                </div>
                <input
                  type="checkbox"
                  checked={newVariantNabavnaIsReal}
                  onChange={(event) => setNewVariantNabavnaIsReal(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                <div className="flex flex-col">
                  <span>Postavi kao glavni tip</span>
                  <span className="text-xs font-normal text-slate-500">
                    Glavni tip se koristi za KP i kalkulacije.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={newVariantIsDefault || !hasVariants}
                  onChange={(event) => setNewVariantIsDefault(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  disabled={!hasVariants}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" className="gap-2" onClick={handleCreateVariant} disabled={isSavingVariant}>
                {isSavingVariant ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Sacuvaj tip
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={handleCancelAddVariant}
                disabled={isSavingVariant}
              >
                Odustani
              </Button>
            </div>
          </div>
        ) : null}
        {(product.variants ?? []).length === 0 ? (
          isAddingVariant ? null : (
            <p className="text-sm text-slate-600">
              Ovaj proizvod nema dodatne tipove. Dodaj prvi tip da ga pretvoris u tipski.
            </p>
          )
        ) : (
          product.variants?.map((variant) => {
            const variantNabavnaIsReal =
              variant.nabavnaCenaIsReal ?? product.nabavnaCenaIsReal ?? baseNabavnaIsReal;
            return (
              <div
                key={variant.id}
                className="rounded-lg border border-slate-200/80 bg-white/60 p-3 shadow-sm shadow-slate-100"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={variant.isDefault ? "green" : "default"}>
                      {variant.isDefault ? "Glavni tip" : "Tip"}
                    </Badge>
                    <span className="text-sm font-semibold text-slate-800">{variant.label}</span>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-slate-400">ID: {variant.id}</span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <InlineField
                    label="Naziv tipa"
                    value={variant.label}
                    onSave={(val) => handleVariantFieldSave(variant.id, "label", val)}
                  />
                  <InlineField
                    label="Prodajna cena (EUR)"
                    value={variant.prodajnaCena}
                    formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                    onSave={(val) => handleVariantFieldSave(variant.id, "prodajnaCena", val)}
                  />
                  <div className="space-y-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3">
                    <InlineField
                      label="Nabavna cena (EUR)"
                      value={variant.nabavnaCena}
                      formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                      onSave={(val) => handleVariantFieldSave(variant.id, "nabavnaCena", val)}
                    />
                    <label className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                      <span>{variantNabavnaIsReal ? "Prava nabavna" : "Procenjena nabavna"}</span>
                      <input
                        type="checkbox"
                        checked={variantNabavnaIsReal}
                        onChange={(event) => handleVariantPurchaseRealityToggle(variant.id, event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <InlineField
                      label="Opis tipa"
                      value={variant.opis ?? ""}
                      multiline
                      onSave={(val) => handleVariantFieldSave(variant.id, "opis", val)}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
