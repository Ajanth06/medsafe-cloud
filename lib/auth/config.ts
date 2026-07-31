/** When false, /signup and new account creation are blocked (login-only mode). */
export function isSignupEnabled(): boolean {
  return process.env.SIGNUP_ENABLED === "true";
}

/** OAuth sign-in for returning users — shown even when signup is closed. */
export function isOAuthLoginEnabled(): boolean {
  return process.env.OAUTH_LOGIN_ENABLED !== "false";
}

/**
 * Temporary open access: guest button + allow new Google accounts
 * even when email signup is closed. Set OPEN_ACCESS_ENABLED=false to lock again.
 */
export function isOpenAccessEnabled(): boolean {
  return process.env.OPEN_ACCESS_ENABLED !== "false";
}

/** New OAuth accounts allowed while open access is on, or when signup is enabled. */
export function isOAuthSignupAllowed(): boolean {
  return isSignupEnabled() || isOpenAccessEnabled();
}

export function getGuestCredentials(): { email: string; password: string } | null {
  if (!isOpenAccessEnabled()) return null;
  const email = process.env.GUEST_EMAIL?.trim() || "guest@aaryx.app";
  const password = process.env.GUEST_PASSWORD?.trim() || "aaryx-guest-open";
  return { email, password };
}

/** Accounts created within this window after OAuth are treated as new signups. */
export const NEW_OAUTH_ACCOUNT_WINDOW_MS = 2 * 60 * 1000;

export function isLikelyNewOAuthAccount(
  createdAt: string,
  lastSignInAt: string | null | undefined,
): boolean {
  const created = new Date(createdAt).getTime();
  if (Date.now() - created > NEW_OAUTH_ACCOUNT_WINDOW_MS) {
    return false;
  }

  if (!lastSignInAt) {
    return true;
  }

  const lastSignIn = new Date(lastSignInAt).getTime();
  return Math.abs(lastSignIn - created) < 10_000;
}
