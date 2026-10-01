import type { Category, Locale } from "./i18n";

/** TMDB genre ids are stable, so names can live here in both UI languages. */
const GENRES: Record<number, { en: string; be: string }> = {
  28: { en: "Action", be: "Баявік" },
  12: { en: "Adventure", be: "Прыгоды" },
  16: { en: "Animation", be: "Анімацыя" },
  35: { en: "Comedy", be: "Камедыя" },
  80: { en: "Crime", be: "Крымінал" },
  99: { en: "Documentary", be: "Дакументальны" },
  18: { en: "Drama", be: "Драма" },
  10751: { en: "Family", be: "Сямейны" },
  14: { en: "Fantasy", be: "Фэнтэзі" },
  36: { en: "History", be: "Гістарычны" },
  27: { en: "Horror", be: "Жахі" },
  10402: { en: "Music", be: "Музыка" },
  9648: { en: "Mystery", be: "Дэтэктыў" },
  10749: { en: "Romance", be: "Рамантыка" },
  878: { en: "Science Fiction", be: "Фантастыка" },
  10770: { en: "TV Movie", be: "Тэлефільм" },
  53: { en: "Thriller", be: "Трылер" },
  10752: { en: "War", be: "Ваенны" },
  37: { en: "Western", be: "Вестэрн" },
  10759: { en: "Action & Adventure", be: "Баявік і прыгоды" },
  10762: { en: "Kids", be: "Дзіцячы" },
  10763: { en: "News", be: "Навіны" },
  10764: { en: "Reality", be: "Рэаліці" },
  10765: { en: "Sci-Fi & Fantasy", be: "Фантастыка і фэнтэзі" },
  10766: { en: "Soap", be: "Мыльная опера" },
  10767: { en: "Talk", be: "Ток-шоу" },
  10768: { en: "War & Politics", be: "Вайна і палітыка" },
};

export function genreName(id: number, locale: Locale): string {
  return GENRES[id]?.[locale] ?? GENRES[id]?.en ?? `#${id}`;
}

/** ISO 3166-1 code → localised country name via the platform's ICU data; the code itself as a last resort. */
export function countryName(code: string, locale: Locale): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region", fallback: "code" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const CATEGORY_NAMES: Record<Category, { en: string; be: string }> = {
  MOVIE: { en: "Movie", be: "Фільм" },
  ANIME: { en: "Anime", be: "Анімэ" },
  SERIAL: { en: "Serial", be: "Серыял" },
};

export function categoryName(category: Category, locale: Locale): string {
  return CATEGORY_NAMES[category][locale];
}

/** The title in the UI language: the owner's Belarusian one when it exists, otherwise TMDB's English title. */
export function displayTitle(entry: { title: string; titleBe: string | null }, locale: Locale): string {
  return locale === "be" && entry.titleBe ? entry.titleBe : entry.title;
}

export function displayOverview(entry: { overview: string | null; overviewBe: string | null }, locale: Locale): string | null {
  return locale === "be" && entry.overviewBe ? entry.overviewBe : entry.overview;
}
