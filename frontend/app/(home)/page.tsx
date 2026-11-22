import { fetchPublicEntries } from "@/lib/backend";
import { getLocale } from "@/lib/locale.server";
import { t } from "@/lib/i18n";
import { countryName, genreName } from "@/lib/catalog";
import type { Entry } from "@/lib/types";
import { filtersFrom, queryWith, type FilterOptions } from "@/lib/filters";
import { toListEntry } from "@/lib/list";
import { HomeList, type Stat } from "./HomeList";

type Params = Record<string, string | string[] | undefined>;

function one(p: Params, key: string): string {
  const v = p[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

/**
 * Fetches the whole list and what describes it as a whole (filter options, statistics); HomeList then
 * filters and sorts it, on the server for this first answer and in the browser for every change after.
 */
export default async function HomePage({ searchParams }: { searchParams: Promise<Params> }) {
  const [p, locale] = await Promise.all([searchParams, getLocale()]);
  // The same string the browser will read from its address bar, minus anything that is not a filter
  const initialQuery = queryWith(filtersFrom((key) => one(p, key))).replace(/^[/][?]?/, "");

  let entries: Entry[] = [];
  let unavailable = false;
  try {
    entries = await fetchPublicEntries();
  } catch {
    unavailable = true;
  }

  // Options and statistics describe the whole list; only "found" follows the filters
  const options: FilterOptions = {
    years: [...new Set(entries.map((e) => e.releaseYear).filter((y): y is number => y !== null))].sort((a, b) => b - a),
    countries: [...new Set(entries.flatMap((e) => e.countries))]
      .map((code) => ({ code, name: countryName(code, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
    genres: [...new Set(entries.flatMap((e) => e.genreIds))]
      .map((id) => ({ id, name: genreName(id, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
  };
  const inCategory = (c: string) => entries.filter((e) => e.category === c).length;
  const rated = entries.filter((e) => e.myRating != null);
  const average = rated.length ? (rated.reduce((sum, e) => sum + (e.myRating ?? 0), 0) / rated.length).toFixed(1) : "–";
  const stats: Stat[] = [
    { value: entries.length, label: t(locale, "stats.total") },
    { value: inCategory("MOVIE"), label: t(locale, "cat.movies") },
    { value: inCategory("ANIME"), label: t(locale, "cat.anime") },
    { value: inCategory("SERIAL"), label: t(locale, "cat.serials") },
    { value: average, label: t(locale, "stats.avgMy"), desktopOnly: true },
  ];

  return (
    <HomeList
      entries={entries.map(toListEntry)}
      options={options}
      stats={stats}
      unavailable={unavailable}
      initialQuery={initialQuery}
    />
  );
}
