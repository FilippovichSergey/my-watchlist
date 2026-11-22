import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "./filters";
import { filterEntries, toListEntry, type ListEntry } from "./list";
import { valuesFromQuery } from "./query-store";
import type { Entry } from "./types";

const entry = (id: number, over: Partial<ListEntry>): ListEntry => ({
  id, title: "Title " + id, originalTitle: null, titleBe: null, category: "SERIAL", releaseYear: 2024, countries: ["KR"],
  genreIds: [18], cast: ["Kim A"], posterUrl: null, tmdbRating: 8, myRating: 8, createdAt: "2026-11-01T10:00:00Z", ...over,
});
const LIST = [
  entry(1, { category: "ANIME", countries: ["JP"], genreIds: [16], myRating: 9, tmdbRating: 8.5, title: "Akira", releaseYear: 1988 }),
  entry(2, { category: "MOVIE", myRating: 7, tmdbRating: 6.9, titleBe: "Паразіты", title: "Parasite", cast: ["Song Kang-ho"] }),
  entry(3, { myRating: null, tmdbRating: null, originalTitle: "Оригинал" }),
  entry(4, { myRating: 8 }),
];
const ids = (query: string) => filterEntries(LIST, valuesFromQuery(query)).map((e) => e.id);

describe("filterEntries", () => {
  it("shows everything without filters and for the ALL category", () => {
    expect(filterEntries(LIST, EMPTY_FILTERS)).toHaveLength(4);
    expect(ids("category=ALL")).toEqual([1, 2, 3, 4]);
  });

  it("narrows by each filter, read from the address", () => {
    expect(ids("category=ANIME")).toEqual([1]);
    expect(ids("year=1988")).toEqual([1]);
    expect(ids("country=JP")).toEqual([1]);
    expect(ids("genre=16")).toEqual([1]);
    expect(ids("actor=kang")).toEqual([2]);
    expect(ids("rating=8")).toEqual([1, 4]);
    expect(ids("my=8")).toEqual([4]);
    expect(ids("my=7-8")).toEqual([2, 4]);
    expect(ids("category=SERIAL&my=8")).toEqual([4]);
  });

  it("searches the English, original and Belarusian titles, whatever the case", () => {
    expect(ids("q=PARA")).toEqual([2]);
    expect(ids("q=" + encodeURIComponent("параз"))).toEqual([2]);
    expect(ids("q=" + encodeURIComponent("ориг"))).toEqual([3]);
  });

  it("ignores a filter value it cannot read instead of hiding the list", () => {
    expect(ids("year=abc&my=99&rating=x")).toEqual([1, 2, 3, 4]);
  });
});

describe("toListEntry", () => {
  it("keeps what the card and the filters need and drops the long texts", () => {
    const full = { ...entry(5, {}), tmdbId: 1, mediaType: "TV", overview: "long", overviewBe: "доўгі", review: "note" } as Entry;
    const slim = toListEntry(full);
    expect(slim).toEqual(entry(5, {}));
    expect(Object.keys(slim)).not.toContain("overview");
  });
});
