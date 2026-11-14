"use client";

import { useState } from "react";
import { PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { RequireAuth } from "@/components/RequireAuth";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-client";
import { useConvexMutation, useConvexQueryState } from "@/lib/convex";
import { useIsDesktop } from "@/lib/useMediaQuery";
import type { Product, ProductVariant } from "@/types/order";
import { SearchField } from "@/app/narudzbine/_components/filters/SearchField";
import { ProductCardSkeleton, ProductPickCard } from "@/app/proizvodi/_components/list/ProductCard";
import { Composer, ComposerActions, type ComposerProduct, type Platform } from "./_components/Composer";
import { ScheduledList, type ScheduledPostItem } from "./_components/ScheduledList";
import type { ScheduleValue } from "./_components/WhenPicker";
import { useObjaveProducts } from "./_hooks/useObjaveProducts";

function resolvePrimaryVariant(product: Product): ProductVariant | undefined {
  const variants = product.variants ?? [];
  return variants.find((variant) => variant.isDefault) ?? variants[0];
}

function getMainImage(product?: Product | null) {
  if (!product) return null;
  const images = product.images ?? [];
  return images.find((image) => image.isMain) ?? images[0] ?? null;
}

const productName = (product: Product) => product.kpName ?? product.name;
const productPrice = (product: Product) => resolvePrimaryVariant(product)?.prodajnaCena ?? product.prodajnaCena;

export default function SocialPostsPage() {
  return (
    <RequireAuth adminOnly>
      <SocialContent />
    </RequireAuth>
  );
}

function SocialContent() {
  const { token } = useAuth();
  const sessionToken = token as string | null;
  const isDesktop = useIsDesktop();
  const feed = useObjaveProducts(sessionToken);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleValue>({ date: "", hour: "", minute: "" });
  const [publishing, setPublishing] = useState<Platform | null>(null);
  const [removingScheduledId, setRemovingScheduledId] = useState<string | null>(null);
  // "Sada" za proveru da zakazano vreme nije prošlo; osvežava se pri svakoj izmeni vremena.
  const [now, setNow] = useState(() => Date.now());

  const schedulePost = useConvexMutation<{ token: string; productId: string; platform: Platform; scheduledAt: number }>("socialScheduler:schedule");
  const removeScheduledPost = useConvexMutation<{ token: string; id: string }>("socialScheduler:removeScheduled");
  const scheduled = useConvexQueryState<ScheduledPostItem[]>("socialScheduler:listScheduled", { token: sessionToken ?? "" });

  const selectedProduct = feed.products.find((item) => item._id === selectedProductId) ?? null;
  const composerProduct: ComposerProduct | null = selectedProduct
    ? {
        id: selectedProduct._id,
        name: productName(selectedProduct),
        price: productPrice(selectedProduct),
        imageUrl: getMainImage(selectedProduct)?.url ?? undefined,
        caption: selectedProduct.opisFbInsta || selectedProduct.opis || selectedProduct.opisKp || selectedProduct.name,
      }
    : null;

  const changeSchedule = (value: ScheduleValue) => {
    setNow(Date.now());
    setSchedule(value);
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProductId(product._id);
    setNow(Date.now());
    if (!isDesktop) setComposerOpen(true);
  };

  // Objava i zakazivanje: ista logika i isti pozivi kao ranije (schedule mutacija ili /api/social).
  const publish = async (platform: Platform) => {
    if (!sessionToken) {
      toast.error("Nije pronađen token. Prijavi se ponovo.");
      return;
    }
    if (!selectedProduct) {
      toast.error("Izaberi proizvod za objavu.");
      return;
    }
    const { date: scheduledDate, hour: scheduledHour, minute: scheduledMinute } = schedule;
    try {
      setPublishing(platform);
      const hasSchedule = Boolean(scheduledDate.trim() || scheduledHour.trim() || scheduledMinute.trim());
      if (hasSchedule) {
        if (!scheduledDate.trim() || !scheduledHour.trim() || !scheduledMinute.trim()) {
          toast.error("Izaberi datum i vreme.");
          return;
        }
        const scheduledTs = new Date(`${scheduledDate}T${scheduledHour}:${scheduledMinute}`).getTime();
        if (!Number.isFinite(scheduledTs)) {
          toast.error("Neispravan datum zakazivanja.");
          return;
        }
        await schedulePost({ token: sessionToken, productId: selectedProduct._id, platform, scheduledAt: scheduledTs });
        toast.success("Objava je zakazana.");
        return;
      }
      const response = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, productId: selectedProduct._id, token: sessionToken, scheduledAt: null }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Neuspela objava.");
      }
      toast.success(platform === "facebook" ? "Objavljeno na Facebook stranici." : "Objavljeno na Instagram nalogu.");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Objava nije uspela.");
    } finally {
      setPublishing(null);
    }
  };

  const handleRemoveScheduled = async (id: string) => {
    if (!sessionToken) {
      toast.error("Nije pronađen token. Prijavi se ponovo.");
      return;
    }
    try {
      setRemovingScheduledId(id);
      await removeScheduledPost({ token: sessionToken, id });
      toast.success("Zakazana objava je otkazana.");
    } catch (error) {
      toast.error(error instanceof Error && error.message ? error.message : "Otkazivanje nije uspelo.");
    } finally {
      setRemovingScheduledId(null);
    }
  };

  const composer = composerProduct ? (
    <Composer
      product={composerProduct}
      schedule={schedule}
      onScheduleChange={changeSchedule}
      publishing={publishing}
      onPublish={(platform) => void publish(platform)}
      now={now}
      withActions={isDesktop}
    />
  ) : null;

  const scheduledCount = scheduled.data?.length ?? 0;

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <header className="sr-only md:not-sr-only md:flex md:flex-col md:gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Objave</h1>
        <p className="text-sm text-text-muted">Izaberi proizvod, proveri opis i objavi na Facebook ili Instagram, odmah ili zakazano.</p>
      </header>

      <section aria-labelledby="zakazane" className="rounded-2xl bg-surface ring-1 ring-border">
        <h2 id="zakazane" className="flex min-h-12 items-center gap-2 px-4 pt-3 text-base font-semibold text-text md:px-5">
          Zakazane objave
          {scheduledCount > 0 ? <span className="num rounded-full bg-surface-2 px-2 text-xs font-medium text-text-muted">{scheduledCount}</span> : null}
        </h2>
        <div className="pb-2">
          <ScheduledList posts={scheduled.data} error={Boolean(scheduled.error)} removingId={removingScheduledId} onRemove={handleRemoveScheduled} />
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-[minmax(0,1fr)_360px] md:gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <section aria-labelledby="izbor-proizvoda" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <h2 id="izbor-proizvoda" className="text-base font-semibold text-text">
              Izaberi proizvod
            </h2>
            <SearchField value={feed.search} onChange={feed.changeSearch} placeholder="Pretraži proizvode" className="w-full md:w-72" />
          </div>
          {feed.isLoading ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 xl:grid-cols-4" aria-hidden>
              {Array.from({ length: 8 }, (_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </ul>
          ) : feed.products.length === 0 ? (
            <div className="rounded-2xl bg-surface ring-1 ring-border">
              <EmptyState icon={PackageSearch} title="Nema proizvoda za ovu pretragu" description="Promeni ili obriši pretragu." />
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 xl:grid-cols-4">
              {feed.products.map((product) => (
                <ProductPickCard
                  key={product._id}
                  product={product}
                  name={productName(product)}
                  price={productPrice(product)}
                  imageUrl={getMainImage(product)?.url ?? undefined}
                  selected={product._id === selectedProductId}
                  onSelect={() => handleSelectProduct(product)}
                />
              ))}
              {feed.isLoadingMore ? Array.from({ length: 4 }, (_, index) => <ProductCardSkeleton key={`more-${index}`} />) : null}
            </ul>
          )}
          <div ref={feed.loaderRef} aria-hidden className="h-px" />
        </section>

        {isDesktop ? (
          <aside aria-label="Nova objava" className="sticky top-[calc(var(--header-h)+1rem)] rounded-2xl bg-surface p-5 ring-1 ring-border">
            <h2 className="mb-4 text-base font-semibold text-text">Nova objava</h2>
            {composer ?? <p className="text-sm text-text-muted">Izaberi proizvod levo da vidiš pregled opisa i objaviš ga.</p>}
          </aside>
        ) : null}
      </div>

      {!isDesktop ? (
        <Sheet
          open={composerOpen && composer !== null}
          onOpenChange={setComposerOpen}
          title="Nova objava"
          size="full"
          footer={<ComposerActions schedule={schedule} now={now} publishing={publishing} onPublish={(platform) => void publish(platform)} />}
        >
          {composer}
        </Sheet>
      ) : null}
    </div>
  );
}
