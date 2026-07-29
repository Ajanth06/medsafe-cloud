export function formatPrice(price: number, symbol: string): string {
  if (symbol === "EURUSD") return price.toFixed(4);
  if (symbol === "BTC") return price.toLocaleString("de-DE", { maximumFractionDigits: 0 });
  if (price >= 1000) {
    return price.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatChange(value: number, isPercent = false): string {
  const sign = value > 0 ? "+" : "";
  if (isPercent) return `${sign}${value.toFixed(2)}%`;
  return `${sign}${value.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  });
}
