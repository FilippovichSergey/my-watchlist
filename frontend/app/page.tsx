import Image from "next/image";
import Link from "next/link";
import { fetchPublicEntries } from "@/lib/backend";
import { getLocale } from "@/lib/locale.server";
import { t, type Locale } from "@/lib/i18n";
import { categoryName, countryName, genreName } from "@/lib/catalog";
import type { Entry } from "@/lib/types";
import { Filters } from "./Filters";
import { queryWith, type FilterOptions, type FilterValues } from "@/lib/filters";

type Params = Record<string, string | string[] | undefined>;

const CATEGORY_TABS = [
  { value: "ALL", key: "cat.all" },
  { value: "MOVIE", key: "cat.movies" },
  { value: "ANIME", key: "cat.anime" },
  { value: "SERIAL", key: "cat.serials" },
] as const;

function one(p: Params, key: string): string {
  const v = p[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function num(s: string): number | null {
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : null;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<Params> }) {
  const [p, locale] = await Promise.all([searchParams, getLocale()]);
  const values: FilterValues = {
    category: one(p, "category"),
    year: one(p, "year"),
    country: one(p, "country"),
    genre: one(p, "genre"),
    actor: one(p, "actor"),
    rating: one(p, "rating"),
    my: one(p, "my"),
  };

  let entries: Entry[] = [];
  let unavailable = false;
  try {
    entries = await fetchPublicEntries();
  } catch {
    unavailable = true;
  }

  const year = num(values.year);
  const genre = num(values.genre);
  const rating = num(values.rating);
  const my = num(values.my);
  const actor = values.actor.trim().toLowerCase();
  const filtered = entries.filter(
    (e) =>
      (!values.category || values.category === "ALL" || e.category === values.category) &&
      (year === null || e.releaseYear === year) &&
      (!values.country || e.countries.includes(values.country)) &&
      (genre === null || e.genreIds.includes(genre)) &&
      (!actor || e.cast.some((name) => name.toLowerCase().includes(actor))) &&
      (rating === null || (e.tmdbRating ?? 0) >= rating) &&
      (my === null || (e.myRating ?? 0) >= my)
  );

  const options: FilterOptions = {
    years: [...new Set(entries.map((e) => e.releaseYear).filter((y): y is number => y !== null))].sort((a, b) => b - a),
    countries: [...new Set(entries.flatMap((e) => e.countries))]
      .map((code) => ({ code, name: countryName(code, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
    genres: [...new Set(entries.flatMap((e) => e.genreIds))]
      .map((id) => ({ id, name: genreName(id, locale) }))
      .sort((a, b) => a.name.localeCompare(b.name, locale)),
  };
  const active = values.category || "ALL";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={queryWith(values, { category: tab.value })}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              active === tab.value
                ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                : "border-gray-300 dark:border-gray-700 hover:border-gray-500"
            }`}
          >
            {t(locale, tab.key)}
          </Link>
        ))}
      </div>

      <Filters values={values} options={options} />

      {unavailable ? (
        <p className="text-gray-500 text-center mt-12">{t(locale, "home.unavailable")}</p>
      ) : entries.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">{t(locale, "home.empty")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center mt-12">{t(locale, "home.noMatches")}</p>
      ) : (
        <>
          <p className="text-xs text-gray-500">{t(locale, "filter.found", { n: filtered.length })}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} locale={locale} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EntryCard({ entry, locale }: { entry: Entry; locale: Locale }) {
  return (
    <Link href={`/title/${entry.id}`} className="group flex flex-col gap-2">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        {entry.posterUrl ? (
          <Image
            src={entry.posterUrl}
            alt={entry.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs text-center px-2">No poster</div>
        )}
        {entry.tmdbRating != null && (
          <div className="absolute top-2 right-2 bg-black/70 text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded">
            {entry.tmdbRating.toFixed(1)}
          </div>
        )}
        {entry.myRating != null && (
          <div className="absolute top-2 left-2 bg-blue-600/90 text-white text-xs font-bold px-1.5 py-0.5 rounded">
            ★ {entry.myRating}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-tight line-clamp-2">{entry.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {[entry.releaseYear, categoryName(entry.category, locale)].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
