import Image from "next/image";
import Link from "next/link";
import { fetchPublicEntries } from "@/lib/backend";
import { getLocale } from "@/lib/locale.server";
import { t, type Locale } from "@/lib/i18n";
import { categoryName, countryName, genreName } from "@/lib/catalog";
import type { Entry } from "@/lib/types";
import { FilterPanel, FilterSheet, SearchBar } from "./Filters";
import { filtersFrom, hasActiveFilters, type FilterOptions } from "@/lib/filters";

type Params = Record<string, string | string[] | undefined>;

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
  const values = filtersFrom((key) => one(p, key));

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
  const q = values.q.trim().toLowerCase();
  const filtered = entries.filter(
    (e) =>
      (!values.category || values.category === "ALL" || e.category === values.category) &&
      (!q || e.title.toLowerCase().includes(q) || (e.originalTitle ?? "").toLowerCase().includes(q)) &&
      (year === null || e.releaseYear === year) &&
      (!values.country || e.countries.includes(values.country)) &&
      (genre === null || e.genreIds.includes(genre)) &&
      (!actor || e.cast.some((name) => name.toLowerCase().includes(actor))) &&
      (rating === null || (e.tmdbRating ?? 0) >= rating) &&
      (my === null || (e.myRating ?? 0) >= my)
  );

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
  const stats: { value: number | string; label: string; desktopOnly?: boolean }[] = [
    { value: entries.length, label: t(locale, "stats.total") },
    { value: inCategory("MOVIE"), label: t(locale, "cat.movies") },
    { value: inCategory("ANIME"), label: t(locale, "cat.anime") },
    { value: inCategory("SERIAL"), label: t(locale, "cat.serials") },
    { value: average, label: t(locale, "stats.avgMy"), desktopOnly: true },
  ];

  // Category, narrowing filters or search: anything that makes the list shorter than the whole
  const anythingActive = (values.category !== "" && values.category !== "ALL") || hasActiveFilters(values);

  const message = unavailable
    ? t(locale, "home.unavailable")
    : entries.length === 0
      ? t(locale, "home.empty")
      : filtered.length === 0
        ? t(locale, "home.noMatches")
        : null;

  return (
    <div className="flex flex-col gap-[14px] desk:grid desk:grid-cols-[250px_minmax(0,1fr)] desk:items-start desk:gap-6">
      <aside className="hidden desk:sticky desk:top-[84px] desk:block">
        <FilterPanel values={values} options={options} />
      </aside>

      <section className="flex min-w-0 flex-col gap-[14px] desk:gap-5">
        <div className="card flex flex-wrap justify-between gap-5 rounded-xl px-4 py-3 desk:justify-start desk:gap-7 desk:px-[22px] desk:py-[14px]">
          {stats.map((s) => (
            <div key={s.label} className={`flex-col ${s.desktopOnly ? "hidden desk:flex" : "flex"}`}>
              <span className="text-[22px] font-black leading-[1.1] tracking-[-0.5px] text-accent">{s.value}</span>
              <span className="mt-[2px] text-[9px] font-bold uppercase tracking-[0.8px] text-muted">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-[10px] desk:gap-[14px]">
          <SearchBar values={values} />
          <div className="desk:hidden">
            <FilterSheet values={values} options={options} count={filtered.length} />
          </div>
          <Found n={filtered.length} locale={locale} showReset={anythingActive} className="hidden desk:flex" />
        </div>
        <Found n={filtered.length} locale={locale} showReset={anythingActive} className="flex desk:hidden" />

        {message ? (
          <p className="my-12 text-center text-sm text-muted">{message}</p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(290px,1fr))] gap-4">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} locale={locale} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** "Found: N", with a link back to the whole list whenever a category, filter or search narrows it. */
function Found({ n, locale, showReset, className }: { n: number; locale: Locale; showReset: boolean; className: string }) {
  return (
    <div className={`items-center justify-between gap-3 ${className}`}>
      <span className="label-caps whitespace-nowrap">
        {t(locale, "home.found")}: <span className="font-display text-[13px] text-accent">{n}</span>
      </span>
      {showReset && (
        <Link
          href="/"
          className="whitespace-nowrap text-xs font-semibold tracking-[0.1px] text-muted transition-colors duration-150 hover:text-accent"
        >
          {t(locale, "home.resetAll")}
        </Link>
      )}
    </div>
  );
}

function EntryCard({ entry, locale }: { entry: Entry; locale: Locale }) {
  const facts = [
    entry.releaseYear,
    categoryName(entry.category, locale),
    entry.countries.map((c) => countryName(c, locale)).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link
      href={`/title/${entry.id}`}
      className="card group grid min-h-[144px] grid-cols-[96px_minmax(0,1fr)] overflow-hidden desk:min-h-[156px] desk:grid-cols-[104px_minmax(0,1fr)]"
    >
      <div className="relative overflow-hidden bg-subtle">
        {entry.posterUrl && (
          <Image
            src={entry.posterUrl}
            alt={entry.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-105"
            sizes="104px"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-[5px] px-4 pb-3 pt-[14px] desk:gap-[6px] desk:px-[18px] desk:pb-[14px] desk:pt-4">
        <p className="line-clamp-2 text-pretty text-[15px] font-semibold leading-[1.25] tracking-[-0.1px]">{entry.title}</p>
        <p className="text-xs text-muted">{facts}</p>
        <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-2 desk:pt-[10px]">
          <Numeral value={entry.tmdbRating != null ? entry.tmdbRating.toFixed(1) : "–"} label="TMDB" />
          <Numeral value={entry.myRating ?? "–"} label={t(locale, "filter.myRating")} accent />
        </div>
      </div>
    </Link>
  );
}

function Numeral({ value, label, accent = false }: { value: number | string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`numeral text-[26px] desk:text-[28px] ${accent ? "text-accent" : "text-ink"}`}>{value}</span>
      <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.9px] text-muted">{label}</span>
    </div>
  );
}
