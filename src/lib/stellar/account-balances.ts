import type { Result } from "../result";
import { isValidStellarPublicKey } from "./address";

/**
 * Read-only Stellar Testnet account balance service.
 *
 * This module only queries Horizon for public account data. It does not sign,
 * submit, or sponsor transactions, and it never accepts secret keys.
 */

export const STELLAR_TESTNET_HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Stellar amounts are decimal strings with up to seven fractional digits. */
const STELLAR_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;
const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export type StellarBalanceErrorCode =
  | "invalid_address"
  | "unfunded_account"
  | "network_error"
  | "endpoint_unavailable"
  | "malformed_response";

export interface StellarBalanceError {
  code: StellarBalanceErrorCode;
  message: string;
  details?: string;
  /** Present for `endpoint_unavailable` responses. */
  httpStatus?: number;
}

export interface NativeAssetBalance {
  kind: "native";
  assetType: "native";
  /** Native lumens are always reported as XLM. */
  code: "XLM";
  /** Horizon decimal string; never converted to a JavaScript number. */
  balance: string;
}

export interface IssuedAssetBalance {
  kind: "issued";
  assetType: "credit_alphanum4" | "credit_alphanum12";
  code: string;
  issuer: string;
  /** Horizon decimal string; never converted to a JavaScript number. */
  balance: string;
}

export type StellarAssetBalance = NativeAssetBalance | IssuedAssetBalance;

export interface TestnetAccountBalances {
  address: string;
  network: "testnet";
  balances: StellarAssetBalance[];
}

export interface FetchTestnetBalancesOptions {
  /** Injected for deterministic tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Override for a self-hosted Testnet Horizon instance or test harness. */
  horizonUrl?: string;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function malformed(details: string): Result<TestnetAccountBalances, StellarBalanceError> {
  return {
    ok: false,
    error: {
      code: "malformed_response",
      message: "Stellar Testnet Horizon returned an unexpected account payload.",
      details,
    },
  };
}

/**
 * Normalizes a Horizon account payload into native and issued balances.
 *
 * Unknown asset types (for example liquidity pool shares) are rejected as a
 * malformed response rather than being mapped to an invented asset identity.
 */
export function parseTestnetAccountBalances(
  payload: unknown,
  expectedAddress: string
): Result<TestnetAccountBalances, StellarBalanceError> {
  if (!isRecord(payload)) {
    return malformed("Expected the account payload to be an object.");
  }

  if (payload.account_id !== expectedAddress) {
    return malformed(
      `Expected account_id to match the requested address, received ${JSON.stringify(payload.account_id)}.`
    );
  }

  if (!Array.isArray(payload.balances)) {
    return malformed("Expected a balances array.");
  }

  const balances: StellarAssetBalance[] = [];

  for (const [index, entry] of payload.balances.entries()) {
    if (!isRecord(entry)) {
      return malformed(`Balance at index ${index} is not an object.`);
    }

    if (typeof entry.balance !== "string" || !STELLAR_AMOUNT_PATTERN.test(entry.balance)) {
      return malformed(`Balance at index ${index} has an invalid amount.`);
    }

    if (entry.asset_type === "native") {
      balances.push({
        kind: "native",
        assetType: "native",
        code: "XLM",
        balance: entry.balance,
      });
      continue;
    }

    if (entry.asset_type === "credit_alphanum4" || entry.asset_type === "credit_alphanum12") {
      const code = entry.asset_code;
      const issuer = entry.asset_issuer;

      if (typeof code !== "string" || !ASSET_CODE_PATTERN.test(code)) {
        return malformed(`Balance at index ${index} has an invalid asset_code.`);
      }
      if (!isValidStellarPublicKey(issuer)) {
        return malformed(`Balance at index ${index} has an invalid asset_issuer.`);
      }

      balances.push({
        kind: "issued",
        assetType: entry.asset_type,
        code,
        issuer,
        balance: entry.balance,
      });
      continue;
    }

    return malformed(
      `Balance at index ${index} uses unsupported asset_type ${JSON.stringify(entry.asset_type)}.`
    );
  }

  return {
    ok: true,
    value: {
      address: expectedAddress,
      network: "testnet",
      balances,
    },
  };
}

/**
 * Fetches read-only Stellar Testnet balances for a public account.
 *
 * The function validates the address before any request and distinguishes
 * invalid input, unfunded accounts, network failures, unavailable Horizon
 * endpoints and malformed payloads.
 */
export async function fetchTestnetAccountBalances(
  address: unknown,
  options: FetchTestnetBalancesOptions = {}
): Promise<Result<TestnetAccountBalances, StellarBalanceError>> {
  if (!isValidStellarPublicKey(address)) {
    return {
      ok: false,
      error: {
        code: "invalid_address",
        message:
          "Expected a Stellar public key (G..., 56 characters). Secret keys and malformed addresses are rejected.",
      },
    };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "No fetch implementation is available to reach Stellar Testnet Horizon.",
      },
    };
  }

  const horizonUrl = (options.horizonUrl ?? STELLAR_TESTNET_HORIZON_URL).replace(/\/+$/, "");
  const url = `${horizonUrl}/accounts/${encodeURIComponent(address)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "network_error",
        message: "Could not reach Stellar Testnet Horizon. Check connectivity and try again.",
        details: error instanceof Error ? error.message : String(error),
      },
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      error: {
        code: "unfunded_account",
        message:
          "This account is not funded on Stellar Testnet. Fund it with Friendbot or another Testnet source before querying balances.",
        httpStatus: 404,
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "endpoint_unavailable",
        message: `Stellar Testnet Horizon returned HTTP ${response.status}. Try again later.`,
        httpStatus: response.status,
      },
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    return malformed(
      `Response body was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return parseTestnetAccountBalances(payload, address);
}
