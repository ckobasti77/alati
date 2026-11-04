"use client";

import type { OrderEntry } from "../../_hooks/useOrderEntries";
import { CardSkeletons } from "../list/ListSkeleton";
import { OrderCard } from "./OrderCard";

/** Prikaz Kartice na desktopu: 2/3/4 kolone. */
export function OrderCardGrid({
  entries,
  loading,
  loadingMore,
  empty,
}: {
  entries: OrderEntry[];
  loading: boolean;
  loadingMore: boolean;
  empty: React.ReactNode;
}) {
  if (!loading && entries.length === 0) {
    return <div className="rounded-2xl bg-surface ring-1 ring-border">{empty}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {loading ? (
        <CardSkeletons count={8} />
      ) : (
        <>
          {entries.map((entry) => (
            <OrderCard key={entry.order._id} entry={entry} />
          ))}
          {loadingMore ? <CardSkeletons count={4} /> : null}
        </>
      )}
    </div>
  );
}
