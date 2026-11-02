"use client";

import { Ellipsis, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MoreSheet } from "@/components/shell/MoreSheet";
import { useAuth } from "@/lib/auth-client";
import { prefersReducedMotion } from "@/lib/motion";
import { BOTTOM_TABS, NEW_ORDER_HREF, getRouteMeta, type NavTab } from "@/lib/nav";
import { cn } from "@/lib/utils";

const tabClass =
  "group flex h-full w-full cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] leading-4 font-medium text-text-muted transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring data-[active=true]:text-text";
const indicatorClass =
  "flex h-7 w-14 items-center justify-center rounded-full transition-colors duration-(--duration-fast) group-active:bg-surface-2 group-data-[active=true]:bg-accent-soft group-data-[active=true]:text-accent-text [&_svg]:size-5";

/** Donja navigacija na telefonu: Tabla · Narudžbine · [+] · Proizvodi · Više. */
export function BottomNav() {
  const pathname = usePathname();
  const { status } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  if (status !== "authenticated" || pathname === "/login") return null;

  const activeTab: NavTab | null = moreOpen ? "vise" : getRouteMeta(pathname).tab;

  const scrollTopIfCurrent = (event: React.MouseEvent, href: string) => {
    // Tap na tab stranice na kojoj si već: na vrh umesto ponovnog učitavanja.
    if (pathname !== href) return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const tab = (index: number) => {
    const item = BOTTOM_TABS[index];
    const Icon = item.icon;
    const active = activeTab === item.tab;
    return (
      <li className="flex">
        <Link
          href={item.href}
          data-active={active}
          aria-current={pathname === item.href ? "page" : active ? "true" : undefined}
          onClick={(event) => scrollTopIfCurrent(event, item.href)}
          className={tabClass}
        >
          <span className={indicatorClass}>
            <Icon aria-hidden />
          </span>
          {item.shortLabel}
        </Link>
      </li>
    );
  };

  return (
    <>
      <nav
        aria-label="Donja navigacija"
        className="fixed inset-x-0 bottom-0 z-(--z-nav) border-t bg-(--header-bg) pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="mx-auto grid h-(--bottom-nav-h) max-w-md grid-cols-5">
          {tab(0)}
          {tab(1)}
          <li className="flex items-center justify-center">
            <Link
              href={NEW_ORDER_HREF}
              scroll={pathname !== "/narudzbine"}
              aria-label="Nova narudžbina"
              className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-fg shadow-(--shadow-fab) transition-transform duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95"
            >
              <Plus className="size-6" strokeWidth={2.25} aria-hidden />
            </Link>
          </li>
          {tab(2)}
          <li className="flex">
            <button
              type="button"
              data-active={activeTab === "vise"}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={cn(tabClass)}
            >
              <span className={indicatorClass}>
                <Ellipsis aria-hidden />
              </span>
              Više
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
