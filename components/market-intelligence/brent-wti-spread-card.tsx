import { Card, CardContent } from "@/components/ui/card";
import { formatChange, formatPrice } from "@/lib/market-intelligence/format";
import { miDe } from "@/lib/market-intelligence/i18n/de";
import { cn } from "@/lib/utils";
import type { BrentWTISpread } from "@/lib/types/market";

interface BrentWTISpreadCardProps {
  spread: BrentWTISpread;
}

export function BrentWTISpreadCard({ spread }: BrentWTISpreadCardProps) {
  const spreadUp = spread.spreadChange > 0;

  return (
    <Card className="border-white/10 bg-[#101c29]/90 text-slate-100">
      <CardContent className="space-y-3 p-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            {miDe.brentWtiSpread}
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold">
            ${formatPrice(spread.spread, "WTI")}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-[10px] uppercase text-slate-500">BRENT</p>
            <p className="font-mono font-medium">${formatPrice(spread.brentPrice, "BRENT")}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-500">WTI</p>
            <p className="font-mono font-medium">${formatPrice(spread.wtiPrice, "WTI")}</p>
          </div>
        </div>

        <div
          className={cn(
            "rounded-lg px-3 py-2 text-center text-xs font-semibold",
            spreadUp ? "bg-emerald-900/40 text-emerald-300" : "bg-red-900/40 text-red-300",
          )}
        >
          {miDe.spread} {formatChange(spread.spreadChange)} ({formatChange(spread.spreadChangePercent, true)})
        </div>
      </CardContent>
    </Card>
  );
}
