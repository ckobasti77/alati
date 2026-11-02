"use client";

import { ArrowLeft, LogOut, Moon, Plus, Search, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ScrollTopButton } from "@/components/shell/ScrollTopButton";
import { useShell } from "@/components/shell/ShellProvider";
import { useTheme } from "@/components/ThemeProvider";
import { ActionMenu } from "@/components/ui/action-menu";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useAuth } from "@/lib/auth-client";
import { DESKTOP_TOOL_LINKS, NEW_ORDER_HREF, PRIMARY_NAV, getRouteMeta, isNavActive, visibleLinks } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setActionsSlot, setTitleSlot, openPalette } = useShell();
  const meta = getRouteMeta(pathname);
  const isAuthed = status === "authenticated";
  const isAdmin = user?.role === "admin";

  // Dubina navigacije unutar aplikacije: "nazad" ide kroz istoriju samo kad postoji prethodna stranica
  // iz aplikacije (deep link u PWA nema istoriju, pa ide na roditelja).
  const depth = useRef(-1);
  const popped = useRef(false);
  useEffect(() => {
    const onPopState = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  useEffect(() => {
    if (popped.current) {
      popped.current = false;
      depth.current = Math.max(0, depth.current - 1);
    } else {
      depth.current += 1;
    }
  }, [pathname]);

  const goBack = () => {
    if (depth.current > 0) router.back();
    else if (meta.backHref) router.push(meta.backHref);
  };

  const themeLabel = theme === "dark" ? "Svetla tema" : "Tamna tema";

  return (
    <header className="sticky top-0 z-(--z-header) border-b bg-(--header-bg) pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      {/* Telefon */}
      <div className="flex h-(--header-h) items-center gap-1 px-1.5 md:hidden">
        {meta.backHref && isAuthed ? (
          <IconButton aria-label="Nazad" size="lg" onClick={goBack} className="text-text">
            <ArrowLeft />
          </IconButton>
        ) : (
          <Link href="/" aria-label="Kontrolna tabla" className="flex size-11 shrink-0 items-center justify-center">
            <Image src="/logo.png" alt="" width={30} height={30} className="rounded-lg" priority />
          </Link>
        )}
        <div className="group/title min-w-0 flex-1 px-1">
          <p className="truncate text-[17px] font-semibold leading-6 tracking-[-0.01em] text-text group-has-[[data-slot=title]>*]/title:hidden">
            {meta.title}
          </p>
          <div data-slot="title" ref={setTitleSlot} className="truncate text-[17px] font-semibold leading-6 empty:hidden" />
        </div>
        <div ref={setActionsSlot} className="flex shrink-0 items-center gap-0.5 empty:hidden" />
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden h-(--header-h) max-w-7xl items-center gap-3 px-6 md:flex">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label="Kod Majstora, kontrolna tabla">
          <Image src="/logo.png" alt="" width={34} height={34} className="rounded-lg" priority />
          <span className="hidden text-sm font-semibold tracking-[-0.01em] text-text xl:inline">Kod Majstora</span>
        </Link>

        {isAuthed ? (
          <nav aria-label="Glavna navigacija" className="flex min-w-0 items-center gap-0.5 rounded-full bg-(--nav-pill-bg) p-1 ring-1 ring-(--nav-pill-border)">
            {visibleLinks(PRIMARY_NAV, isAdmin).map((link) => {
              const active = isNavActive(link.href, pathname);
              const exact = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={exact ? "page" : active ? "true" : undefined}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                    active ? "bg-(--nav-active-bg) text-text" : "text-text-muted hover:text-text",
                  )}
                >
                  <span className="lg:hidden">{link.shortLabel}</span>
                  <span className="hidden lg:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {isAuthed ? (
            <>
              <ScrollTopButton />
              <button
                type="button"
                onClick={openPalette}
                aria-label="Pretraga (Ctrl K)"
                className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-2.5 text-sm text-text-muted ring-1 ring-inset ring-border transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Search className="size-4" aria-hidden />
                <span className="hidden lg:inline">Pretraga</span>
                <kbd className="hidden rounded-md bg-surface-2 px-1.5 text-[11px] leading-5 font-medium xl:inline">Ctrl K</kbd>
              </button>
              <Button asChild size="sm" className="ml-1 gap-1.5 rounded-xl">
                <Link href={NEW_ORDER_HREF} scroll={pathname !== "/narudzbine"}>
                  <Plus className="size-4" aria-hidden />
                  <span className="lg:hidden">Nova</span>
                  <span className="hidden lg:inline">Nova narudžbina</span>
                </Link>
              </Button>
            </>
          ) : null}
          <IconButton aria-label={themeLabel} title={themeLabel} onClick={toggleTheme}>
            {theme === "dark" ? <Sun /> : <Moon />}
          </IconButton>
          {isAuthed ? (
            <ActionMenu
              label="Alati i nalog"
              heading={user?.username}
              items={[
                ...DESKTOP_TOOL_LINKS.map((link) => ({ label: link.label, icon: link.icon, href: link.href })),
                { label: "Odjava", icon: LogOut, onSelect: logout, separatorBefore: true },
              ]}
            />
          ) : status === "unauthenticated" && pathname !== "/login" ? (
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Prijava</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
