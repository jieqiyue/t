let counter = 0;

/**
 * Collision-resistant id: timestamp + a monotonic counter (so ids created in
 * the same millisecond don't clash), with an optional prefix.
 */
export function newId(prefix = ''): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}-${counter.toString(36)}`;
}
