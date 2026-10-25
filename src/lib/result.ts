/**
 * Minimal discriminated result type for domain helpers that must report
 * failures explicitly instead of throwing or returning partial data.
 */
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
