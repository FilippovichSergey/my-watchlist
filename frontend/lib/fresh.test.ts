import { describe, expect, it } from "vitest";
import { readUnchanged } from "./fresh";

describe("readUnchanged", () => {
  it("returns the first read when nothing changed meanwhile", async () => {
    let reads = 0;
    expect(await readUnchanged(async () => ++reads, () => 0)).toBe(1);
  });

  it("reads again when a change overtook the read, so an added entry is not replaced by the old list", async () => {
    let server: number[] = [];
    let changes = 0;
    let releaseFirst = () => {};
    let reads = 0;
    const read = async () => {
      const snapshot = [...server];
      if (++reads === 1) await new Promise<void>((resolve) => (releaseFirst = resolve));
      return snapshot;
    };
    const loading = readUnchanged(read, () => changes);
    // The entry is created while the first read is still on its way
    server = [1];
    changes++;
    releaseFirst();
    expect(await loading).toEqual([1]);
    expect(reads).toBe(2);
  });

  it("gives up re-reading after the given number of attempts", async () => {
    let changes = 0;
    let reads = 0;
    const result = await readUnchanged(async () => { changes++; return ++reads; }, () => changes, 3);
    expect(result).toBe(3);
  });
});
