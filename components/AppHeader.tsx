"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-client";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navLinks = [
  { href: "/", label: "Kontrolna tabla" },
  { href: "/narudzbine", label: "Narudzbine" },
  { href: "/proizvodi", label: "Proizvodi" },
  { href: "/objave", label: "Objave", adminOnly: true },
  { href: "/profili", label: "Profili", adminOnly: true },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const navigation = (
    <nav className="flex flex-col gap-3 text-sm font-medium text-slate-700 md:flex-row md:items-center md:gap-4">
      {navLinks.map((link) => {
        if (link.adminOnly && user?.role !== "admin") return null;
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-md bg-slate-100 px-2 py-1 text-slate-900 underline decoration-2 underline-offset-4 md:bg-transparent md:px-0 md:py-0"
                : "rounded-md px-2 py-1 hover:bg-slate-50 md:px-0 md:py-0"
            }
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Otvori meni"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Image src="/logo.png" width={64} height={64} alt="logo" className="shrink-0" />
        </div>
        <div className="hidden flex-1 items-center justify-between gap-6 md:flex">
          {status === "authenticated" ? navigation : null}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {status === "checking" ? (
              <span className="text-slate-500">Provera naloga...</span>
            ) : status === "authenticated" && user ? (
              <>
                <span className="hidden whitespace-nowrap md:inline">
                  Prijavljen:{" "}
                  <span className="font-semibold text-slate-800">
                    {user.username}
                  </span>
                  {user.role === "admin" && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs">
                      Admin
                    </span>
                  )}
                </span>
                <Button size="sm" variant="outline" onClick={logout}>
                  Odjava
                </Button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link href="/login">Prijava</Link>
              </Button>
            )}
          </div>
        </div>
        {status === "authenticated" && (
          <div
            className={`absolute left-0 right-0 top-20 z-30 origin-top rounded-b-2xl border-b border-slate-200 bg-white px-4 py-4 shadow-lg transition duration-200 md:hidden ${
              isMobileMenuOpen ? "opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
            }`}
          >
            <div className="space-y-4">
              {navigation}
              <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <div className="flex flex-col">
                  <span className="font-semibold">{user?.username}</span>
                  {user?.role === "admin" ? <span className="text-[11px] text-amber-600">Admin</span> : null}
                </div>
                <Button size="sm" variant="outline" onClick={logout}>
                  Odjava
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
