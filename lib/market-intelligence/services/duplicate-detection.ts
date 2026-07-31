function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(normalizeTitle(a).split(" "));
  const wordsB = new Set(normalizeTitle(b).split(" "));
  const intersection = [...wordsA].filter((w) => wordsB.has(w) && w.length > 3);
  const union = new Set([...wordsA, ...wordsB]);
  return union.size > 0 ? intersection.length / union.size : 0;
}

export interface DeduplicableItem {
  id: string;
  title: string;
}

export function deduplicateByTitle<T extends DeduplicableItem>(
  items: T[],
  similarityThreshold = 0.6,
): T[] {
  const result: T[] = [];

  for (const item of items) {
    const isDuplicate = result.some(
      (existing) => titleSimilarity(existing.title, item.title) >= similarityThreshold,
    );
    if (!isDuplicate) {
      result.push(item);
    }
  }

  return result;
}

export function mergeIntoIntelligenceEvent<T extends DeduplicableItem>(
  items: T[],
  buildEvent: (primary: T, duplicates: T[]) => { id: string; title: string; sourceCount: number },
): ReturnType<typeof buildEvent>[] {
  const groups: T[][] = [];
  const used = new Set<string>();

  for (const item of items) {
    if (used.has(item.id)) continue;

    const group = [item];
    used.add(item.id);

    for (const other of items) {
      if (used.has(other.id)) continue;
      if (titleSimilarity(item.title, other.title) >= 0.6) {
        group.push(other);
        used.add(other.id);
      }
    }

    groups.push(group);
  }

  return groups.map((group) => buildEvent(group[0], group.slice(1)));
}
