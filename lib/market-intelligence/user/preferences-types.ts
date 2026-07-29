import type { AlertSeverity } from "@/lib/types/market";

export interface UserTerminalPreferences {
  watchlistSymbols: string[];
  telegramEnabled: boolean;
  pushEnabled: boolean;
  minimumSeverity: AlertSeverity;
  oilAlerts: boolean;
  geopoliticalAlerts: boolean;
  macroAlerts: boolean;
  cryptoAlerts: boolean;
  equityAlerts: boolean;
  alertsPaused: boolean;
}

export const DEFAULT_WATCHLIST = ["WTI", "BRENT", "GOLD", "SPX", "BTC"] as const;

export const DEFAULT_TERMINAL_PREFERENCES: UserTerminalPreferences = {
  watchlistSymbols: [...DEFAULT_WATCHLIST],
  telegramEnabled: false,
  pushEnabled: false,
  minimumSeverity: "HIGH",
  oilAlerts: true,
  geopoliticalAlerts: true,
  macroAlerts: true,
  cryptoAlerts: true,
  equityAlerts: true,
  alertsPaused: false,
};
