"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-client";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

const navLinks = [
  { href: "/", label: "Kontrolna tabla" },
  { href: "/narudzbine", label: "Narudzbine" },
  { href: "/obracun", label: "Obracun" },
  { href: "/proizvodi", label: "Proizvodi" },
  { href: "/objave", label: "Objave", adminOnly: true },
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

  const isDashboard = pathname === "/";
  const shouldElevateMenu = !isDashboard && isMobileMenuOpen;
  const headerZIndex = shouldElevateMenu ? "z-[120]" : "";
  const mobileMenuZIndex = isDashboard ? "z-30" : "z-[200]";

  const navigation = (
    <nav
      className="relative flex flex-col gap-1 text-sm font-medium md:flex-row md:items-center md:gap-0.5 md:rounded-full md:border md:p-1 md:backdrop-blur-sm"
      style={{
        borderColor: "var(--nav-pill-border)",
        background: "var(--nav-pill-bg)",
      }}
    >
      {navLinks.map((link) => {
        if (link.adminOnly && user?.role !== "admin") return null;
        const active = isActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "rounded-full px-4 py-1.5 text-slate-900 transition-all duration-200 md:text-sm"
                : "rounded-full px-4 py-1.5 text-slate-400 transition-all duration-200 hover:text-slate-700 md:text-sm"
            }
            style={active ? { background: "var(--nav-active-bg)" } : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header
      className={`relative z-9999 border-b backdrop-blur-xl ${headerZIndex}`}
      style={{
        background: "var(--header-bg)",
        borderColor: "var(--header-border)",
      }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Otvori meni"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Image src="/logo.png" width={40} height={40} alt="logo" className="shrink-0 rounded-lg" />
          <span className="hidden text-sm font-semibold text-slate-900 md:block">Kod Majstora</span>
        </div>

        <div className="md:hidden">
          <ThemeToggle withLabel={false} />
        </div>

        <div className="hidden flex-1 items-center justify-center md:flex">
          {status === "authenticated" ? navigation : null}
        </div>

        <div className="hidden items-center gap-3 text-sm md:flex">
          <ThemeToggle withLabel={false} />
          {status === "checking" ? <span className="text-slate-500">Provera naloga...</span> : null}
          {status === "authenticated" && user ? (
            <Button size="sm" variant="ghost" onClick={logout} className="text-slate-500 hover:text-slate-900">
              Odjava
            </Button>
          ) : status !== "checking" ? (
            <Button size="sm" asChild>
              <Link href="/login">Prijava</Link>
            </Button>
          ) : null}
        </div>

        {status === "authenticated" && (
          <div
            className={`absolute left-0 right-0 top-16 ${mobileMenuZIndex} origin-top rounded-b-2xl border-b px-4 py-4 shadow-2xl backdrop-blur-xl transition duration-200 md:hidden ${
              isMobileMenuOpen ? "opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
            }`}
            style={{
              background: "var(--header-bg)",
              borderColor: "var(--header-border)",
            }}
          >
            <div className="space-y-4">
              {navigation}
              <div className="flex items-center justify-end gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <ThemeToggle withLabel={false} />
                <Button size="sm" variant="ghost" onClick={logout} className="text-slate-500 hover:text-slate-900">
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
