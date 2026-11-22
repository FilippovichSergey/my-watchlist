import type { Entry } from "./types";
import { parseRatingRange, type FilterValues } from "./filters";

/** What the list page needs of an entry: the card's facts and the fields the filters look at. */
export type ListEntry = Pick<
  Entry,
  | "id"
  | "title"
  | "originalTitle"
  | "titleBe"
  | "category"
  | "releaseYear"
  | "countries"
  | "genreIds"
  | "cast"
  | "posterUrl"
  | "tmdbRating"
  | "myRating"
  | "createdAt"
>;

/** Drops the long texts (overviews, feedback): the whole list travels to the browser, where it is filtered. */
export function toListEntry(e: Entry): ListEntry {
  return {
    id: e.id,
    title: e.title,
    originalTitle: e.originalTitle,
    titleBe: e.titleBe,
    category: e.category,
    releaseYear: e.releaseYear,
    countries: e.countries,
    genreIds: e.genreIds,
    cast: e.cast,
    posterUrl: e.posterUrl,
    tmdbRating: e.tmdbRating,
    myRating: e.myRating,
    createdAt: e.createdAt,
  };
}

function num(s: string): number | null {
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : null;
}

/** The entries that pass every filter; an unreadable number or rating range simply does not filter. */
export function filterEntries<T extends ListEntry>(entries: T[], values: FilterValues): T[] {
  const year = num(values.year);
  const genre = num(values.genre);
  const rating = num(values.rating);
  const my = parseRatingRange(values.my);
  const actor = values.actor.trim().toLowerCase();
  const q = values.q.trim().toLowerCase();
  return entries.filter(
    (e) =>
      (!values.category || values.category === "ALL" || e.category === values.category) &&
      (!q ||
        e.title.toLowerCase().includes(q) ||
        (e.originalTitle ?? "").toLowerCase().includes(q) ||
        (e.titleBe ?? "").toLowerCase().includes(q)) &&
      (year === null || e.releaseYear === year) &&
      (!values.country || e.countries.includes(values.country)) &&
      (genre === null || e.genreIds.includes(genre)) &&
      (!actor || e.cast.some((name) => name.toLowerCase().includes(actor))) &&
      (rating === null || (e.tmdbRating ?? 0) >= rating) &&
      (my === null || (e.myRating != null && e.myRating >= my.min && e.myRating <= my.max))
  );
}
