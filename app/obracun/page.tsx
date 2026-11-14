"use client";

import { TriangleAlert } from "lucide-react";
import { RequireAuth } from "@/components/RequireAuth";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth-client";
import { useConvexQueryState } from "@/lib/convex";
import type { ObracunSummary } from "@/types/order";
import { AksBexAccounts, ObracunSkeleton, PostaAccounts, SummaryTiles } from "./_components/ObracunSections";

export default function ObracunPage() {
  return (
    <RequireAuth>
      <ObracunContent />
    </RequireAuth>
  );
}

function ObracunContent() {
  const { token } = useAuth();
  const { data, error } = useConvexQueryState<ObracunSummary>("orders:obracun", { token: token as string, scope: "default" });

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Na telefonu je naslov u headeru aplikacije. */}
      <header className="sr-only md:not-sr-only md:flex md:flex-col md:gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-text">Obračun</h1>
        <p className="text-sm text-text-muted">Novac iz narudžbina u Leglu, po računima i Pošti.</p>
      </header>

      {error ? (
        <div className="rounded-2xl bg-surface ring-1 ring-border">
          <EmptyState
            tone="danger"
            icon={TriangleAlert}
            title="Obračun trenutno ne može da se učita"
            description="Podaci nisu dostupni. Narudžbine i ostale stranice rade normalno."
            action={
              <Button type="button" onClick={() => window.location.reload()}>
                Pokušaj ponovo
              </Button>
            }
          />
        </div>
      ) : !data ? (
        <ObracunSkeleton />
      ) : (
        <>
          <SummaryTiles data={data} />
          <div className="grid grid-cols-1 items-start gap-4 md:gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <AksBexAccounts data={data} />
            <PostaAccounts data={data} />
          </div>
        </>
      )}
    </div>
  );
}
