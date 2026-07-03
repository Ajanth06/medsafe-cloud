interface RememberMeCheckboxProps {
  id?: string;
}

export function RememberMeCheckbox({ id = "medsafe-remember-me" }: RememberMeCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl border border-border bg-card/60 px-4 py-3">
      <input
        id={id}
        name="remember"
        type="checkbox"
        defaultChecked={false}
        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-2 focus:ring-primary/20 focus:ring-offset-0"
      />
      <span className="text-sm leading-relaxed text-muted">
        <span className="font-medium text-foreground">Angemeldet bleiben</span>
        <span className="block text-xs">Nur auf privaten Geräten empfohlen.</span>
      </span>
    </label>
  );
}
