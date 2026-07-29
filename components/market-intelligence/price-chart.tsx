import { cn } from "@/lib/utils";

interface PriceChartProps {
  data: number[];
  positive?: boolean;
  height?: number;
  className?: string;
  label?: string;
}

export function PriceChart({
  data,
  positive = true,
  height = 120,
  className,
  label,
}: PriceChartProps) {
  if (data.length < 2) {
    return (
      <div
        className={cn("flex items-center justify-center rounded-lg bg-slate-800/40 text-xs text-slate-500", className)}
        style={{ height }}
      >
        Insufficient history
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 400;
  const pad = 4;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - pad - ((value - min) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className={cn("relative", className)}>
      {label && (
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
        <polygon
          points={areaPoints}
          fill={positive ? "rgba(22, 163, 74, 0.15)" : "rgba(220, 38, 38, 0.15)"}
        />
        <polyline
          points={points}
          fill="none"
          stroke={positive ? "#22c55e" : "#ef4444"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}
