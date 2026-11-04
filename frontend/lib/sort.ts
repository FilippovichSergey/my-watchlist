import type { Entry } from "./types";

export const SORT_KEYS = ["my", "newest", "year", "title", "tmdb"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const DEFAULT_SORT: SortKey = "my";

export const toSortKey = (value: string): SortKey =>
  (SORT_KEYS as readonly string[]).includes(value) ? (value as SortKey) : DEFAULT_SORT;

/**
 * Default order of the public list: the owner's rating, highest first; titles without a rating
 * come after the rated ones. Ties keep the backend order (newest first) — sort() is stable.
 */
export function byMyRatingDesc(a: Pick<Entry, "myRating">, b: Pick<Entry, "myRating">): number {
  return (b.myRating ?? -1) - (a.myRating ?? -1);
}

type Sortable = Pick<Entry, "myRating" | "createdAt" | "releaseYear" | "title" | "tmdbRating">;

/** A sorted copy; `titleOf` supplies the title as displayed (the Belarusian one in that UI). */
export function sortEntries<T extends Sortable>(entries: T[], sort: SortKey, locale: string, titleOf: (e: T) => string = (e) => e.title): T[] {
  const list = [...entries];
  switch (sort) {
    case "newest":
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case "year":
      return list.sort((a, b) => (b.releaseYear ?? -1) - (a.releaseYear ?? -1));
    case "title":
      return list.sort((a, b) => titleOf(a).localeCompare(titleOf(b), locale));
    case "tmdb":
      return list.sort((a, b) => (b.tmdbRating ?? -1) - (a.tmdbRating ?? -1));
    default:
      return list.sort(byMyRatingDesc);
  }
}
