import { cn } from "@/lib/utils";

interface SparklineProps {
  data: number[];
  positive: boolean;
  className?: string;
}

export function Sparkline({ data, positive, className }: SparklineProps) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 28;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-7 w-20", className)}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#16a34a" : "#dc2626"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.8}
      />
    </svg>
  );
}
