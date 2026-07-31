"use client";

import { useMi } from "@/components/i18n/locale-provider";

export default function MarketIntelligenceLoading() {
  const t = useMi();

  return (
    <main className="mx-auto max-w-[1500px] space-y-4 px-3 py-3 md:px-6 md:py-6 lg:px-8">
      <div className="h-24 animate-pulse rounded-[1.25rem] border border-white/10 bg-white/[0.06]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17.5rem]">
        <div className="space-y-3">
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          <div className="h-56 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
          <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05]" />
        </div>
        <div className="hidden h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.05] xl:block" />
      </div>
      <p className="text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
        {t.loadingOil}
      </p>
    </main>
  );
}
