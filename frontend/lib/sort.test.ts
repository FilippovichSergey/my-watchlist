import { describe, expect, it } from "vitest";
import { byMyRatingDesc, sortEntries, toSortKey } from "./sort";

describe("default list order", () => {
  it("puts the highest own rating first, unrated titles last, and keeps the order of ties", () => {
    const list = [
      { id: 1, myRating: null },
      { id: 2, myRating: 7 },
      { id: 3, myRating: 10 },
      { id: 4, myRating: null },
      { id: 5, myRating: 7 },
    ];
    expect([...list].sort(byMyRatingDesc).map((e) => e.id)).toEqual([3, 2, 5, 1, 4]);
  });

  it("sorts by the chosen key and falls back to the own rating for unknown keys", () => {
    const list = [
      { id: 1, title: "Suzume", myRating: 8, createdAt: "2026-10-02T21:41:00Z", releaseYear: 2022, tmdbRating: 8.0 },
      { id: 2, title: "Akira", myRating: 9, createdAt: "2026-10-01T00:00:00Z", releaseYear: 1988, tmdbRating: 8.1 },
      { id: 3, title: "Btooom!", myRating: 8, createdAt: "2026-10-01T15:44:00Z", releaseYear: 2012, tmdbRating: 7.2 },
    ];
    const ids = (sort: string) => sortEntries(list, toSortKey(sort), "en").map((e) => e.id);
    expect(ids("newest")).toEqual([1, 3, 2]);
    expect(ids("year")).toEqual([1, 3, 2]);
    expect(ids("title")).toEqual([2, 3, 1]);
    expect(ids("tmdb")).toEqual([2, 1, 3]);
    expect(ids("nonsense")).toEqual([2, 1, 3]);
    expect(sortEntries(list, "title", "en", (e) => (e.id === 1 ? "Zed" : e.title)).map((e) => e.id)).toEqual([2, 3, 1]);
  });
});
