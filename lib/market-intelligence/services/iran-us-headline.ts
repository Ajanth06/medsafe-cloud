import {
  classifyIranUsSide,
  isIranUsText,
  type IranUsSide,
} from "@/lib/market-intelligence/config/oil-rss-feeds";
import type { NewsEvent } from "@/lib/types/market";

export interface IranUsHeadline {
  id: string;
  title: string;
  summary: string;
  url?: string;
  timestamp: string;
  source: string;
  ageLabel: string;
  side: IranUsSide;
}

export interface IranUsBoard {
  trump: IranUsHeadline[];
  iran: IranUsHeadline[];
  latest: IranUsHeadline | null;
}

function ageLabel(iso: string): string {
  const mins = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 60_000),
  );
  if (mins < 1) return "gerade eben";
  if (mins < 60) return `vor ${mins} Min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std`;
  return `vor ${Math.round(hrs / 24)} T`;
}

function toHeadline(event: NewsEvent, side: IranUsSide): IranUsHeadline {
  return {
    id: event.id,
    title: event.title,
    summary: event.summary,
    url: event.url,
    timestamp: event.timestamp,
    source: event.sourceVerification.sources[0] ?? "News",
    ageLabel: ageLabel(event.timestamp),
    side,
  };
}

function isTrumpIranLoose(text: string): boolean {
  const lower = text.toLowerCase();
  if (isIranUsText(text)) return true;
  if (/\btrump\b/.test(lower) && /iran|teheran|tehran|hormuz/.test(lower)) {
    return true;
  }
  // Iran statements / reactions in the US conflict context
  if (
    /iran|teheran|khamenei|irgc/.test(lower) &&
    /(trump|usa|amerikan|u\.s\.|vergeltung|reagiert|droht|pentagon)/.test(lower)
  ) {
    return true;
  }
  return false;
}

/** Latest Iran ↔ USA headline for the live header strip. */
export function pickLatestIranUsNews(
  events: NewsEvent[],
): IranUsHeadline | null {
  return buildIranUsBoard(events).latest;
}

/**
 * Split board: what Trump/USA says vs what Iran says (latest first).
 */
export function buildIranUsBoard(
  events: NewsEvent[],
  limitPerSide = 6,
): IranUsBoard {
  const matches = events
    .filter((e) => isTrumpIranLoose(`${e.title} ${e.summary}`))
    .map((e) => {
      const side =
        classifyIranUsSide(`${e.title} ${e.summary}`) ?? ("both" as IranUsSide);
      return { event: e, side };
    })
    .sort(
      (a, b) =>
        new Date(b.event.timestamp).getTime() -
        new Date(a.event.timestamp).getTime(),
    );

  const trump: IranUsHeadline[] = [];
  const iran: IranUsHeadline[] = [];
  const seen = new Set<string>();

  for (const m of matches) {
    const key = m.event.title.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);

    const headline = toHeadline(m.event, m.side);
    if (m.side === "iran") {
      if (iran.length < limitPerSide) iran.push(headline);
    } else if (m.side === "trump") {
      if (trump.length < limitPerSide) trump.push(headline);
    } else {
      // "both" — put US-attack framing under Trump, Iran-reaction under Iran
      const t = `${m.event.title} ${m.event.summary}`.toLowerCase();
      if (
        /(reagiert|vergeltung|rache|khamenei|irgc)/.test(t) &&
        iran.length < limitPerSide
      ) {
        iran.push(headline);
      } else if (trump.length < limitPerSide) {
        trump.push(headline);
      } else if (iran.length < limitPerSide) {
        iran.push(headline);
      }
    }
  }

  const latest = matches[0]
    ? toHeadline(matches[0].event, matches[0].side)
    : null;

  return { trump, iran, latest };
}
