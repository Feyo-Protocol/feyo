export interface DocsSearchEntry {
  href: string;
  title: string;
  section: string;
  summary: string;
}

/** Rank matching page titles, section headings, and short MDX summaries. */
export function searchDocs(
  entries: readonly DocsSearchEntry[],
  query: string,
  limit = 8,
): DocsSearchEntry[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || limit <= 0) return [];

  const ranked = entries.flatMap((entry, index) => {
    const title = entry.title.toLocaleLowerCase();
    const section = entry.section.toLocaleLowerCase();
    const summary = entry.summary.toLocaleLowerCase();
    const haystack = [title, section, summary].join(" ");
    if (!terms.every((term) => haystack.includes(term))) return [];

    const phrase = terms.join(" ");
    const score =
      (title === phrase ? 80 : title.includes(phrase) ? 40 : 0) +
      (section === phrase ? 70 : section.includes(phrase) ? 35 : 0) +
      (summary.includes(phrase) ? 10 : 0) +
      terms.reduce(
        (total, term) =>
          total + (title.includes(term) ? 8 : 0) + (section.includes(term) ? 6 : 0),
        0,
      );
    return [{ entry, index, score }];
  });

  return ranked
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

/** Arrow-key traversal wraps and starts at the first/last result. */
export function moveActiveIndex(
  current: number,
  direction: "next" | "previous",
  count: number,
): number {
  if (count <= 0) return -1;
  if (current < 0) return direction === "next" ? 0 : count - 1;
  return (current + (direction === "next" ? 1 : count - 1)) % count;
}
