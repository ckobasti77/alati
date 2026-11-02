"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet } from "@/components/ui/sheet";
import { STAGE_FLOW, STAGES, getStage, type StageMeta } from "@/lib/stages";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { cn } from "@/lib/utils";
import type { OrderStage } from "@/types/order";

const badgeBase =
  "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset ring-current/20";

export type StageBadgeProps = {
  stage: OrderStage | string;
  /** Kad postoji, bedž je dugme koje otvara izbor stage-a. */
  onChange?: (stage: OrderStage) => void;
  disabled?: boolean;
  showIcon?: boolean;
  className?: string;
};

export function StageBadge({ stage, onChange, disabled = false, showIcon = true, className }: StageBadgeProps) {
  const meta = getStage(stage);
  const Icon = meta.icon;
  const content = (
    <>
      {showIcon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {meta.label}
    </>
  );

  if (!onChange) {
    return <span className={cn(badgeBase, meta.tone, className)}>{content}</span>;
  }
  return <StagePicker meta={meta} onChange={onChange} disabled={disabled} className={className}>{content}</StagePicker>;
}

function StagePicker({
  meta,
  onChange,
  disabled,
  className,
  children,
}: {
  meta: StageMeta;
  onChange: (stage: OrderStage) => void;
  disabled: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  const select = (value: OrderStage) => {
    setOpen(false);
    if (value !== meta.value) onChange(value);
  };

  const trigger = (
    <button
      type="button"
      disabled={disabled}
      aria-haspopup="dialog"
      aria-label={`Status: ${meta.label}. Promeni status`}
      onClick={(event) => {
        // Bedž je često u redu/kartici koja na klik otvara detalj.
        event.stopPropagation();
        if (!isDesktop) setOpen(true);
      }}
      className={cn(
        badgeBase,
        meta.tone,
        // Vidljivo 24px, a meta za prst 44px.
        "relative cursor-pointer pr-1.5 transition-[filter] after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {children}
      <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent className="w-56" aria-label="Izbor statusa" onClick={(event) => event.stopPropagation()}>
          <StageList current={meta.value} onSelect={select} compact />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      {trigger}
      <Sheet open={open} onOpenChange={setOpen} title="Promeni status" description={`Trenutno: ${meta.label}`}>
        <StageList current={meta.value} onSelect={select} />
      </Sheet>
    </>
  );
}

function StageList({
  current,
  onSelect,
  compact = false,
}: {
  current: OrderStage;
  onSelect: (stage: OrderStage) => void;
  compact?: boolean;
}) {
  const option = (stage: StageMeta) => {
    const Icon = stage.icon;
    const selected = stage.value === current;
    return (
      <button
        key={stage.value}
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect(stage.value)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-left font-medium transition-colors duration-(--duration-fast) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
          compact ? "h-9 gap-2.5 rounded-lg px-2.5 text-sm" : "h-14 text-base",
          selected ? "bg-surface-2" : "hover:bg-surface-2",
        )}
      >
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full",
            stage.tone,
            compact ? "size-6" : "size-9",
          )}
        >
          <Icon className={compact ? "size-3.5" : "size-[18px]"} aria-hidden />
        </span>
        <span className="flex-1">{stage.label}</span>
        {selected ? <Check className="size-4 shrink-0 text-accent-text" aria-label="Trenutni status" /> : null}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-0.5">
      {STAGE_FLOW.map(option)}
      <div role="separator" className={cn("my-1 h-px bg-border", compact ? "mx-1" : "mx-0 my-2")} />
      {option(STAGES.vraceno)}
    </div>
  );
}
