"use client";

import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorBoundary } from "@/components/ui/error-boundary";

type Props = { children: ReactNode; title?: string; compact?: boolean };

/** Convex `useQuery` baca grešku (npr. query još nije deployovan); tabla tada nudi ponovni pokušaj. */
export function DashboardErrorBoundary({ children, title, compact }: Props) {
  return (
    <ErrorBoundary
      fallback={({ reset }) => (
        <div className="rounded-2xl bg-surface ring-1 ring-border">
          <EmptyState
            tone="danger"
            icon={TriangleAlert}
            compact={compact}
            title={title ?? "Kontrolna tabla nije mogla da se učita"}
            description="Podaci trenutno nisu dostupni. Narudžbine i ostale stranice rade normalno."
            action={
              <Button size="sm" onClick={reset}>
                Pokušaj ponovo
              </Button>
            }
          />
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
