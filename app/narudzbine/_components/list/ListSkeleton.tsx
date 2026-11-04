import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { OrdersDensity } from "../../_lib/orderView";

/** Redovi tabele u obliku pravih (status, sličica + naslov, iznosi). */
export function TableSkeletonRows({ columns, density, rows }: { columns: number; density: OrdersDensity; rows: number }) {
  const comfy = density === "udobno";
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden className={cn(comfy ? "h-[88px]" : "h-16", "[&>td]:shadow-[inset_0_-1px_0_var(--color-border)]")}>
          <td className="pl-6">
            <Skeleton className="size-4" />
          </td>
          <td className="px-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="mt-1.5 h-3 w-12" />
          </td>
          <td className="px-2">
            <div className="flex items-center gap-3">
              <Skeleton className={cn("shrink-0 rounded-lg", comfy ? "size-14" : "size-10")} />
              <Skeleton className="h-3.5 w-3/4" />
            </div>
          </td>
          {Array.from({ length: Math.max(columns - 3, 0) }, (_, cell) => (
            <td key={cell} className="px-2">
              {cell < columns - 4 ? <Skeleton className="ml-auto h-3.5 w-14" /> : null}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Kartice na desktopu. */
export function CardSkeletons({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden className="flex h-[236px] flex-col gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="size-12 shrink-0 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="mt-auto h-10 w-full" />
        </div>
      ))}
    </>
  );
}

/** Kompaktne/detaljne kartice na telefonu. */
export function MobileSkeletons({ count, detailed }: { count: number; detailed: boolean }) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} aria-hidden className={cn("flex flex-col gap-2 px-4 py-3", detailed ? "h-[236px]" : "h-[110px]")}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      ))}
    </>
  );
}
