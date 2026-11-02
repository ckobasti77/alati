import { cn } from "@/lib/utils";

/** Mesto za sadržaj koji se učitava. Dimenzije zadaj kao kod pravog sadržaja (bez skoka layout-a). */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton rounded-md", className)} {...props} />;
}
