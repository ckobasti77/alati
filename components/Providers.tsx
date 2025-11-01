"use client";

import { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/convex/client";
import { Toaster } from "sonner";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
      <Toaster richColors position="top-right" />
    </ConvexProvider>
  );
}
