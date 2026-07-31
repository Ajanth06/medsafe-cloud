import { getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";
import type { AppLocale } from "@/lib/i18n/locales";

interface TranslatePair {
  title: string;
  summary: string;
}

type CacheStore = Map<string, TranslatePair>;

function getCache(): CacheStore {
  const g = globalThis as { __aaryxNewsTxCache?: CacheStore };
  if (!g.__aaryxNewsTxCache) g.__aaryxNewsTxCache = new Map();
  return g.__aaryxNewsTxCache;
}

function getInflight(): Set<string> {
  const g = globalThis as { __aaryxNewsTxInflight?: Set<string> };
  if (!g.__aaryxNewsTxInflight) g.__aaryxNewsTxInflight = new Set();
  return g.__aaryxNewsTxInflight;
}

function getBackgroundState(): {
  queue: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
    target: AppLocale;
  }>;
  running: boolean;
} {
  const g = globalThis as {
    __aaryxNewsTxBg?: {
      queue: Array<{
        id: string;
        title: string;
        summary: string;
        language?: string;
        target: AppLocale;
      }>;
      running: boolean;
    };
  };
  if (!g.__aaryxNewsTxBg) {
    g.__aaryxNewsTxBg = { queue: [], running: false };
  }
  return g.__aaryxNewsTxBg;
}

const MAX_CACHE = 1_200;

const TARGET_NAME: Record<AppLocale, string> = {
  de: "German",
  en: "English",
  ta: "Tamil",
};

function contentKey(title: string, summary: string, target: AppLocale): string {
  return `${target}:t:${title.trim().toLowerCase().slice(0, 140)}|${summary.trim().toLowerCase().slice(0, 80)}`;
}

function cacheId(id: string, target: AppLocale): string {
  return `${target}:${id}`;
}

function remember(
  id: string,
  target: AppLocale,
  result: TranslatePair,
  title?: string,
  summary?: string,
): void {
  const cache = getCache();
  cache.set(cacheId(id, target), result);
  if (title) cache.set(contentKey(title, summary ?? "", target), result);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

function lookup(
  id: string,
  title: string,
  summary: string,
  target: AppLocale,
): TranslatePair | null {
  const cache = getCache();
  return (
    cache.get(cacheId(id, target)) ??
    cache.get(contentKey(title, summary, target)) ??
    null
  );
}

export function getCachedTranslation(id: string): TranslatePair | null {
  return getCache().get(cacheId(id, "de")) ?? null;
}

function looksGerman(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /[äöüß]/.test(t) ||
    /\b(und|der|die|das|mit|nach|über|gegen|sagt|wird|sind|eine|einen|nicht|auch|wegen|zwischen)\b/.test(
      t,
    )
  );
}

function looksEnglish(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.trim()) return false;
  if (/[äöüß]/.test(t)) return false;
  return (
    /\b(the|and|with|from|after|says|said|will|have|been|against|into|over|under|strike|attack|sanctions|oil|iran|trump|israel|gaza|middle|east)\b/.test(
      t,
    ) ||
    (/^[a-z0-9\s:'".,!?\-–—/()]+$/i.test(text.trim()) &&
      text.trim().split(/\s+/).length >= 5)
  );
}

function looksTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

export function needsLocaleTranslation(
  item: { title: string; summary?: string; language?: string },
  target: AppLocale,
): boolean {
  const title = item.title?.trim() ?? "";
  if (!title) return false;

  if (target === "de") {
    if (
      item.language === "de" &&
      (looksGerman(title) || /[äöüßÄÖÜ]/.test(title))
    ) {
      return false;
    }
    if (item.language && item.language !== "de") return true;
    return looksEnglish(title) || looksEnglish(item.summary ?? "");
  }

  if (target === "en") {
    if (looksTamil(title) || looksGerman(title)) return true;
    if (item.language && item.language !== "en" && item.language !== "und") {
      return true;
    }
    if (looksEnglish(title) && !looksGerman(title) && !looksTamil(title)) {
      return false;
    }
    return !looksEnglish(title);
  }

  if (looksTamil(title)) return false;
  return true;
}

export function needsGermanTranslation(item: {
  title: string;
  summary?: string;
  language?: string;
}): boolean {
  return needsLocaleTranslation(item, "de");
}

export async function translateNewsToLocale(
  id: string,
  input: TranslatePair,
  target: AppLocale,
  language?: string,
): Promise<TranslatePair & { translated: boolean }> {
  if (!needsLocaleTranslation({ ...input, language }, target)) {
    return { ...input, translated: false };
  }

  const cached = lookup(id, input.title, input.summary, target);
  if (cached) return { ...cached, translated: true };

  const config = getAIProviderConfig();
  if (!config.isConfigured || !config.apiKey) {
    return { ...input, translated: false };
  }

  const inflightKey = cacheId(id, target);
  const inflight = getInflight();
  if (inflight.has(inflightKey)) {
    const waited = await waitForCache(
      id,
      input.title,
      input.summary,
      target,
      2_400,
    );
    if (waited) return { ...waited, translated: true };
    return { ...input, translated: false };
  }
  inflight.add(inflightKey);

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(config.timeoutMs, 9_000),
    );

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You translate news headlines and short summaries into ${TARGET_NAME[target]}. ` +
              'Reply only as JSON: {"title":"...","summary":"..."}. ' +
              "Keep proper nouns (Iran, OPEC, WTI, Brent, Hormuz, Trump, Tehran, IRGC, BBC, AARYX). " +
              "Natural news style. Do not leave the text in the source language.",
          },
          {
            role: "user",
            content: JSON.stringify({
              title: input.title.slice(0, 220),
              summary: input.summary.slice(0, 280),
            }),
          },
        ],
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      throw new Error(`OpenAI translate HTTP ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw) as { title?: string; summary?: string };
    const result: TranslatePair = {
      title: (parsed.title ?? input.title).slice(0, 220),
      summary: (parsed.summary ?? input.summary).slice(0, 280),
    };

    remember(id, target, result, input.title, input.summary);
    return { ...result, translated: true };
  } catch (error) {
    marketLogger.warn("News translation failed", {
      id,
      target,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...input, translated: false };
  } finally {
    inflight.delete(inflightKey);
  }
}

export async function translateNewsToGerman(
  id: string,
  input: TranslatePair,
  language?: string,
): Promise<TranslatePair & { translated: boolean }> {
  return translateNewsToLocale(id, input, "de", language);
}

async function waitForCache(
  id: string,
  title: string,
  summary: string,
  target: AppLocale,
  maxMs: number,
): Promise<TranslatePair | null> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const hit = lookup(id, title, summary, target);
    if (hit) return hit;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

export function applyCachedTranslationsAndPrefetch(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
  target: AppLocale = "de",
): Map<string, TranslatePair & { translated: boolean }> {
  const out = new Map<string, TranslatePair & { translated: boolean }>();
  const missing: Array<(typeof items)[number] & { target: AppLocale }> = [];

  for (const item of items) {
    if (!needsLocaleTranslation(item, target)) {
      out.set(item.id, {
        title: item.title,
        summary: item.summary,
        translated: false,
      });
      continue;
    }
    const cached = lookup(item.id, item.title, item.summary, target);
    if (cached) {
      out.set(item.id, { ...cached, translated: true });
    } else {
      out.set(item.id, {
        title: item.title,
        summary: item.summary,
        translated: false,
      });
      missing.push({ ...item, target });
    }
  }

  if (missing.length) {
    prefetchTranslationsInBackground(missing);
  }

  return out;
}

export async function ensureNewsTranslations(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
  opts?: { maxAwaitMs?: number; maxItems?: number; target?: AppLocale },
): Promise<Map<string, TranslatePair & { translated: boolean }>> {
  const target = opts?.target ?? "de";
  const maxAwaitMs = opts?.maxAwaitMs ?? 4_500;
  const maxItems = opts?.maxItems ?? 18;
  const out = applyCachedTranslationsAndPrefetch(items, target);

  const pending = items
    .filter(
      (item) =>
        needsLocaleTranslation(item, target) &&
        !lookup(item.id, item.title, item.summary, target),
    )
    .slice(0, maxItems);

  if (!pending.length) return out;

  const config = getAIProviderConfig();
  if (!config.isConfigured || !config.apiKey) {
    marketLogger.warn("News translation skipped — no OpenAI key");
    return out;
  }

  await Promise.race([
    Promise.all(
      pending.map(async (item) => {
        const result = await translateNewsToLocale(
          item.id,
          { title: item.title, summary: item.summary },
          target,
          item.language,
        );
        out.set(item.id, result);
      }),
    ),
    new Promise<void>((resolve) => {
      setTimeout(resolve, maxAwaitMs);
    }),
  ]);

  for (const item of items) {
    const cached = lookup(item.id, item.title, item.summary, target);
    if (cached) out.set(item.id, { ...cached, translated: true });
  }

  prefetchTranslationsInBackground(
    items
      .filter(
        (i) =>
          needsLocaleTranslation(i, target) &&
          !lookup(i.id, i.title, i.summary, target),
      )
      .map((i) => ({ ...i, target })),
  );

  return out;
}

export async function ensureGermanTranslations(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
  opts?: { maxAwaitMs?: number; maxItems?: number },
): Promise<Map<string, TranslatePair & { translated: boolean }>> {
  return ensureNewsTranslations(items, { ...opts, target: "de" });
}

export function prefetchTranslationsInBackground(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
    target?: AppLocale;
  }>,
): void {
  const bg = getBackgroundState();
  for (const item of items.slice(0, 24)) {
    const target = item.target ?? "de";
    if (!needsLocaleTranslation(item, target)) continue;
    if (lookup(item.id, item.title, item.summary, target)) continue;
    if (getInflight().has(cacheId(item.id, target))) continue;
    if (bg.queue.some((q) => q.id === item.id && q.target === target)) continue;
    bg.queue.push({ ...item, target });
  }
  void drainBackgroundQueue();
}

async function drainBackgroundQueue(): Promise<void> {
  const bg = getBackgroundState();
  if (bg.running) return;
  bg.running = true;
  try {
    while (bg.queue.length) {
      const batch = bg.queue.splice(0, 4);
      await Promise.all(
        batch.map((item) =>
          translateNewsToLocale(
            item.id,
            { title: item.title, summary: item.summary },
            item.target,
            item.language,
          ),
        ),
      );
    }
  } finally {
    bg.running = false;
    if (bg.queue.length) void drainBackgroundQueue();
  }
}

export async function translateNewsBatch(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
  concurrency = 3,
): Promise<Map<string, TranslatePair & { translated: boolean }>> {
  void concurrency;
  return ensureNewsTranslations(items, { maxAwaitMs: 4_500, maxItems: 18 });
}
