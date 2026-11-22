/**
 * Reads a list that is being changed at the same time. A snapshot asked for before a change and answered
 * after it would put the old state back on screen, so a read that was overtaken by a change is thrown away
 * and made again. `changes` counts the changes made so far; after a few overtaken reads the last one is
 * used rather than reading for ever.
 */
export async function readUnchanged<T>(read: () => Promise<T>, changes: () => number, attempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const before = changes();
    const result = await read();
    if (changes() === before || attempt >= attempts) return result;
  }
}
