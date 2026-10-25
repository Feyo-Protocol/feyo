import { StrKey } from "@stellar/stellar-sdk";

/** Canonical Ed25519 public key: `G` followed by 55 base32 characters. */
const ED25519_PUBLIC_KEY_PATTERN = /^G[A-Z2-7]{55}$/;

/**
 * Validates a Stellar Ed25519 public key (`G...`).
 *
 * Secret keys (`S...`), muxed addresses (`M...`), contract addresses (`C...`)
 * and malformed strings are rejected. This helper is server-safe and never
 * performs a network request.
 */
export function isValidStellarPublicKey(address: unknown): address is string {
  if (typeof address !== "string" || !ED25519_PUBLIC_KEY_PATTERN.test(address)) {
    return false;
  }
  try {
    return StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}
