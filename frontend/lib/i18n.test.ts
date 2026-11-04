import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale, t } from "./i18n";
import { categoryName, countryName, displayOverview, displayTitle, genreName } from "./catalog";
import { EMPTY_FILTERS, activeFilterCount, filtersFrom, formatRatingRange, hasActiveFilters, parseRatingRange, queryWith } from "./filters";

describe("i18n", () => {
  it("recognises the supported UI languages only", () => {
    expect(LOCALES).toEqual(["be", "en"]);
    expect(isLocale("be")).toBe(true);
    expect(isLocale("ru")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
    expect(DEFAULT_LOCALE).toBe("be");
  });

  it("translates and fills placeholders, leaving unknown ones visible", () => {
    expect(t("en", "filter.found", { n: 3 })).toBe("Found: 3");
    expect(t("be", "filter.found", { n: 3 })).toBe("Знойдзена: 3");
    expect(t("be", "admin.signInFailed", {})).toBe("Уваход не ўдаўся ({code}). Падрабязнасці — у логу сервера.");
  });

  it("names genres, countries and categories in both languages with safe fallbacks", () => {
    expect(genreName(18, "en")).toBe("Drama");
    expect(genreName(18, "be")).toBe("Драма");
    expect(genreName(424242, "be")).toBe("#424242");
    expect(countryName("KR", "en")).toBe("South Korea");
    expect(countryName("KR", "be")).not.toBe("KR");
    expect(countryName("XX", "en")).toBe("XX");
    expect(countryName("not-a-code", "en")).toBe("not-a-code");
    expect(categoryName("SERIAL", "be")).toBe("Серыял");
  });
});

describe("Belarusian text", () => {
  it("prefers the owner's Belarusian title and description in the Belarusian UI only", () => {
    const entry = { title: "Dune", titleBe: "Дзюна", overview: "Sand.", overviewBe: null };
    expect(displayTitle(entry, "be")).toBe("Дзюна");
    expect(displayTitle(entry, "en")).toBe("Dune");
    expect(displayTitle({ ...entry, titleBe: null }, "be")).toBe("Dune");
    expect(displayOverview(entry, "be")).toBe("Sand.");
    expect(displayOverview({ ...entry, overviewBe: "Пясок." }, "be")).toBe("Пясок.");
  });
});

describe("filter URLs", () => {
  it("drops empty values and the ALL category", () => {
    expect(queryWith(EMPTY_FILTERS)).toBe("/");
    expect(queryWith({ ...EMPTY_FILTERS, category: "ALL", year: "2024" })).toBe("/?year=2024");
    expect(queryWith({ ...EMPTY_FILTERS, category: "ANIME", actor: "Song Joong-ki" }, { genre: "18" })).toBe(
      "/?category=ANIME&genre=18&actor=Song+Joong-ki"
    );
    expect(queryWith({ ...EMPTY_FILTERS, q: "dune" })).toBe("/?q=dune");
  });

  it("reads filters from a URL-like source and counts only the narrowing ones", () => {
    const source: Record<string, string> = { category: "ANIME", year: "2024", q: "x" };
    const values = filtersFrom((key) => source[key] ?? null);
    expect(values).toEqual({ ...EMPTY_FILTERS, category: "ANIME", year: "2024", q: "x" });
    expect(activeFilterCount(values)).toBe(1);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, category: "ANIME" })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, q: "a" })).toBe(true);
  });

  it("reads the own-rating filter as one score, a range or the old at-least form", () => {
    expect(parseRatingRange("8")).toEqual({ min: 8, max: 8 });
    expect(parseRatingRange("7-9")).toEqual({ min: 7, max: 9 });
    expect(parseRatingRange("9-7")).toEqual({ min: 7, max: 9 });
    expect(parseRatingRange("7+")).toEqual({ min: 7, max: 10 });
    expect(parseRatingRange("10")).toEqual({ min: 10, max: 10 });
    expect(parseRatingRange("11")).toBeNull();
    expect(parseRatingRange("")).toBeNull();
    expect(parseRatingRange("abc")).toBeNull();
    expect(formatRatingRange(8, 8)).toBe("8");
    expect(formatRatingRange(7, 9)).toBe("7-9");
  });
});
