"use client";

import { ReactNode } from "react";
import { ConvexProvider } from "convex/react";
import { convex } from "@/convex/client";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/auth-client";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useTheme } from "@/components/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ProvidersWithTheme>{children}</ProvidersWithTheme>
    </ThemeProvider>
  );
}

function ProvidersWithTheme({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        {children}
        <Toaster richColors position="top-right" theme={theme} />
      </AuthProvider>
    </ConvexProvider>
  );
}
