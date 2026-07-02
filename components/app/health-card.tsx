import { Card, CardContent } from "@/components/ui/card";
import type { HealthStats } from "@/lib/types/health";

interface HealthCardProps {
  name: string;
  stats: HealthStats;
}

export function HealthCard({ name, stats }: HealthCardProps) {
  const items = [
    { value: stats.documents, label: "Dokumente" },
    { value: stats.medications, label: "Medikamente" },
    { value: stats.visits, label: "Arztbesuche" },
    { value: stats.therapies, label: "aktive Therapien" },
  ];

  return (
    <Card className="overflow-hidden border-0 bg-gradient-to-br from-[#1D4ED8] via-[#2563EB] to-[#3B82F6] text-white shadow-[0_12px_40px_rgba(37,99,235,0.25)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-blue-100">Gesundheitskarte</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{name}</h2>
          </div>
          <div className="rounded-xl bg-white/15 px-3 py-1.5 text-xs text-blue-50 backdrop-blur-sm">
            Letztes Update: {stats.lastUpdate}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {items.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm"
            >
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="mt-0.5 text-xs text-blue-100">{stat.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
