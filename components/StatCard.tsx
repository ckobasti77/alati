import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  accent?: "default" | "green" | "red" | "blue";
  percent?: string;
  sparkline?: number[];
  trend?: "up" | "down";
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 32;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0 opacity-60">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const accentConfig: Record<
  NonNullable<StatCardProps["accent"]>,
  { borderClass?: string; glow: string; sparkColor: string }
> = {
  default: {
    glow: "hover:shadow-md",
    sparkColor: "#34d399",
  },
  green: {
    borderClass: "border-emerald-500/20",
    glow: "hover:shadow-[0_0_30px_-8px_rgba(52,211,153,0.15)]",
    sparkColor: "#34d399",
  },
  red: {
    borderClass: "border-rose-500/20",
    glow: "hover:shadow-[0_0_30px_-8px_rgba(244,63,94,0.15)]",
    sparkColor: "#fb7185",
  },
  blue: {
    borderClass: "border-violet-500/20",
    glow: "hover:shadow-[0_0_30px_-8px_rgba(139,92,246,0.15)]",
    sparkColor: "#a78bfa",
  },
};

export function StatCard({
  title,
  value,
  description,
  accent = "default",
  percent,
  sparkline,
  trend,
}: StatCardProps) {
  const config = accentConfig[accent];
  const isNegativeTrend = trend === "down" || (percent && percent.includes("↓"));

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-5 backdrop-blur-sm transition-all duration-300",
        config.borderClass,
        config.glow,
      )}
      style={{
        background: "var(--card-bg)",
        borderColor: config.borderClass ? undefined : "var(--card-border)",
        boxShadow: "var(--card-shadow)",
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {description && (
            <p className="mt-1.5 text-xs text-slate-500">{description}</p>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {sparkline && (
            <Sparkline data={sparkline} color={config.sparkColor} />
          )}
          {percent && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isNegativeTrend
                  ? "bg-rose-500/10 text-rose-400"
                  : accent === "red"
                    ? "bg-rose-500/10 text-rose-400"
                    : accent === "blue"
                      ? "bg-violet-500/10 text-violet-400"
                      : "bg-emerald-500/10 text-emerald-400",
              )}
            >
              {percent}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
