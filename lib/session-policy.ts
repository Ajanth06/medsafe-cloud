export const REMEMBER_ME_STORAGE_KEY = "medsafe_remember_me";
export const REMEMBER_ME_EXPIRES_KEY = "medsafe_remember_expires";

export const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const INACTIVITY_WARNING_MS = 60 * 1000;
export const REMEMBER_ME_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export function setRememberMe(enabled: boolean) {
  if (typeof window === "undefined") return;

  if (enabled) {
    localStorage.setItem(REMEMBER_ME_STORAGE_KEY, "true");
    localStorage.setItem(
      REMEMBER_ME_EXPIRES_KEY,
      String(Date.now() + REMEMBER_ME_DURATION_MS),
    );
    return;
  }

  localStorage.removeItem(REMEMBER_ME_STORAGE_KEY);
  localStorage.removeItem(REMEMBER_ME_EXPIRES_KEY);
}

export function readRememberMeFromCheckbox() {
  if (typeof document === "undefined") return false;

  const checkbox = document.getElementById("medsafe-remember-me");
  if (!(checkbox instanceof HTMLInputElement)) return false;

  return checkbox.checked;
}

export function shouldSkipInactivityLogout() {
  if (typeof window === "undefined") return false;

  if (localStorage.getItem(REMEMBER_ME_STORAGE_KEY) !== "true") {
    return false;
  }

  const expiresAt = localStorage.getItem(REMEMBER_ME_EXPIRES_KEY);
  if (!expiresAt) return true;

  if (Date.now() > Number(expiresAt)) {
    setRememberMe(false);
    return false;
  }

  return true;
}
