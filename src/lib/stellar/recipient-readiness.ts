import type { PaymentAsset } from "../payments/intent";
import { isValidStellarPublicKey } from "./address";
import { STELLAR_TESTNET_HORIZON_URL } from "./network";

const DEFAULT_TIMEOUT_MS = 10_000;
const MAX_TIMEOUT_MS = 30_000;
const STELLAR_AMOUNT_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/;
const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export type RecipientAuthorization =
  | "authorized"
  | "maintain_liabilities_only"
  | "unauthorized"
  | "unknown";

export type RecipientBalanceLimitObservation =
  | "below_reported_limit"
  | "at_or_above_reported_limit"
  | "unknown";

export interface TestnetRecipientTrustlineObservation {
  balance: string;
  limit: string;
  authorization: RecipientAuthorization;
  balanceVsLimit: RecipientBalanceLimitObservation;
  buyingLiabilities?: string;
  sellingLiabilities?: string;
  clawbackEnabled?: boolean;
}

interface RecipientReadinessBase {
  network: "testnet";
  address: string;
  observedAt?: string;
  latestLedger?: number;
}

export type TestnetRecipientReadinessResult =
  | (RecipientReadinessBase & {
      status: "funded_destination";
      nativeBalance: string;
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "unfunded_destination";
      message: string;
      httpStatus: 404;
    })
  | (RecipientReadinessBase & {
      status: "trustline_present";
      asset: Extract<PaymentAsset, { type: "issued" }>;
      trustline: TestnetRecipientTrustlineObservation;
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "trustline_missing";
      asset: Extract<PaymentAsset, { type: "issued" }>;
      sameCodeDifferentIssuerFound: boolean;
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "horizon_unavailable";
      reason: "timeout" | "network_error" | "http_error";
      httpStatus?: number;
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "malformed_response";
      message: string;
      details: string;
    })
  | (RecipientReadinessBase & {
      status: "unknown";
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "invalid_request";
      message: string;
    })
  | (RecipientReadinessBase & {
      status: "cancelled";
      message: string;
    });

export interface InspectTestnetRecipientReadinessOptions {
  /** Injected only for deterministic tests; the request URL remains canonical Testnet Horizon. */
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  /** Complete request + response-body deadline. Defaults to 10 seconds. */
  timeoutMs?: number;
  now?: () => Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidAmountString(value: unknown): value is string {
  return typeof value === "string" && STELLAR_AMOUNT_PATTERN.test(value);
}

function decimalToStroops(value: string): bigint | undefined {
  if (!isValidAmountString(value)) return undefined;
  const [whole, fraction = ""] = value.split(".");
  try {
    return BigInt(whole) * BigInt("10000000") + BigInt(fraction.padEnd(7, "0"));
  } catch {
    return undefined;
  }
}

function isValidPaymentAsset(value: unknown): value is PaymentAsset {
  if (!isRecord(value)) return false;
  if (value.type === "native") return value.code === "XLM" && value.issuer === undefined;
  return (
    value.type === "issued" &&
    typeof value.code === "string" &&
    ASSET_CODE_PATTERN.test(value.code) &&
    value.code.toUpperCase() !== "XLM" &&
    isValidStellarPublicKey(value.issuer)
  );
}

function authorizationFrom(line: Record<string, unknown>): RecipientAuthorization {
  const authorized = line.is_authorized;
  const maintain = line.is_authorized_to_maintain_liabilities;
  if (authorized === true) return "authorized";
  if (authorized === false && maintain === true) return "maintain_liabilities_only";
  if (authorized === false && maintain === false) return "unauthorized";
  return "unknown";
}

function parseOptionalDecimal(
  line: Record<string, unknown>,
  field: "buying_liabilities" | "selling_liabilities"
): string | undefined | null {
  if (line[field] === undefined) return undefined;
  return isValidAmountString(line[field]) ? line[field] : null;
}

function parseOptionalBoolean(
  line: Record<string, unknown>,
  field: "is_authorized" | "is_authorized_to_maintain_liabilities" | "is_clawback_enabled"
): boolean | undefined | null {
  if (line[field] === undefined) return undefined;
  return typeof line[field] === "boolean" ? line[field] : null;
}

function getLatestLedger(response: Response): number | undefined {
  const raw = response.headers.get("latest-ledger");
  if (!raw || !/^[1-9]\d*$/.test(raw)) return undefined;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function malformed(address: string, details: string): TestnetRecipientReadinessResult {
  return {
    status: "malformed_response",
    network: "testnet",
    address,
    details,
    message: "Stellar Testnet Horizon returned an account response Feyo could not safely interpret.",
  };
}

function parseAccountResponse(
  payload: unknown,
  address: string,
  asset: PaymentAsset,
  latestLedger: number | undefined,
  now: () => Date
): TestnetRecipientReadinessResult {
  if (!isRecord(payload)) return malformed(address, "Expected an account object.");
  if (payload.account_id !== address) {
    return malformed(address, "The returned account_id did not match the requested destination.");
  }
  if (!Array.isArray(payload.balances)) return malformed(address, "Expected the account balances array.");

  const nativeLines: Record<string, unknown>[] = [];
  const issuedLines: Record<string, unknown>[] = [];
  let sameCodeDifferentIssuerFound = false;

  for (const [index, entry] of payload.balances.entries()) {
    if (!isRecord(entry)) return malformed(address, `Balance entry ${index} was not an object.`);
    if (entry.asset_type === "native") {
      if (!isValidAmountString(entry.balance)) {
        return malformed(address, `Native balance entry ${index} had an invalid decimal balance.`);
      }
      nativeLines.push(entry);
      continue;
    }

    if (entry.asset_type === "credit_alphanum4" || entry.asset_type === "credit_alphanum12") {
      if (
        !isValidAmountString(entry.balance) ||
        !isValidAmountString(entry.limit) ||
        typeof entry.asset_code !== "string" ||
        !ASSET_CODE_PATTERN.test(entry.asset_code) ||
        !isValidStellarPublicKey(entry.asset_issuer)
      ) {
        return malformed(address, `Issued-asset trustline entry ${index} had invalid identity or amount fields.`);
      }
      const codeLengthValid = entry.asset_type === "credit_alphanum4"
        ? entry.asset_code.length <= 4
        : entry.asset_code.length > 4;
      if (!codeLengthValid) {
        return malformed(address, `Issued-asset trustline entry ${index} did not match its Horizon asset type.`);
      }

      for (const field of ["is_authorized", "is_authorized_to_maintain_liabilities", "is_clawback_enabled"] as const) {
        if (parseOptionalBoolean(entry, field) === null) {
          return malformed(address, `Issued-asset trustline entry ${index} had a non-boolean ${field} flag.`);
        }
      }
      for (const field of ["buying_liabilities", "selling_liabilities"] as const) {
        if (parseOptionalDecimal(entry, field) === null) {
          return malformed(address, `Issued-asset trustline entry ${index} had invalid ${field}.`);
        }
      }

      issuedLines.push(entry);
      if (asset.type === "issued" && entry.asset_code === asset.code && entry.asset_issuer !== asset.issuer) {
        sameCodeDifferentIssuerFound = true;
      }
    }
    // Liquidity-pool share lines and future Horizon balance types are irrelevant
    // to this classic-payment preflight and are deliberately not treated as XLM or trustlines.
  }

  const observedAt = now().toISOString();
  const base = { network: "testnet" as const, address, observedAt, latestLedger };

  if (asset.type === "native") {
    if (nativeLines.length !== 1) {
      return {
        status: "unknown",
        ...base,
        message: "Horizon confirmed an account record but did not expose exactly one native XLM balance. Feyo cannot assess this destination.",
      };
    }
    return {
      status: "funded_destination",
      ...base,
      nativeBalance: nativeLines[0].balance as string,
      message: "Horizon reports an existing funded Stellar Testnet account. This observation does not guarantee a future payment will succeed.",
    };
  }

  const matching = issuedLines.filter(
    (line) => line.asset_code === asset.code && line.asset_issuer === asset.issuer
  );
  if (matching.length === 0) {
    return {
      status: "trustline_missing",
      ...base,
      asset,
      sameCodeDifferentIssuerFound,
      message: "No trustline matching both this asset code and issuer was visible in the Testnet account response. Issuer authorization rules can affect which trustlines Horizon exposes.",
    };
  }
  if (matching.length !== 1) {
    return malformed(address, "Horizon returned more than one exact matching trustline.");
  }

  const line = matching[0];
  const balance = line.balance as string;
  const limit = line.limit as string;
  const balanceUnits = decimalToStroops(balance);
  const limitUnits = decimalToStroops(limit);
  const buyingLiabilitiesValue = parseOptionalDecimal(line, "buying_liabilities");
  const sellingLiabilitiesValue = parseOptionalDecimal(line, "selling_liabilities");
  const clawbackEnabledValue = parseOptionalBoolean(line, "is_clawback_enabled");
  const buyingLiabilities = typeof buyingLiabilitiesValue === "string" ? buyingLiabilitiesValue : undefined;
  const sellingLiabilities = typeof sellingLiabilitiesValue === "string" ? sellingLiabilitiesValue : undefined;
  const clawbackEnabled = typeof clawbackEnabledValue === "boolean" ? clawbackEnabledValue : undefined;
  const balanceVsLimit = balanceUnits === undefined || limitUnits === undefined
    ? "unknown"
    : balanceUnits >= limitUnits
      ? "at_or_above_reported_limit"
      : "below_reported_limit";

  return {
    status: "trustline_present",
    ...base,
    asset,
    trustline: {
      balance,
      limit,
      authorization: authorizationFrom(line),
      balanceVsLimit,
      ...(buyingLiabilities === undefined ? {} : { buyingLiabilities }),
      ...(sellingLiabilities === undefined ? {} : { sellingLiabilities }),
      ...(clawbackEnabled === undefined ? {} : { clawbackEnabled }),
    },
    message: "Horizon reports a trustline with this exact asset code and issuer. Authorization flags and limits are point-in-time observations, not a guarantee that a future payment will be accepted.",
  };
}

/**
 * Performs a read-only, Testnet-only destination preflight against the canonical
 * Horizon account endpoint. It does not create accounts or trustlines and does
 * not promise that a future payment will succeed.
 */
export async function inspectTestnetRecipientReadiness(
  addressInput: unknown,
  assetInput: unknown,
  options: InspectTestnetRecipientReadinessOptions = {}
): Promise<TestnetRecipientReadinessResult> {
  const address = typeof addressInput === "string" ? addressInput.trim() : "";
  const base = { network: "testnet" as const, address };

  if (!isValidStellarPublicKey(address)) {
    return {
      status: "invalid_request",
      ...base,
      message: "Enter a valid Stellar public destination address (G...). No Horizon request was made.",
    };
  }
  if (!isValidPaymentAsset(assetInput)) {
    return {
      status: "invalid_request",
      ...base,
      message: "Select native XLM or an issued asset with its exact code and valid issuer. No Horizon request was made.",
    };
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > MAX_TIMEOUT_MS) {
    return {
      status: "invalid_request",
      ...base,
      message: `The recipient lookup timeout must be between 1 and ${MAX_TIMEOUT_MS} milliseconds. No Horizon request was made.`,
    };
  }
  if (options.signal?.aborted) {
    return { status: "cancelled", ...base, message: "Recipient readiness lookup was cancelled." };
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") {
    return {
      status: "horizon_unavailable",
      ...base,
      reason: "network_error",
      message: "No fetch implementation is available for Stellar Testnet Horizon.",
    };
  }

  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let parentAbortListener: (() => void) | undefined;
  let timedOut = false;

  const request = (async (): Promise<TestnetRecipientReadinessResult> => {
    try {
      const response = await fetchImpl(
        `${STELLAR_TESTNET_HORIZON_URL}/accounts/${encodeURIComponent(address)}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        }
      );

      if (response.status === 404) {
        return {
          status: "unfunded_destination",
          ...base,
          httpStatus: 404,
          message: "Stellar Testnet Horizon returned 404 for this destination. The account is not currently present on Testnet; Feyo cannot create or fund it.",
        };
      }
      if (!response.ok) {
        return {
          status: "horizon_unavailable",
          ...base,
          reason: "http_error",
          httpStatus: response.status,
          message: `Stellar Testnet Horizon returned HTTP ${response.status}. Recipient readiness could not be assessed.`,
        };
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch (error) {
        return malformed(address, `Account response was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
      }
      return parseAccountResponse(
        payload,
        address,
        assetInput,
        getLatestLedger(response),
        options.now ?? (() => new Date())
      );
    } catch (error) {
      if (options.signal?.aborted) {
        return { status: "cancelled", ...base, message: "Recipient readiness lookup was cancelled." };
      }
      return {
        status: "horizon_unavailable",
        ...base,
        reason: "network_error",
        message: `Could not reach Stellar Testnet Horizon: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  })();

  const deadline = new Promise<TestnetRecipientReadinessResult>((resolve) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
      resolve({
        status: "horizon_unavailable",
        ...base,
        reason: "timeout",
        message: `The read-only recipient check exceeded ${timeoutMs} ms and was cancelled. Try again when Testnet Horizon is available.`,
      });
    }, timeoutMs);
  });

  const cancelled = new Promise<TestnetRecipientReadinessResult>((resolve) => {
    if (!options.signal) return;
    parentAbortListener = () => {
      controller.abort();
      resolve({ status: "cancelled", ...base, message: "Recipient readiness lookup was cancelled." });
    };
    options.signal.addEventListener("abort", parentAbortListener, { once: true });
  });

  try {
    return await Promise.race([request, deadline, cancelled]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    if (parentAbortListener && options.signal) {
      options.signal.removeEventListener("abort", parentAbortListener);
    }
    if (timedOut) controller.abort();
  }
}
