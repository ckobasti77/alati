"use client";

import type { OrderEntry } from "../../_hooks/useOrderEntries";
import type { useLongPress } from "../../_hooks/useLongPress";
import { MobileSkeletons } from "../list/ListSkeleton";
import { OrderCompactCard, OrderDetailCard } from "./OrderMobileCards";

/** Lista na telefonu: jedna površina od ivice do ivice, stavke odvojene linijom (gustina bez razmaka). */
export function OrderMobileList({
  entries,
  detailed,
  longPress,
  loading,
  loadingMore,
  empty,
}: {
  entries: OrderEntry[];
  detailed: boolean;
  longPress: ReturnType<typeof useLongPress>;
  loading: boolean;
  loadingMore: boolean;
  empty: React.ReactNode;
}) {
  const Card = detailed ? OrderDetailCard : OrderCompactCard;
  return (
    <div className="-mx-4 divide-y divide-border border-y border-border bg-surface">
      {loading ? (
        <MobileSkeletons count={6} detailed={detailed} />
      ) : entries.length === 0 ? (
        empty
      ) : (
        <>
          {entries.map((entry) => (
            <Card key={entry.order._id} entry={entry} longPress={longPress} />
          ))}
          {loadingMore ? <MobileSkeletons count={3} detailed={detailed} /> : null}
        </>
      )}
    </div>
  );
}
