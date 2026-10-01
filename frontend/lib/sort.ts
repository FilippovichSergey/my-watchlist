import type { Entry } from "./types";

/**
 * Default order of the public list: the owner's rating, highest first; titles without a rating
 * come after the rated ones. Ties keep the backend order (newest first) — sort() is stable.
 */
export function byMyRatingDesc(a: Pick<Entry, "myRating">, b: Pick<Entry, "myRating">): number {
  return (b.myRating ?? -1) - (a.myRating ?? -1);
}
