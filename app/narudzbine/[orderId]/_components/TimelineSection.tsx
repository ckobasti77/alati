import { formatDateTime } from "@/lib/format";
import { getStage } from "@/lib/stages";
import { cn } from "@/lib/utils";
import type { OrderWithProduct } from "@/types/order";
import { getOrderEventDetail, getOrderEventTitle } from "../_lib/detailHelpers";
import { DetailSection } from "./DetailSection";

/** Tok narudžbine (istorija statusa i povrata), najnovije gore. */
export function TimelineSection({ order, className }: { order: OrderWithProduct; className?: string }) {
  const events = [...(order.history ?? [])].reverse();
  return (
    <DetailSection id="tok" title="Tok" count={events.length || undefined} className={className}>
      {events.length === 0 ? (
        <p className="py-2 text-sm text-text-muted">Nema zabeleženih promena.</p>
      ) : (
        <ol className="relative mt-1">
          {events.map((event, index) => {
            const detail = getOrderEventDetail(event);
            const dot = event.type === "povrat" ? "bg-success" : getStage(event.stage).dotClass;
            return (
              <li key={event._id} className="relative flex gap-3 pb-4 last:pb-0">
                {index < events.length - 1 ? <span aria-hidden className="absolute top-4 bottom-0 left-[5px] w-px bg-border" /> : null}
                <span aria-hidden className={cn("relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface", dot)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text">{getOrderEventTitle(event)}</p>
                  {detail ? <p className="num text-[13px] text-text-muted">{detail}</p> : null}
                  <p className="text-xs text-text-muted">
                    <time dateTime={new Date(event.createdAt).toISOString()}>{formatDateTime(event.createdAt)}</time>
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </DetailSection>
  );
}
