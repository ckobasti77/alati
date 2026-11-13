"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Poslednja linija odbrane za sve stranice: greška u stranici (npr. Convex query koji baca) prikazuje ovo
 * unutar layout-a, pa header i donja navigacija ostaju i aplikacija ne pada.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl bg-surface ring-1 ring-border">
      <h1 className="sr-only">Greška</h1>
      <EmptyState
        tone="danger"
        icon={TriangleAlert}
        title="Ova stranica trenutno ne radi"
        description="Podaci nisu mogli da se učitaju. Pokušaj ponovo; ostale stranice rade normalno."
        action={
          <>
            <Button type="button" onClick={reset}>
              Pokušaj ponovo
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Na tablu</Link>
            </Button>
          </>
        }
      />
    </div>
  );
}
