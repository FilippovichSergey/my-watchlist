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
