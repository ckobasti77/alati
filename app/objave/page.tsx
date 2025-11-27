"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-client";
import { useConvexQuery } from "@/lib/convex";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/order";

type Platform = "facebook" | "instagram";

export default function SocialPostsPage() {
  return (
    <RequireAuth adminOnly>
      <SocialContent />
    </RequireAuth>
  );
}

function SocialContent() {
  const { user, token } = useAuth();
  const sessionToken = token as string | null;
  const [productInput, setProductInput] = useState("");
  const [search, setSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [publishing, setPublishing] = useState<Platform | null>(null);

  const products = useConvexQuery<Product[]>("products:list", { token: sessionToken ?? "" });
  const filteredProducts = useMemo(() => {
    const list = products ?? [];
    const needle = search.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((product) => {
      if (product.name.toLowerCase().includes(needle)) return true;
      if (product.opisFbInsta?.toLowerCase().includes(needle)) return true;
      if (product.opisKp?.toLowerCase().includes(needle)) return true;
      return (product.variants ?? []).some((variant) => variant.label.toLowerCase().includes(needle));
    });
  }, [products, search]);

  const selectedProduct = useMemo(
    () => (products ?? []).find((item) => item._id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const mainImage = useMemo(() => {
    if (!selectedProduct) return null;
    const images = selectedProduct.images ?? [];
    return images.find((image) => image.isMain) ?? images[0] ?? null;
  }, [selectedProduct]);

  const captionPreview = useMemo(() => {
    if (!selectedProduct) return "";
    return selectedProduct.opisFbInsta || selectedProduct.opis || selectedProduct.opisKp || selectedProduct.name;
  }, [selectedProduct]);

  if (user?.role !== "admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pristup zabranjen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">Samo admin moze da zakazuje i objavljuje objave.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product._id);
    setProductInput(product.name);
    setDropdownOpen(false);
  };

  const publish = async (platform: Platform) => {
    if (!sessionToken) {
      toast.error("Nije pronadjen token. Prijavi se ponovo.");
      return;
    }
    if (!selectedProduct) {
      toast.error("Izaberi proizvod za objavu.");
      return;
    }
    try {
      setPublishing(platform);
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          productId: selectedProduct._id,
          token: sessionToken,
          scheduledAt: scheduledAt || null,
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Neuspela objava.");
      }
      toast.success(
        platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.",
      );
    } catch (error: any) {
      toast.error(error?.message ?? "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Objave na mreze</h1>
          <p className="text-sm text-slate-500">
            Izaberi proizvod, pogledaj opis i okaci na Facebook ili Instagram. Prazno vreme zakazivanja = odmah.
          </p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Izbor proizvoda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              value={productInput}
              placeholder={products === undefined ? "Ucitavanje..." : "Pretrazi proizvod"}
              disabled={products === undefined || (products?.length ?? 0) === 0}
              onChange={(event) => {
                const value = event.target.value;
                setProductInput(value);
                setSearch(value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onClick={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 120)}
            />
            {dropdownOpen && (
              <div className="absolute left-0 right-0 z-10 mt-1 max-h-72 overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
                {products === undefined ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Ucitavanje...</div>
                ) : filteredProducts.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Nema rezultata.</div>
                ) : (
                  filteredProducts.map((product) => {
                    const images = product.images ?? [];
                    const previewImage = images.find((image) => image.isMain) ?? images[0];
                    const description =
                      product.opisFbInsta || product.opis || product.opisKp || "Nema opisa za FB/IG.";
                    const isActive = selectedProductId === product._id;
                    return (
                      <button
                        key={product._id}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition hover:bg-blue-50 hover:text-blue-700",
                          isActive && "bg-blue-50 text-blue-700",
                        )}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleSelectProduct(product);
                        }}
                      >
                        {previewImage?.url ? (
                          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-slate-200">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewImage.url} alt={product.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-slate-300 text-[10px] uppercase text-slate-400">
                            N/A
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold">{product.name}</p>
                          <p className="line-clamp-1 text-xs text-slate-500">{description}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {selectedProduct ? (
            <div className="grid gap-4 lg:grid-cols-[2fr,3fr]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {mainImage?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mainImage.url} alt={selectedProduct.name} className="h-64 w-full object-cover" />
                  ) : (
                    <div className="flex h-64 items-center justify-center text-sm text-slate-500">Nema slike</div>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">Opis za FB/IG</p>
                  <div
                    className={richTextOutputClassNames}
                    dangerouslySetInnerHTML={{ __html: formatRichTextToHtml(captionPreview) }}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-800">Zakazi (opciono)</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                  <p className="text-xs text-slate-500">Ostavi prazno za objavu odmah.</p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() => publish("facebook")}
                    disabled={publishing !== null || !selectedProduct}
                  >
                    {publishing === "facebook" ? "Objavljivanje..." : "Okaci na Facebook"}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => publish("instagram")}
                    disabled={publishing !== null || !selectedProduct}
                  >
                    {publishing === "instagram" ? "Objavljivanje..." : "Okaci na Instagram"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Izaberi proizvod da vidis pregled i dugmad za objavu.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
