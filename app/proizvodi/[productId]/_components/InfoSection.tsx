"use client";

// Doslovno izvuceno iz app/proizvodi/[productId]/page.tsx (refaktor bez promene ponasanja).
import { Check, Facebook, Instagram, Loader2, Plus, Tag, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";
import { parsePrice } from "../../_lib/productHelpers";
import { InlineField } from "./LegacyFields";
import type { ProductWithUrls } from "../_lib/detailTypes";
import type { useProductDetailCategories } from "../_hooks/useProductDetailCategories";
import type { useProductDetailFields } from "../_hooks/useProductDetailFields";
import type { useProductDetailMeta } from "../_hooks/useProductDetailMeta";
import type { useProductDetailState } from "../_hooks/useProductDetailState";
import type { useProductGalleryManager } from "../_hooks/useProductGalleryManager";
import type { useProductSupplierOffers } from "../_hooks/useProductSupplierOffers";

type InfoSectionProps = {
  isKodMajstor: ReturnType<typeof useProductDetailState>["isKodMajstor"];
  categories: ReturnType<typeof useProductDetailState>["categories"];
  suppliers: ReturnType<typeof useProductDetailState>["suppliers"];
  product: ProductWithUrls;
  publishing: ReturnType<typeof useProductDetailState>["publishing"];
  categorySearch: ReturnType<typeof useProductDetailState>["categorySearch"];
  setCategorySearch: ReturnType<typeof useProductDetailState>["setCategorySearch"];
  categoryMenuOpen: ReturnType<typeof useProductDetailState>["categoryMenuOpen"];
  setCategoryMenuOpen: ReturnType<typeof useProductDetailState>["setCategoryMenuOpen"];
  isAddingCategory: ReturnType<typeof useProductDetailState>["isAddingCategory"];
  setIsAddingCategory: ReturnType<typeof useProductDetailState>["setIsAddingCategory"];
  newCategoryName: ReturnType<typeof useProductDetailState>["newCategoryName"];
  setNewCategoryName: ReturnType<typeof useProductDetailState>["setNewCategoryName"];
  newCategoryIcon: ReturnType<typeof useProductDetailState>["newCategoryIcon"];
  isUploadingCategoryIcon: ReturnType<typeof useProductDetailState>["isUploadingCategoryIcon"];
  isCreatingCategory: ReturnType<typeof useProductDetailState>["isCreatingCategory"];
  supplierMap: ReturnType<typeof useProductDetailState>["supplierMap"];
  supplierEdits: ReturnType<typeof useProductDetailState>["supplierEdits"];
  showAddSupplierForm: ReturnType<typeof useProductDetailState>["showAddSupplierForm"];
  setShowAddSupplierForm: ReturnType<typeof useProductDetailState>["setShowAddSupplierForm"];
  newSupplierId: ReturnType<typeof useProductDetailState>["newSupplierId"];
  setNewSupplierId: ReturnType<typeof useProductDetailState>["setNewSupplierId"];
  newSupplierVariantId: ReturnType<typeof useProductDetailState>["newSupplierVariantId"];
  setNewSupplierVariantId: ReturnType<typeof useProductDetailState>["setNewSupplierVariantId"];
  newSupplierPrice: ReturnType<typeof useProductDetailState>["newSupplierPrice"];
  setNewSupplierPrice: ReturnType<typeof useProductDetailState>["setNewSupplierPrice"];
  isSavingSupplierOffer: ReturnType<typeof useProductDetailState>["isSavingSupplierOffer"];
  categoryIconInputRef: ReturnType<typeof useProductDetailState>["categoryIconInputRef"];
  categoryDropdownRef: ReturnType<typeof useProductDetailState>["categoryDropdownRef"];
  productCategories: ReturnType<typeof useProductDetailMeta>["productCategories"];
  filteredCategories: ReturnType<typeof useProductDetailMeta>["filteredCategories"];
  variantMap: ReturnType<typeof useProductDetailMeta>["variantMap"];
  supplierOffers: ReturnType<typeof useProductDetailMeta>["supplierOffers"];
  bestSupplierOffer: ReturnType<typeof useProductDetailMeta>["bestSupplierOffer"];
  supplierOfferKey: ReturnType<typeof useProductSupplierOffers>["supplierOfferKey"];
  handleSupplierPriceChange: ReturnType<typeof useProductSupplierOffers>["handleSupplierPriceChange"];
  handleSupplierPriceSave: ReturnType<typeof useProductSupplierOffers>["handleSupplierPriceSave"];
  handleAddSupplierOffer: ReturnType<typeof useProductSupplierOffers>["handleAddSupplierOffer"];
  handleRemoveSupplierOffer: ReturnType<typeof useProductSupplierOffers>["handleRemoveSupplierOffer"];
  resetNewCategoryState: ReturnType<typeof useProductDetailCategories>["resetNewCategoryState"];
  handleSelectCategory: ReturnType<typeof useProductDetailCategories>["handleSelectCategory"];
  handleRemoveCategory: ReturnType<typeof useProductDetailCategories>["handleRemoveCategory"];
  handleCategoryIconChange: ReturnType<typeof useProductDetailCategories>["handleCategoryIconChange"];
  handleCategoryIconDrop: ReturnType<typeof useProductDetailCategories>["handleCategoryIconDrop"];
  handleCreateCategory: ReturnType<typeof useProductDetailCategories>["handleCreateCategory"];
  handleRequestDeleteCategory: ReturnType<typeof useProductDetailCategories>["handleRequestDeleteCategory"];
  handleBaseFieldSave: ReturnType<typeof useProductDetailFields>["handleBaseFieldSave"];
  handlePublishToggle: ReturnType<typeof useProductDetailFields>["handlePublishToggle"];
  publishNow: ReturnType<typeof useProductDetailFields>["publishNow"];
  handleBasePurchaseRealityToggle: ReturnType<typeof useProductDetailFields>["handleBasePurchaseRealityToggle"];
  baseNabavnaIsReal: ReturnType<typeof useProductGalleryManager>["baseNabavnaIsReal"];
  hasVariants: ReturnType<typeof useProductGalleryManager>["hasVariants"];
};

export function InfoSection({ isKodMajstor, categories, suppliers, product, publishing, categorySearch, setCategorySearch, categoryMenuOpen, setCategoryMenuOpen, isAddingCategory, setIsAddingCategory, newCategoryName, setNewCategoryName, newCategoryIcon, isUploadingCategoryIcon, isCreatingCategory, supplierMap, supplierEdits, showAddSupplierForm, setShowAddSupplierForm, newSupplierId, setNewSupplierId, newSupplierVariantId, setNewSupplierVariantId, newSupplierPrice, setNewSupplierPrice, isSavingSupplierOffer, categoryIconInputRef, categoryDropdownRef, productCategories, filteredCategories, variantMap, supplierOffers, bestSupplierOffer, supplierOfferKey, handleSupplierPriceChange, handleSupplierPriceSave, handleAddSupplierOffer, handleRemoveSupplierOffer, resetNewCategoryState, handleSelectCategory, handleRemoveCategory, handleCategoryIconChange, handleCategoryIconDrop, handleCreateCategory, handleRequestDeleteCategory, handleBaseFieldSave, handlePublishToggle, publishNow, handleBasePurchaseRealityToggle, baseNabavnaIsReal, hasVariants }: InfoSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {product.kpName ?? product.name}
              {product.variants && product.variants.length > 0 ? (
                <Badge variant="yellow">Tipski</Badge>
              ) : (
                <Badge variant="green">Obican</Badge>
              )}
            </CardTitle>
            <p className="text-sm text-slate-500">Textualni podaci su editabilni na licu mesta.</p>
            <p className="text-xs text-slate-500">FB / Insta naziv: {product.name}</p>
            <div className="flex flex-wrap gap-2">
              {productCategories.length ? (
                productCategories.map((category) => (
                  <span
                    key={category._id}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                  >
                    <Tag className="h-3 w-3 text-slate-500" />
                    {category.name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <InlineField
              label="KP naziv (glavni)"
              value={product.kpName ?? product.name}
              onSave={(val) => handleBaseFieldSave("kpName", val)}
            />
            <InlineField label="FB / Insta naziv" value={product.name} onSave={(val) => handleBaseFieldSave("name", val)} />
            <div
              className="space-y-2"
              ref={categoryDropdownRef}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kategorije</p>
              <div className="flex flex-wrap gap-2">
                {productCategories.length === 0 ? (
                  <span className="text-xs text-slate-500">Nema dodeljenih kategorija.</span>
                ) : (
                  productCategories.map((category) => (
                    <span
                      key={category._id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                    >
                      <Tag className="h-3 w-3 text-slate-500" />
                      {category.name}
                      <button
                        type="button"
                        className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                        onClick={() => handleRemoveCategory(category._id)}
                        title="Ukloni kategoriju"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
              <div className="relative">
                <Input
                  value={categorySearch}
                  placeholder={categories === undefined ? "Ucitavanje kategorija..." : "Pretrazi ili dodaj kategoriju"}
                  disabled={categories === undefined}
                  onChange={(event) => {
                    setCategorySearch(event.target.value);
                    setCategoryMenuOpen(true);
                  }}
                  onFocus={() => setCategoryMenuOpen(true)}
                  onClick={() => setCategoryMenuOpen(true)}
                />
                <input
                  ref={categoryIconInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleCategoryIconChange}
                />
                {categoryMenuOpen && (
                  <div
                    className="absolute z-20 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    <div className="border-b border-slate-100 bg-slate-50/60">
                      {isAddingCategory ? (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <div
                            className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-slate-300 bg-white text-slate-500 hover:border-blue-400"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              categoryIconInputRef.current?.click();
                            }}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={handleCategoryIconDrop}
                            title="Prevuci ili izaberi ikonicu"
                          >
                            {isUploadingCategoryIcon ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : newCategoryIcon?.previewUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={newCategoryIcon.previewUrl} alt="Ikonica" className="h-full w-full object-cover" />
                            ) : (
                              <Tag className="h-4 w-4" />
                            )}
                          </div>
                          <Input
                            value={newCategoryName}
                            placeholder="Naziv kategorije"
                            onChange={(event) => setNewCategoryName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleCreateCategory();
                              }
                            }}
                          />
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              size="sm"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                handleCreateCategory();
                              }}
                              disabled={isCreatingCategory}
                              className="gap-1"
                            >
                              {isCreatingCategory ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              Sacuvaj
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                resetNewCategoryState();
                              }}
                            >
                              Odustani
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-50"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsAddingCategory(true);
                          setCategoryMenuOpen(true);
                        }}
                      >
                          <Plus className="h-4 w-4" />
                          Dodaj novu kategoriju
                        </button>
                      )}
                    </div>
                    {categories === undefined ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                    ) : filteredCategories.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata</div>
                    ) : (
                      filteredCategories.map((category, idx) => {
                        const isSelected = (product.categoryIds ?? []).includes(category._id);
                        const usageCount = category.productCount ?? 0;
                        return (
                          <button
                            key={category._id}
                            type="button"
                            className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition ${
                              idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            } ${isSelected ? "text-blue-700" : "text-slate-800"} hover:bg-blue-50`}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleSelectCategory(category._id);
                          }}
                        >
                            {category.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={category.iconUrl} alt={category.name} className="h-8 w-8 rounded-md object-cover" />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                                <Tag className="h-4 w-4" />
                              </div>
                            )}
                          <div className="flex-1">
                            <p className="font-semibold">{category.name}</p>
                            {isSelected ? <p className="text-[11px] text-emerald-600">Izabrana</p> : null}
                            {usageCount > 0 ? (
                              <p className="text-[11px] text-amber-600">{usageCount} proizvoda vezano</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            {isSelected ? <Check className="h-4 w-4 text-emerald-600" /> : null}
                            <span
                              role="button"
                              aria-label="Obrisi kategoriju"
                              className="rounded-full p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setCategoryMenuOpen(false);
                                handleRequestDeleteCategory(category);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </span>
                          </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          <InlineField
            label="Prodajna cena (EUR)"
            value={product.prodajnaCena}
            formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
            onSave={(val) => handleBaseFieldSave("prodajnaCena", val)}
          />
          <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nabavka</p>
                <p className="text-xs text-slate-600">Najniza ponuda dobavljaca postaje prava nabavna cena.</p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={showAddSupplierForm ? "ghost" : "outline"}
                className="gap-2"
                onClick={() => setShowAddSupplierForm((prev) => !prev)}
                disabled={suppliers === undefined}
              >
                {showAddSupplierForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {showAddSupplierForm ? "Zatvori" : "Dodaj dobavljaca"}
              </Button>
            </div>

            {showAddSupplierForm ? (
              suppliers === undefined ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  Ucitavanje dobavljaca...
                </div>
              ) : suppliers.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
                  Dodaj dobavljace na glavnoj listi pa ih povezi ovde.
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-blue-200 bg-white/90 px-3 py-3 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-12 md:items-end">
                    <div className="space-y-1 md:col-span-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dobavljac</p>
                      <Select value={newSupplierId} onValueChange={setNewSupplierId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Izaberi dobavljaca" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier._id} value={supplier._id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {hasVariants ? (
                      <div className="space-y-1 md:col-span-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vazi za</p>
                        <Select value={newSupplierVariantId} onValueChange={(value) => setNewSupplierVariantId(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Svi tipovi" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="base">Svi tipovi</SelectItem>
                            {(product.variants ?? []).map((variant) => (
                              <SelectItem key={variant.id} value={variant.id}>
                                {variant.label || "Tip"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                    <div className={`space-y-1 ${hasVariants ? "md:col-span-3" : "md:col-span-6"}`}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cena (EUR)</p>
                      <Input
                        value={newSupplierPrice}
                        inputMode="decimal"
                        placeholder="npr. 10.50"
                        onChange={(event) => setNewSupplierPrice(event.target.value)}
                      />
                    </div>
                    <div className="flex gap-2 md:col-span-2">
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-2"
                        onClick={handleAddSupplierOffer}
                        disabled={isSavingSupplierOffer || !newSupplierId}
                      >
                        {isSavingSupplierOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Sacuvaj
                      </Button>
                    </div>
                  </div>
                </div>
              )
            ) : null}

            {supplierOffers.length === 0 ? (
              <>
                <InlineField
                  label="Nabavna cena (EUR)"
                  value={product.nabavnaCena}
                  formatter={(val) => formatCurrency(Number(val ?? 0), "EUR")}
                  onSave={(val) => handleBaseFieldSave("nabavnaCena", val)}
                />
                <label className="flex items-center justify-between gap-3 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm shadow-slate-100">
                  <div className="flex flex-col">
                    <span>{baseNabavnaIsReal ? "Prava nabavna cena" : "Procenjena nabavna cena"}</span>
                    <span className="text-xs font-normal text-slate-500">Check ako je cifra 100% sigurna.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={baseNabavnaIsReal}
                    onChange={(event) => handleBasePurchaseRealityToggle(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </>
            ) : supplierOffers.length === 1 ? (
              <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Nabavna cena</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {formatCurrency(supplierOffers[0].price, "EUR")}
                      </p>
                    </div>
                    {hasVariants ? (
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
                        {supplierOffers[0].variantId
                          ? variantMap.get(supplierOffers[0].variantId)?.label ?? "Tip"
                          : "Svi tipovi"}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {supplierMap.get(supplierOffers[0].supplierId)?.name ?? "Dobavljac"}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSupplierOffer(supplierOffers[0])}
                      title="Ukloni ponudu"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {(() => {
                  const offer = supplierOffers[0];
                  const key = supplierOfferKey(offer);
                  const editValue = supplierEdits[key] ?? String(offer.price);
                  const isChanged = parsePrice(editValue) !== offer.price;
                  return (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editValue}
                        inputMode="decimal"
                        className="h-9"
                        onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!isChanged}
                        onClick={() => handleSupplierPriceSave(offer)}
                      >
                        Sacuvaj
                      </Button>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-2">
                {supplierOffers.map((offer) => {
                  const supplierName = supplierMap.get(offer.supplierId)?.name ?? "Dobavljac";
                  const isBest = bestSupplierOffer && offer.price === bestSupplierOffer.price;
                  const key = supplierOfferKey(offer);
                  const editValue = supplierEdits[key] ?? String(offer.price);
                  const isChanged = parsePrice(editValue) !== offer.price;
                  const variantLabel = hasVariants
                    ? offer.variantId
                      ? variantMap.get(offer.variantId)?.label ?? "Tip"
                      : "Svi tipovi"
                    : null;
                  return (
                    <div
                      key={`${offer.supplierId}-${offer.variantId ?? "base"}`}
                      className={`rounded-lg border px-3 py-2 text-sm shadow-sm ${
                        isBest
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{supplierName}</span>
                          {variantLabel ? (
                            <span className="rounded-full bg-white/70 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                              {variantLabel}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{formatCurrency(offer.price, "EUR")}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveSupplierOffer(offer)}
                            title="Ukloni ponudu"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={editValue}
                          inputMode="decimal"
                          className="h-9"
                          onChange={(event) => handleSupplierPriceChange(key, event.target.value)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!isChanged}
                          onClick={() => handleSupplierPriceSave(offer)}
                        >
                          Sacuvaj
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        <div className="space-y-3">
          {isKodMajstor ? (
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[240px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(product.publishKp)}
                onChange={(event) => handlePublishToggle("publishKp", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/kp.png" alt="KP" className="h-28 w-28 object-cover" />
                      </span> 
                <span className="text-sm font-semibold text-slate-800">KupujemProdajem</span>
              </span>
            </label>
            <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(product.publishFbProfile)}
                onChange={(event) => handlePublishToggle("publishFbProfile", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <Facebook className="h-5 w-5 text-blue-600" />
                <span>Kod Majstora</span>
              </span>
            </label>
            <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(product.publishIg)}
                onChange={(event) => handlePublishToggle("publishIg", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 text-white shadow-sm">
                  <Instagram className="h-4 w-4" />
                </span>
                <span>kod.majstora</span>
              </span>
            </label>
            <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(product.publishMarketplace)}
                onChange={(event) => handlePublishToggle("publishMarketplace", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="flex items-center gap-2 font-semibold text-slate-800">
                <Facebook className="h-5 w-5 text-blue-600" />
                <span>Marketplace</span>
              </span>
            </label>
          </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <label className="flex min-w-[200px] flex-1 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-300">
              <input
                type="checkbox"
                checked={Boolean(product.pickupAvailable)}
                onChange={(event) => handlePublishToggle("pickupAvailable", event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Lično preuzimanje
            </label>
          </div>
        </div>
        {isKodMajstor ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="gap-2"
              onClick={() => publishNow("facebook")}
              disabled={publishing !== null}
            >
              {publishing === "facebook" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Facebook className="h-4 w-4" />
              )}
              {publishing === "facebook" ? "Objavljivanje..." : "Okaci na Facebook"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => publishNow("instagram")}
              disabled={publishing !== null}
            >
              {publishing === "instagram" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Instagram className="h-4 w-4" />
              )}
              {publishing === "instagram" ? "Objavljivanje..." : "Okaci na Instagram"}
            </Button>
          </div>
        ) : null}
            <div className="grid gap-2 sm:grid-cols-2 text-sm text-slate-600">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Kreirano</p>
                <p className="font-medium text-slate-800">{formatDate(product.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Azurirano</p>
                <p className="font-medium text-slate-800">{formatDate(product.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Opisi proizvoda</CardTitle>
            <p className="text-sm text-slate-500">Posebni tekstovi za KupujemProdajem i drustvene mreze.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <InlineField
              label="KupujemProdajem opis"
              value={product.opisKp ?? ""}
              multiline
              onSave={(val) => handleBaseFieldSave("opisKp", val)}
            />
            <InlineField
              label="FB / Insta opis"
              value={product.opisFbInsta ?? product.opis ?? ""}
              multiline
              onSave={(val) => handleBaseFieldSave("opisFbInsta", val)}
            />
        </CardContent>
      </Card>
    </div>
  );
}
