"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { Fragment } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/utils";

export type ActionMenuItem = {
  label: string;
  icon?: LucideIcon;
  onSelect?: () => void;
  /** Link umesto akcije (otvaranje u novom tabu radi). */
  href?: string;
  destructive?: boolean;
  disabled?: boolean;
  /** Linija iznad stavke (grupisanje). */
  separatorBefore?: boolean;
};

export type ActionMenuProps = {
  items: ActionMenuItem[];
  /** aria-label okidača. */
  label?: string;
  align?: "start" | "center" | "end";
  /** Sopstveni okidač (mora da prosledi ref, npr. Button ili IconButton). */
  trigger?: React.ReactNode;
  triggerClassName?: string;
  /** Opcioni naslov iznad stavki (npr. ime korisnika). */
  heading?: React.ReactNode;
};

const itemClass =
  "flex min-h-11 cursor-pointer select-none items-center gap-2.5 rounded-lg px-3 text-sm text-text outline-none transition-colors duration-(--duration-fast) data-[highlighted]:bg-surface-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 md:min-h-9 md:px-2.5 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-text-muted";

export function ActionMenu({ items, label = "Više akcija", align = "end", trigger, triggerClassName, heading }: ActionMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <IconButton aria-label={label} className={triggerClassName}>
            <MoreHorizontal />
          </IconButton>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={6}
          collisionPadding={12}
          className="z-(--z-popover) min-w-52 rounded-xl bg-raised p-1 shadow-(--shadow-popover) ring-1 ring-border outline-none"
        >
          {heading ? <DropdownMenu.Label className="px-3 pt-2 pb-1.5 text-xs text-text-muted md:px-2.5">{heading}</DropdownMenu.Label> : null}
          {items.map((item, index) => {
            const Icon = item.icon;
            const body = (
              <>
                {Icon ? <Icon aria-hidden /> : null}
                <span className="flex-1 truncate">{item.label}</span>
              </>
            );
            const className = cn(itemClass, item.destructive && "text-danger [&_svg]:text-danger data-[highlighted]:bg-danger-soft");
            return (
              <Fragment key={`${item.label}-${index}`}>
                {item.separatorBefore && index > 0 ? <DropdownMenu.Separator className="mx-1 my-1 h-px bg-border" /> : null}
                {item.href ? (
                  <DropdownMenu.Item asChild disabled={item.disabled} className={className}>
                    <Link href={item.href}>{body}</Link>
                  </DropdownMenu.Item>
                ) : (
                  <DropdownMenu.Item disabled={item.disabled} onSelect={item.onSelect} className={className}>
                    {body}
                  </DropdownMenu.Item>
                )}
              </Fragment>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
