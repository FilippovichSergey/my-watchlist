export interface FilterValues {
  category: string;
  year: string;
  country: string;
  genre: string;
  actor: string;
  rating: string;
  my: string;
  /** Title search. */
  q: string;
  /** Sort order; empty means the default (own rating). */
  sort: string;
}

export interface FilterOptions {
  years: number[];
  countries: { code: string; name: string }[];
  genres: { id: number; name: string }[];
}

export const EMPTY_FILTERS: FilterValues = { category: "", year: "", country: "", genre: "", actor: "", rating: "", my: "", q: "", sort: "" };

export const FILTER_KEYS = Object.keys(EMPTY_FILTERS) as (keyof FilterValues)[];

/** Reads every filter from a URL-ish source; missing values become "". */
export function filtersFrom(get: (key: keyof FilterValues) => string | null | undefined): FilterValues {
  const values = { ...EMPTY_FILTERS };
  for (const key of FILTER_KEYS) values[key] = get(key) ?? "";
  return values;
}

/** The narrowing filters only — category and search are shown elsewhere. */
export const NARROWING_KEYS: (keyof FilterValues)[] = ["year", "country", "genre", "actor", "rating", "my"];

export const activeFilterCount = (values: FilterValues) => NARROWING_KEYS.filter((k) => values[k]).length;

/** True when the Reset button should show: any narrowing filter or a search text. */
export const hasActiveFilters = (values: FilterValues) => activeFilterCount(values) > 0 || values.q.trim() !== "";

/** Home-page URL for the given filters with some values replaced; empty values and "ALL" are dropped. */
export function queryWith(values: FilterValues, patch: Partial<FilterValues> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...values, ...patch })) {
    if (v && v !== "ALL") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

/**
 * The own-rating filter: one score ("8"), a range ("7-9", either way round) or, from older links,
 * "7+" meaning 7 to 10. Anything else means no filter.
 */
export function parseRatingRange(value: string): { min: number; max: number } | null {
  const m = /^(10|[1-9])(?:-(10|[1-9])|([+]))?$/.exec(value.trim());
  if (!m) return null;
  const a = Number(m[1]);
  const b = m[3] ? 10 : m[2] ? Number(m[2]) : a;
  return { min: Math.min(a, b), max: Math.max(a, b) };
}

export const formatRatingRange = (min: number, max: number) => (min === max ? String(min) : `${min}-${max}`);

/**
 * The filters the next change builds on. While an earlier change is still on its way to the server,
 * the page's own values are one step behind, so the change is laid over that pending URL instead:
 * a search committed by leaving the field and the click that took the focus away both survive.
 */
export function latestValues(values: FilterValues, pendingHref: string | null): FilterValues {
  if (pendingHref === null) return values;
  const params = new URLSearchParams(pendingHref.split("?")[1] ?? "");
  return filtersFrom((key) => params.get(key));
}

/**
 * The own-rating filter after a click on a score: the only picked score again clears it, a second
 * score makes the range between the two, anything else starts over with that score.
 */
export function nextRating(current: string, score: number): string {
  const range = parseRatingRange(current);
  const single = range !== null && range.min === range.max ? range.min : null;
  if (single === score) return "";
  if (single !== null) return formatRatingRange(Math.min(single, score), Math.max(single, score));
  return String(score);
}
