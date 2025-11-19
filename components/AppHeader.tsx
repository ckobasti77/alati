"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-client";

const navLinks = [
  { href: "/", label: "Kontrolna tabla" },
  { href: "/narudzbine", label: "Narudzbine" },
  { href: "/proizvodi", label: "Proizvodi" },
  { href: "/profili", label: "Profili", adminOnly: true },
];

export function AppHeader() {
  const pathname = usePathname();
  const { user, status, logout } = useAuth();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname?.startsWith(href);
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold">Evidencija narudzbina</h1>
          <p className="text-sm text-slate-500">Brz unos, jasna kontrola profita.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          {status === "authenticated" && (
            <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
              {navLinks.map((link) => {
                if (link.adminOnly && user?.role !== "admin") return null;
                const active = isActive(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={active ? "text-slate-900 underline decoration-2 underline-offset-4" : ""}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            {status === "checking" ? (
              <span className="text-slate-500">Provera naloga...</span>
            ) : status === "authenticated" && user ? (
              <>
                <span className="hidden whitespace-nowrap md:inline">
                  Prijavljen: <span className="font-semibold text-slate-800">{user.username}</span>
                  {user.role === "admin" && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs">Admin</span>}
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
      </div>
    </header>
  );
}
