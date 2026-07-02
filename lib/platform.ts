/**
 * Detects Apple platforms from the User-Agent string.
 * Used server-side to conditionally show "Continue with Apple".
 */
export function isAppleDevice(userAgent: string): boolean {
  return /iPhone|iPad|iPod|Macintosh|Mac OS X/i.test(userAgent);
}
