import { createClient } from "@/lib/supabase/server";
import { isActiveMarketSymbol } from "@/lib/market-intelligence/config/assets";
import {
  DEFAULT_TERMINAL_PREFERENCES,
  type UserTerminalPreferences,
} from "@/lib/market-intelligence/user/preferences-types";
import type { AlertSeverity } from "@/lib/types/market";

interface PreferenceRow {
  watchlist_symbols: string[] | null;
  telegram_enabled: boolean;
  push_enabled: boolean;
  minimum_severity: string;
  oil_alerts: boolean;
  geopolitical_alerts: boolean;
  macro_alerts: boolean;
  crypto_alerts: boolean;
  equity_alerts: boolean;
  alerts_paused: boolean;
}

function rowToPreferences(row: PreferenceRow): UserTerminalPreferences {
  const rawWatchlist =
    row.watchlist_symbols?.length
      ? row.watchlist_symbols
      : DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols;
  const watchlistSymbols = rawWatchlist.filter(isActiveMarketSymbol);
  return {
    watchlistSymbols:
      watchlistSymbols.length > 0
        ? watchlistSymbols
        : [...DEFAULT_TERMINAL_PREFERENCES.watchlistSymbols],
    telegramEnabled: row.telegram_enabled,
    pushEnabled: row.push_enabled,
    minimumSeverity: row.minimum_severity as AlertSeverity,
    oilAlerts: row.oil_alerts,
    geopoliticalAlerts: row.geopolitical_alerts,
    macroAlerts: row.macro_alerts,
    cryptoAlerts: false,
    equityAlerts: false,
    alertsPaused: row.alerts_paused,
  };
}

function preferencesToRow(prefs: UserTerminalPreferences, userId: string) {
  return {
    user_id: userId,
    watchlist_symbols: prefs.watchlistSymbols,
    telegram_enabled: prefs.telegramEnabled,
    push_enabled: prefs.pushEnabled,
    minimum_severity: prefs.minimumSeverity,
    oil_alerts: prefs.oilAlerts,
    geopolitical_alerts: prefs.geopoliticalAlerts,
    macro_alerts: prefs.macroAlerts,
    crypto_alerts: prefs.cryptoAlerts,
    equity_alerts: prefs.equityAlerts,
    alerts_paused: prefs.alertsPaused,
    updated_at: new Date().toISOString(),
  };
}

export async function getUserTerminalPreferences(userId: string): Promise<UserTerminalPreferences> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("mi_alert_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return { ...DEFAULT_TERMINAL_PREFERENCES };
    }

    return rowToPreferences(data as PreferenceRow);
  } catch {
    return { ...DEFAULT_TERMINAL_PREFERENCES };
  }
}

export async function updateUserTerminalPreferences(
  userId: string,
  patch: Partial<UserTerminalPreferences>,
): Promise<UserTerminalPreferences> {
  const current = await getUserTerminalPreferences(userId);
  const merged: UserTerminalPreferences = {
    ...current,
    ...patch,
    watchlistSymbols: patch.watchlistSymbols ?? current.watchlistSymbols,
  };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("mi_alert_preferences")
      .upsert(preferencesToRow(merged, userId), { onConflict: "user_id" });

    if (error) {
      return merged;
    }
  } catch {
    // Return merged prefs even if DB unavailable (client may cache locally)
  }

  return merged;
}
