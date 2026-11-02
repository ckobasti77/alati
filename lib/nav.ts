import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Calculator,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Package,
  ReceiptText,
  ShoppingBag,
} from "lucide-react";

export type NavTab = "tabla" | "narudzbine" | "proizvodi" | "vise";

export type NavLink = {
  href: string;
  label: string;
  /** Kraća labela za uske prostore (donja navigacija, md header). */
  shortLabel: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

export const NEW_ORDER_HREF = "/narudzbine?nova=1";

/** Pill navigacija na desktopu. */
export const PRIMARY_NAV: NavLink[] = [
  { href: "/", label: "Kontrolna tabla", shortLabel: "Tabla", icon: LayoutDashboard },
  { href: "/narudzbine", label: "Narudžbine", shortLabel: "Narudžbine", icon: ShoppingBag },
  { href: "/proizvodi", label: "Proizvodi", shortLabel: "Proizvodi", icon: Package },
  { href: "/obracun", label: "Obračun", shortLabel: "Obračun", icon: Calculator },
  { href: "/objave", label: "Objave", shortLabel: "Objave", icon: Megaphone, adminOnly: true },
];

/** Tabovi donje navigacije (telefon). "+" i "Više" su posebna dugmad između i posle njih. */
export const BOTTOM_TABS: (NavLink & { tab: NavTab })[] = [
  { ...PRIMARY_NAV[0], tab: "tabla" },
  { ...PRIMARY_NAV[1], tab: "narudzbine" },
  { ...PRIMARY_NAV[2], tab: "proizvodi" },
];

/** Stavke u "Više" sheet-u (telefon) i ⋯ meniju u headeru (desktop). */
export const MORE_LINKS: NavLink[] = [
  PRIMARY_NAV[3],
  PRIMARY_NAV[4],
  { href: "/narudzbine/uvoz", label: "Uvoz priznanica", shortLabel: "Uvoz", icon: ReceiptText },
  { href: "/narudzbine/wa-uvoz", label: "WA uvoz", shortLabel: "WA uvoz", icon: MessageCircle },
  { href: "/narudzbine/pare", label: "Legle pare", shortLabel: "Legle pare", icon: Banknote },
];

/** Alati koji nisu u pill navigaciji na desktopu (idu u ⋯ meni). */
export const DESKTOP_TOOL_LINKS: NavLink[] = MORE_LINKS.slice(2);

export const visibleLinks = (links: NavLink[], isAdmin: boolean) => links.filter((link) => !link.adminOnly || isAdmin);

export type RouteMeta = {
  title: string;
  /** Roditelj za "nazad" na detaljima i podstranama; null na glavnim stranicama. */
  backHref: string | null;
  tab: NavTab | null;
};

const EXACT: Record<string, RouteMeta> = {
  "/": { title: "Kontrolna tabla", backHref: null, tab: "tabla" },
  "/narudzbine": { title: "Narudžbine", backHref: null, tab: "narudzbine" },
  "/narudzbine/uvoz": { title: "Uvoz priznanica", backHref: "/narudzbine", tab: "vise" },
  "/narudzbine/wa-uvoz": { title: "WA uvoz", backHref: "/narudzbine", tab: "vise" },
  "/narudzbine/pare": { title: "Legle pare", backHref: "/narudzbine", tab: "vise" },
  "/proizvodi": { title: "Proizvodi", backHref: null, tab: "proizvodi" },
  "/obracun": { title: "Obračun", backHref: null, tab: "vise" },
  "/objave": { title: "Objave", backHref: null, tab: "vise" },
  "/ui-kit": { title: "UI kit", backHref: "/", tab: null },
  "/login": { title: "Prijava", backHref: null, tab: null },
};

export function getRouteMeta(pathname: string | null | undefined): RouteMeta {
  const path = (pathname ?? "/").replace(/\/+$/, "") || "/";
  if (EXACT[path]) return EXACT[path];
  if (path.startsWith("/narudzbine/")) return { title: "Narudžbina", backHref: "/narudzbine", tab: "narudzbine" };
  if (path.startsWith("/proizvodi/")) return { title: "Proizvod", backHref: "/proizvodi", tab: "proizvodi" };
  return { title: "Kod Majstora", backHref: null, tab: null };
}

/** Aktivna stavka pill navigacije: "/" samo tačno, ostalo po prefiksu. */
export function isNavActive(href: string, pathname: string | null | undefined): boolean {
  const path = pathname ?? "/";
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
