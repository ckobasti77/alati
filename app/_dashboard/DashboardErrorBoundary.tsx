"use client";

import { Component, type ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type State = { error: Error | null; attempt: number };

/** Convex `useQuery` baca gresku (npr. query jos nije deployovan); tabla tada nudi ponovni pokusaj. */
export class DashboardErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl bg-surface ring-1 ring-border">
          <EmptyState
            tone="danger"
            icon={TriangleAlert}
            title="Kontrolna tabla nije mogla da se učita"
            description="Podaci trenutno nisu dostupni. Narudžbine i ostale stranice rade normalno."
            action={
              <Button
                size="sm"
                onClick={() => this.setState((state) => ({ error: null, attempt: state.attempt + 1 }))}
              >
                Pokušaj ponovo
              </Button>
            }
          />
        </div>
      );
    }
    return <div key={this.state.attempt}>{this.props.children}</div>;
  }
}
