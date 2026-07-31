"use client";

import { useMi } from "@/components/i18n/locale-provider";

interface RememberMeCheckboxProps {
  id?: string;
}

export function RememberMeCheckbox({ id = "medsafe-remember-me" }: RememberMeCheckboxProps) {
  const t = useMi();
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <input
        id={id}
        name="remember"
        type="checkbox"
        defaultChecked={false}
        className="mt-0.5 h-4 w-4 rounded border-white/20 bg-transparent text-orange-500 focus:ring-2 focus:ring-orange-400/25 focus:ring-offset-0"
      />
      <span className="text-sm leading-relaxed text-slate-400">
        <span className="font-medium text-slate-100">{t.staySignedIn}</span>
        <span className="block text-xs text-slate-500">
          {t.staySignedInHint}
        </span>
      </span>
    </label>
  );
}
