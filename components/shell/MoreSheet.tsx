"use client";

import { ChevronRight, LogOut, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useShell } from "@/components/shell/ShellProvider";
import { useTheme } from "@/components/ThemeProvider";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-client";
import { MORE_LINKS, isNavActive, visibleLinks } from "@/lib/nav";
import { cn } from "@/lib/utils";

const rowClass =
  "flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-xl px-2 text-left text-[15px] font-medium text-text transition-colors duration-(--duration-fast) hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring active:bg-surface-3";
const iconBoxClass = "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-text-muted [&_svg]:size-[18px]";

export function MoreSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { openPalette } = useShell();
  const links = visibleLinks(MORE_LINKS, user?.role === "admin");

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Više" description={user?.username}>
      <nav aria-label="Ostale stranice" className="-mx-2 flex flex-col gap-0.5">
        <button
          type="button"
          className={rowClass}
          onClick={() => {
            onOpenChange(false);
            openPalette();
          }}
        >
          <span className={iconBoxClass}>
            <Search />
          </span>
          <span className="flex-1">Pretraga</span>
        </button>
        {links.map((link) => {
          const Icon = link.icon;
          const active = isNavActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              onClick={() => onOpenChange(false)}
              className={cn(rowClass, active && "bg-surface-2")}
            >
              <span className={cn(iconBoxClass, active && "bg-accent-soft text-accent-text")}>
                <Icon />
              </span>
              <span className="flex-1">{link.label}</span>
              <ChevronRight className="size-4 shrink-0 text-text-muted" aria-hidden />
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4">
        <span className="text-sm font-medium text-text">Tema</span>
        <SegmentedControl
          ariaLabel="Tema"
          value={theme}
          onChange={setTheme}
          options={[
            { value: "light", label: "Svetla", icon: Sun },
            { value: "dark", label: "Tamna", icon: Moon },
          ]}
        />
      </div>

      <div className="-mx-2 mt-3 border-t pt-3">
        <button
          type="button"
          className={rowClass}
          onClick={() => {
            onOpenChange(false);
            logout();
          }}
        >
          <span className={iconBoxClass}>
            <LogOut />
          </span>
          <span className="flex-1">Odjava</span>
        </button>
      </div>
    </Sheet>
  );
}
