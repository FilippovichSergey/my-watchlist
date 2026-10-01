import { describe, expect, it } from "vitest";
import { byMyRatingDesc } from "./sort";

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
});
