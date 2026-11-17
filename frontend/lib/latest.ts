/**
 * Tells the newest of several overlapping requests from the older ones: take a ticket before the
 * request, and use the answer only if the ticket is still current when it arrives.
 */
export function latestOnly() {
  let current = 0;
  return {
    next: () => ++current,
    isCurrent: (ticket: number) => ticket === current,
  };
}
