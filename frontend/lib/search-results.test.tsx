import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/image", () => ({ default: () => null }));

import { SearchResults } from "../app/admin/SearchResults";

describe("SearchResults", () => {
  it("offers every result as a button, so it can be chosen from the keyboard", () => {
    const result = { id: 1, mediaType: "TV" as const, title: "Example", originalTitle: null, year: 2026, posterPath: null, posterUrl: null, voteAverage: 8, overview: null };
    const html = renderToStaticMarkup(<SearchResults results={[result]} selectedKey={null} onSelect={() => {}} />);
    expect(html).toMatch(/<li><button type="button" aria-pressed="false"/);
    expect(html).toContain("Example");
  });
});
