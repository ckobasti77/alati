"use client";

import { Facebook, Instagram, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/ui/money";
import { formatRichTextToHtml, richTextOutputClassNames } from "@/lib/richText";
import { cn } from "@/lib/utils";
import { formatDateKey, scheduleTimestamp, WhenPicker, type ScheduleValue } from "./WhenPicker";

export type Platform = "facebook" | "instagram";

export type ComposerProduct = { id: string; name: string; price: number | undefined; imageUrl?: string; caption: string };

/** Da li se trenutno može objaviti (vreme potpuno i u budućnosti, ništa ne traje). */
export function composerBlocked(schedule: ScheduleValue, now: number, publishing: Platform | null) {
  const timestamp = scheduleTimestamp(schedule);
  const scheduled = Boolean(schedule.date || schedule.hour || schedule.minute);
  return publishing !== null || (scheduled && timestamp === null) || (timestamp !== null && timestamp <= now);
}

/** Dugmad za objavu (desktop u panelu, telefon u sticky footer-u Sheet-a). */
export function ComposerActions({
  schedule,
  now,
  publishing,
  onPublish,
}: {
  schedule: ScheduleValue;
  now: number;
  publishing: Platform | null;
  onPublish: (platform: Platform) => void;
}) {
  const blocked = composerBlocked(schedule, now, publishing);
  const actionVerb = schedule.date || schedule.hour || schedule.minute ? "Zakaži" : "Objavi";
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button type="button" disabled={blocked} onClick={() => onPublish("facebook")}>
        {publishing === "facebook" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Facebook className="size-4" aria-hidden />}
        {actionVerb} na Facebooku
      </Button>
      <Button type="button" variant="outline" disabled={blocked} onClick={() => onPublish("instagram")}>
        {publishing === "instagram" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Instagram className="size-4" aria-hidden />}
        {actionVerb} na Instagramu
      </Button>
    </div>
  );
}

/** Pregled izabranog proizvoda + Kada (+ dugmad kad `withActions`). Isti sadržaj u panelu (desktop) i Sheet-u (telefon). */
export function Composer({
  product,
  schedule,
  onScheduleChange,
  publishing,
  onPublish,
  now,
  withActions,
}: {
  product: ComposerProduct;
  schedule: ScheduleValue;
  onScheduleChange: (value: ScheduleValue) => void;
  publishing: Platform | null;
  onPublish: (platform: Platform) => void;
  now: number;
  withActions: boolean;
}) {
  const timestamp = scheduleTimestamp(schedule);
  const past = timestamp !== null && timestamp <= now;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <span className="size-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 ring-1 ring-border md:size-24">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- Convex storage URL
            <img src={product.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-text-muted">
              <Package className="size-6" aria-hidden />
            </span>
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="line-clamp-2 text-[15px] leading-5 font-semibold text-text">{product.name}</p>
          <Money value={product.price} className="text-[15px] font-semibold text-text" />
        </div>
      </div>

      <section aria-labelledby="objava-opis" className="rounded-xl bg-surface-2 p-3">
        <h3 id="objava-opis" className="mb-1.5 text-[13px] font-medium text-text-muted">
          Opis za FB/IG
        </h3>
        <div
          className={cn(richTextOutputClassNames, "line-clamp-[12] text-text [&_li::marker]:text-text-muted")}
          dangerouslySetInnerHTML={{ __html: formatRichTextToHtml(product.caption) }}
        />
      </section>

      <section aria-labelledby="objava-kada" className="flex flex-col gap-2">
        <h3 id="objava-kada" className="text-[13px] font-medium text-text-muted">
          Kada
        </h3>
        <WhenPicker value={schedule} onChange={onScheduleChange} />
        {timestamp !== null ? (
          <p className={cn("text-[13px]", past ? "text-danger" : "text-text")} role={past ? "alert" : undefined}>
            {past ? "To vreme je prošlo. Izaberi kasnije vreme." : `Zakazano za ${formatDateKey(schedule.date)} u ${schedule.hour}:${schedule.minute}.`}
          </p>
        ) : null}
      </section>

      {withActions ? <ComposerActions schedule={schedule} now={now} publishing={publishing} onPublish={onPublish} /> : null}
    </div>
  );
}
