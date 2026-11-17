import { describe, expect, it } from "vitest";
import { latestOnly } from "./latest";

describe("latestOnly", () => {
  it("accepts the answer of the newest request only, whatever order the answers come in", async () => {
    const tickets = latestOnly();
    const shown: string[] = [];
    let releaseFirst = () => {};
    const search = async (text: string, wait: Promise<void>) => {
      const ticket = tickets.next();
      await wait;
      if (tickets.isCurrent(ticket)) shown.push(text);
    };
    const first = search("first query", new Promise<void>((resolve) => (releaseFirst = resolve)));
    const second = search("second query", Promise.resolve());
    await second;
    releaseFirst();
    await first;
    expect(shown).toEqual(["second query"]);
  });
});
