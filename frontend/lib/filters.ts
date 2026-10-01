export interface FilterValues {
  category: string;
  year: string;
  country: string;
  genre: string;
  actor: string;
  rating: string;
  my: string;
}

export interface FilterOptions {
  years: number[];
  countries: { code: string; name: string }[];
  genres: { id: number; name: string }[];
}

export const EMPTY_FILTERS: FilterValues = { category: "", year: "", country: "", genre: "", actor: "", rating: "", my: "" };

/** Home-page URL for the given filters with some values replaced; empty values and "ALL" are dropped. */
export function queryWith(values: FilterValues, patch: Partial<FilterValues> = {}): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...values, ...patch })) {
    if (v && v !== "ALL") params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}
