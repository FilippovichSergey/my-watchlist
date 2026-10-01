import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isLocale, t } from "./i18n";
import { categoryName, countryName, genreName } from "./catalog";
import { EMPTY_FILTERS, queryWith } from "./filters";

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

describe("filter URLs", () => {
  it("drops empty values and the ALL category", () => {
    expect(queryWith(EMPTY_FILTERS)).toBe("/");
    expect(queryWith({ ...EMPTY_FILTERS, category: "ALL", year: "2024" })).toBe("/?year=2024");
    expect(queryWith({ ...EMPTY_FILTERS, category: "ANIME", actor: "Song Joong-ki" }, { genre: "18" })).toBe(
      "/?category=ANIME&genre=18&actor=Song+Joong-ki"
    );
  });
});
