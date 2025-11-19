"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/auth-client";

export function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      const next = pathname && pathname !== "/login" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [pathname, router, status]);

  useEffect(() => {
    if (status === "authenticated" && adminOnly && user?.role !== "admin") {
      router.replace("/");
    }
  }, [adminOnly, router, status, user]);

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-10 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Provera naloga...
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (adminOnly && user?.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
