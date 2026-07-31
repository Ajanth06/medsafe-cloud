/** Decode common HTML entities that leak from RSS into the UI (e.g. &nbsp;). */
export function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  let out = text;
  for (let i = 0; i < 2; i++) {
    out = out
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#x0*a0;/gi, " ")
      .replace(/&#0*160;/g, " ")
      .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
        const code = Number.parseInt(hex, 16);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      })
      .replace(/&#(\d+);/g, (_, dec: string) => {
        const code = Number.parseInt(dec, 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : "";
      });
  }
  return out.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
