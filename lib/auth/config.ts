/** When false, /signup and new account creation are blocked (login-only mode). */
export function isSignupEnabled(): boolean {
  return process.env.SIGNUP_ENABLED === "true";
}

/** OAuth sign-in for returning users — shown even when signup is closed. */
export function isOAuthLoginEnabled(): boolean {
  return process.env.OAUTH_LOGIN_ENABLED !== "false";
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
