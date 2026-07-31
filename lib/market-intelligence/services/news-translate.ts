import { getAIProviderConfig } from "@/lib/market-intelligence/config/ai-config";
import { marketLogger } from "@/lib/market-intelligence/services/market-logger";

interface TranslatePair {
  title: string;
  summary: string;
}

const cache = new Map<string, TranslatePair>();
const MAX_CACHE = 500;
const inflight = new Set<string>();
let backgroundQueue: Array<{
  id: string;
  title: string;
  summary: string;
  language?: string;
}> = [];
let backgroundRunning = false;

function remember(id: string, result: TranslatePair): void {
  cache.set(id, result);
  if (cache.size > MAX_CACHE) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
}

/** Sync cache lookup — never blocks the request. */
export function getCachedTranslation(
  id: string,
): TranslatePair | null {
  return cache.get(id) ?? null;
}

/**
 * Translate headline + short summary to German via OpenAI (title/summary only).
 * Falls back to original text when no API key / failure.
 */
export async function translateNewsToGerman(
  id: string,
  input: TranslatePair,
  language?: string,
): Promise<TranslatePair & { translated: boolean }> {
  if (language === "de") {
    return { ...input, translated: false };
  }

  const cached = cache.get(id);
  if (cached) return { ...cached, translated: true };

  const config = getAIProviderConfig();
  if (!config.isConfigured || !config.apiKey) {
    return { ...input, translated: false };
  }

  if (inflight.has(id)) {
    return { ...input, translated: false };
  }
  inflight.add(id);

  try {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      Math.min(config.timeoutMs, 8_000),
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
              "Du übersetzt Nachrichten-Schlagzeilen und Kurztexte ins Deutsche. " +
              'Antworte nur als JSON: {"title":"...","summary":"..."}. ' +
              "Behalte Eigennamen (Iran, OPEC, WTI, Brent, Hormuz, Trump). Keine Erklärungen.",
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

    remember(id, result);
    return { ...result, translated: true };
  } catch (error) {
    marketLogger.warn("News translation failed", {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return { ...input, translated: false };
  } finally {
    inflight.delete(id);
  }
}

/**
 * Apply only cached translations immediately (0 network).
 * Queue the rest for background so page/flash stay fast.
 */
export function applyCachedTranslationsAndPrefetch(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
): Map<string, TranslatePair & { translated: boolean }> {
  const out = new Map<string, TranslatePair & { translated: boolean }>();
  const missing: typeof items = [];

  for (const item of items) {
    if (item.language === "de") {
      out.set(item.id, {
        title: item.title,
        summary: item.summary,
        translated: false,
      });
      continue;
    }
    const cached = cache.get(item.id);
    if (cached) {
      out.set(item.id, { ...cached, translated: true });
    } else {
      out.set(item.id, {
        title: item.title,
        summary: item.summary,
        translated: false,
      });
      missing.push(item);
    }
  }

  if (missing.length) {
    prefetchTranslationsInBackground(missing);
  }

  return out;
}

/** Fire-and-forget — fills cache for the next poll. */
export function prefetchTranslationsInBackground(
  items: Array<{
    id: string;
    title: string;
    summary: string;
    language?: string;
  }>,
): void {
  for (const item of items.slice(0, 10)) {
    if (cache.has(item.id) || inflight.has(item.id)) continue;
    if (backgroundQueue.some((q) => q.id === item.id)) continue;
    backgroundQueue.push(item);
  }
  void drainBackgroundQueue();
}

async function drainBackgroundQueue(): Promise<void> {
  if (backgroundRunning) return;
  backgroundRunning = true;
  try {
    while (backgroundQueue.length) {
      const batch = backgroundQueue.splice(0, 3);
      await Promise.all(
        batch.map((item) =>
          translateNewsToGerman(
            item.id,
            { title: item.title, summary: item.summary },
            item.language,
          ),
        ),
      );
    }
  } finally {
    backgroundRunning = false;
    if (backgroundQueue.length) void drainBackgroundQueue();
  }
}

/** @deprecated Prefer applyCachedTranslationsAndPrefetch for request path */
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
  return applyCachedTranslationsAndPrefetch(items);
}
