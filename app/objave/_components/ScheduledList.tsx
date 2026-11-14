"use client";

import { CalendarClock, Facebook, Instagram, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDateKey, toDateKey } from "./WhenPicker";

export type ScheduledStatus = "scheduled" | "processing" | "failed";
export type ScheduledPostItem = {
  _id: string;
  productId: string;
  productName: string;
  platform: "facebook" | "instagram";
  scheduledAt: number;
  status: ScheduledStatus;
  error?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");
const timeLabel = (ts: number) => {
  const date = new Date(ts);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
const weekday = new Intl.DateTimeFormat("sr-Latn-RS", { weekday: "long" });

function dayLabel(key: string, ts: number) {
  const today = toDateKey(new Date());
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  if (key === today) return "Danas";
  if (key === toDateKey(tomorrowDate)) return "Sutra";
  const name = weekday.format(new Date(ts));
  return `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${formatDateKey(key)}`;
}

const STATUS: Record<ScheduledStatus, { label: string; className: string }> = {
  scheduled: { label: "Zakazano", className: "bg-surface-2 text-text-muted" },
  processing: { label: "U toku", className: "bg-warning-soft text-warning" },
  failed: { label: "Neuspelo", className: "bg-danger-soft text-danger" },
};

/** Zakazane objave grupisane po danu (Danas, Sutra, dan + datum), vreme 24h. */
export function ScheduledList({
  posts,
  error,
  removingId,
  onRemove,
}: {
  posts: ScheduledPostItem[] | undefined;
  error: boolean;
  removingId: string | null;
  onRemove: (id: string) => Promise<void>;
}) {
  const [confirm, setConfirm] = useState<ScheduledPostItem | null>(null);

  if (error) {
    return <EmptyState tone="danger" compact icon={TriangleAlert} title="Zakazane objave trenutno ne mogu da se učitaju" />;
  }
  if (posts === undefined) {
    return (
      <div className="flex flex-col gap-2 px-4 pb-4 md:px-5" aria-hidden>
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }
  if (posts.length === 0) {
    return (
      <p className="flex items-center gap-2 px-4 pb-2 text-sm text-text-muted md:px-5">
        <CalendarClock className="size-4 shrink-0" aria-hidden />
        Nema zakazanih objava. Izaberi proizvod pa „Zakaži“.
      </p>
    );
  }

  const sorted = [...posts].sort((a, b) => a.scheduledAt - b.scheduledAt);
  const groups = new Map<string, ScheduledPostItem[]>();
  for (const post of sorted) {
    const key = toDateKey(new Date(post.scheduledAt));
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }

  return (
    <>
      <div className="flex flex-col">
        {Array.from(groups.entries()).map(([key, items]) => (
          <section key={key} aria-labelledby={`zakazane-${key}`}>
            <h3 id={`zakazane-${key}`} className="px-4 pt-2 pb-1 text-xs font-medium text-text-muted md:px-5">
              {dayLabel(key, items[0].scheduledAt)}
            </h3>
            <ul className="divide-y divide-border">
              {items.map((post) => {
                const status = STATUS[post.status];
                const PlatformIcon = post.platform === "facebook" ? Facebook : Instagram;
                return (
                  <li key={post._id} className="flex min-h-14 items-center gap-3 px-4 py-2 md:px-5">
                    <span className="num w-12 shrink-0 text-[15px] font-semibold text-text">{timeLabel(post.scheduledAt)}</span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] text-text md:text-sm">{post.productName}</span>
                      <span className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <PlatformIcon className="size-3.5" aria-hidden />
                          {post.platform === "facebook" ? "Facebook" : "Instagram"}
                        </span>
                        <span className={cn("rounded-full px-2 py-px font-medium", status.className)}>{status.label}</span>
                      </span>
                      {post.status === "failed" && post.error ? <span className="mt-0.5 text-xs text-danger">{post.error}</span> : null}
                    </div>
                    <IconButton
                      aria-label={`Otkaži objavu: ${post.productName}, ${timeLabel(post.scheduledAt)}`}
                      disabled={post.status === "processing" || removingId === post._id}
                      onClick={() => setConfirm(post)}
                      className="text-text-muted"
                    >
                      <Trash2 />
                    </IconButton>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        tone="danger"
        title="Otkazati zakazanu objavu?"
        description={confirm ? `${confirm.productName} · ${confirm.platform === "facebook" ? "Facebook" : "Instagram"} · ${dayLabel(toDateKey(new Date(confirm.scheduledAt)), confirm.scheduledAt)} u ${timeLabel(confirm.scheduledAt)}` : undefined}
        confirmLabel="Otkaži objavu"
        cancelLabel="Zadrži"
        onConfirm={async () => {
          if (!confirm) return;
          await onRemove(confirm._id);
          setConfirm(null);
        }}
      />
    </>
  );
}
