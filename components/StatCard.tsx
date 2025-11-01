import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  accent?: "default" | "green" | "red" | "blue";
}

const accentClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "border-slate-200",
  green: "border-emerald-200",
  red: "border-red-200",
  blue: "border-blue-200",
};

export function StatCard({
  title,
  value,
  description,
  accent = "default",
}: StatCardProps) {
  return (
    <Card className={cn("border-2 bg-white", accentClasses[accent])}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-semibold text-slate-900">{value}</div>
        {description ? (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
