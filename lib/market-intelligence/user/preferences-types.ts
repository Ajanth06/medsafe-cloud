import type { AlertSeverity } from "@/lib/types/market";
import { ACTIVE_MARKET_SYMBOLS } from "@/lib/market-intelligence/config/assets";

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

export const DEFAULT_WATCHLIST = [...ACTIVE_MARKET_SYMBOLS] as const;

export const DEFAULT_TERMINAL_PREFERENCES: UserTerminalPreferences = {
  watchlistSymbols: [...DEFAULT_WATCHLIST],
  telegramEnabled: false,
  pushEnabled: false,
  minimumSeverity: "MEDIUM",
  oilAlerts: true,
  geopoliticalAlerts: true,
  macroAlerts: true,
  cryptoAlerts: false,
  equityAlerts: false,
  alertsPaused: false,
};
