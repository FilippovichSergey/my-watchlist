import { describe, expect, it } from "vitest";
import { backAction, titlePath } from "./back";

describe("backAction", () => {
  it("steps back in history only when the title was opened from the list", () => {
    expect(backAction("/?category=ANIME&my=8", true)).toEqual({ kind: "back" });
  });

  it("goes to the remembered list by address after a shared link, a reload or another site", () => {
    expect(backAction("/?category=ANIME&my=8", false)).toEqual({ kind: "push", href: "/?category=ANIME&my=8" });
  });

  it("leaves the plain link alone when nothing usable is remembered", () => {
    expect(backAction(null, true)).toEqual({ kind: "link" });
    expect(backAction("", false)).toEqual({ kind: "link" });
    expect(backAction("https://evil.example.net/", false)).toEqual({ kind: "link" });
    expect(backAction("//evil.example.net/", true)).toEqual({ kind: "link" });
  });
});

describe("titlePath", () => {
  it("recognises title links and nothing else", () => {
    expect(titlePath("/title/12")).toBe("/title/12");
    expect(titlePath("/admin")).toBeNull();
    expect(titlePath("/title/12/edit")).toBeNull();
    expect(titlePath(null)).toBeNull();
  });
});
