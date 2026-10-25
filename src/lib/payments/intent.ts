import { isValidStellarPublicKey } from "../stellar/address";
import { parsePaymentAmount, type PaymentAmount } from "./money";

/**
 * Payment intent domain contract.
 *
 * This module validates intent data only. It does not construct, sign, submit
 * or verify Stellar transactions, and it makes no network requests.
 */

export const PAYMENT_NETWORKS = ["testnet", "public"] as const;
export type PaymentNetwork = (typeof PAYMENT_NETWORKS)[number];

export const PAYMENT_INTENT_STATUSES = [
  "draft",
  "awaiting_authorization",
  "submitted",
  "confirming",
  "verified",
  "failed",
  "expired",
] as const;
export type PaymentIntentStatus = (typeof PAYMENT_INTENT_STATUSES)[number];

/** Statuses that exist before any settlement evidence can be trusted. */
export const PRE_SETTLEMENT_STATUSES = ["draft", "awaiting_authorization"] as const;
export type PreSettlementStatus = (typeof PRE_SETTLEMENT_STATUSES)[number];

export const PAYMENT_INTENT_SERIALIZATION_VERSION = 1;

const INTENT_ID_PATTERN = /^pi_[A-Za-z0-9_-]{8,64}$/;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const TRANSACTION_HASH_PATTERN = /^[a-fA-F0-9]{64}$/;
const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export interface NativePaymentAsset {
  type: "native";
  /** Native lumens are always XLM; no issuer is involved. */
  code: "XLM";
}

export interface IssuedPaymentAsset {
  type: "issued";
  code: string;
  issuer: string;
}

export type PaymentAsset = NativePaymentAsset | IssuedPaymentAsset;

/**
 * Trusted settlement evidence. `verified` is never inferred from a
 * submission; it requires matching network evidence supplied by a verifier.
 */
export interface SettlementVerification {
  network: PaymentNetwork;
  transactionHash: string;
  ledger: number;
  successful: true;
  paymentMatched: true;
}

export interface PaymentIntent {
  /** Caller-supplied identifier in the form `pi_<8-64 url-safe characters>`. */
  intentId: string;
  amount: PaymentAmount;
  asset: PaymentAsset;
  destination: string;
  network: PaymentNetwork;
  status: PaymentIntentStatus;
  /** Canonical ISO-8601 UTC timestamp. */
  createdAt: string;
  /** Canonical ISO-8601 UTC timestamp; must be after `createdAt`. */
  expiresAt?: string;
  /**
   * Client-supplied idempotency metadata. This field does not prevent
   * duplicate requests; enforcement must happen server-side.
   */
  idempotencyKey: string;
  verification?: SettlementVerification;
}

export type PaymentValidationCode =
  | "invalid_input"
  | "invalid_intent_id"
  | "invalid_amount"
  | "unsupported_precision"
  | "amount_not_positive"
  | "amount_out_of_range"
  | "invalid_asset"
  | "invalid_destination"
  | "unsupported_network"
  | "invalid_status"
  | "invalid_created_at"
  | "invalid_expires_at"
  | "invalid_idempotency_key"
  | "unexpected_verification"
  | "verification_required"
  | "invalid_verification"
  | "invalid_serialization"
  | "unsupported_version";

export interface PaymentValidationIssue {
  /** Dot-free field name such as `amount`, `asset`, or `$` for the document. */
  field: string;
  code: PaymentValidationCode;
  message: string;
}

export interface CreatePaymentIntentInput {
  intentId: string;
  amount: string;
  asset: PaymentAsset;
  destination: string;
  network: PaymentNetwork;
  idempotencyKey: string;
  createdAt?: string;
  expiresAt?: string;
  /** Defaults to `draft`. `verified` requires valid settlement evidence. */
  status?: PaymentIntentStatus;
  verification?: SettlementVerification;
}

export type CreatePaymentIntentResult =
  | { ok: true; intent: PaymentIntent }
  | { ok: false; issues: PaymentValidationIssue[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPaymentNetwork(value: unknown): value is PaymentNetwork {
  return typeof value === "string" && (PAYMENT_NETWORKS as readonly string[]).includes(value);
}

function isPaymentIntentStatus(value: unknown): value is PaymentIntentStatus {
  return (
    typeof value === "string" &&
    (PAYMENT_INTENT_STATUSES as readonly string[]).includes(value)
  );
}

function isCanonicalIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0) return false;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return false;
  return new Date(parsed).toISOString() === value;
}

function parseAsset(
  value: unknown
): { ok: true; value: PaymentAsset } | { ok: false; issue: PaymentValidationIssue } {
  if (!isRecord(value)) {
    return {
      ok: false,
      issue: {
        field: "asset",
        code: "invalid_asset",
        message: "Asset must be an object with type `native` or `issued`.",
      },
    };
  }

  if (value.type === "native") {
    if (value.code !== "XLM") {
      return {
        ok: false,
        issue: {
          field: "asset",
          code: "invalid_asset",
          message: "Native asset code must be `XLM`.",
        },
      };
    }
    if (value.issuer !== undefined) {
      return {
        ok: false,
        issue: {
          field: "asset",
          code: "invalid_asset",
          message: "Native XLM does not have an issuer; remove the issuer field.",
        },
      };
    }
    return { ok: true, value: { type: "native", code: "XLM" } };
  }

  if (value.type === "issued") {
    const code = value.code;
    const issuer = value.issuer;

    if (typeof code !== "string" || !ASSET_CODE_PATTERN.test(code)) {
      return {
        ok: false,
        issue: {
          field: "asset",
          code: "invalid_asset",
          message: "Issued asset code must be 1-12 alphanumeric characters.",
        },
      };
    }
    if (code.toUpperCase() === "XLM") {
      return {
        ok: false,
        issue: {
          field: "asset",
          code: "invalid_asset",
          message: "XLM is the native asset; use `{ type: \"native\", code: \"XLM\" }` instead.",
        },
      };
    }
    if (!isValidStellarPublicKey(issuer)) {
      return {
        ok: false,
        issue: {
          field: "asset",
          code: "invalid_asset",
          message: "Issued asset requires a valid Stellar issuer public key (G...).",
        },
      };
    }

    return { ok: true, value: { type: "issued", code, issuer } };
  }

  return {
    ok: false,
    issue: {
      field: "asset",
      code: "invalid_asset",
      message: "Asset type must be `native` or `issued`.",
    },
  };
}

function parseVerification(
  value: unknown,
  network: PaymentNetwork | undefined
): { ok: true; value: SettlementVerification } | { ok: false; issue: PaymentValidationIssue } {
  const invalid = (message: string): { ok: false; issue: PaymentValidationIssue } => ({
    ok: false,
    issue: { field: "verification", code: "invalid_verification", message },
  });

  if (!isRecord(value)) {
    return invalid("Settlement verification must be an object.");
  }
  if (network === undefined || value.network !== network) {
    return invalid("Settlement verification network must match the intent network.");
  }
  if (
    typeof value.transactionHash !== "string" ||
    !TRANSACTION_HASH_PATTERN.test(value.transactionHash)
  ) {
    return invalid("Settlement verification requires a 64-character transaction hash.");
  }
  if (!Number.isSafeInteger(value.ledger) || (value.ledger as number) <= 0) {
    return invalid("Settlement verification requires a positive ledger number.");
  }
  if (value.successful !== true || value.paymentMatched !== true) {
    return invalid(
      "Settlement verification requires successful network evidence matching this payment."
    );
  }

  return {
    ok: true,
    value: {
      network,
      transactionHash: value.transactionHash.toLowerCase(),
      ledger: value.ledger as number,
      successful: true,
      paymentMatched: true,
    },
  };
}

/**
 * Generates a payment intent identifier. The random source is injectable so
 * tests remain deterministic.
 */
export function createPaymentIntentId(
  randomUUID: () => string = () => globalThis.crypto.randomUUID()
): string {
  return `pi_${randomUUID()}`;
}

/**
 * Validates untrusted input and builds a payment intent.
 *
 * All field issues are collected and returned together. A `verified` status
 * is rejected unless complete, matching settlement evidence is supplied, so
 * a draft or authorization cannot masquerade as a completed payment.
 */
export function createPaymentIntent(input: CreatePaymentIntentInput): CreatePaymentIntentResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          field: "$",
          code: "invalid_input",
          message: "Payment intent input must be an object.",
        },
      ],
    };
  }

  const raw = input as unknown as Record<string, unknown>;
  const issues: PaymentValidationIssue[] = [];

  const intentId =
    typeof raw.intentId === "string" && INTENT_ID_PATTERN.test(raw.intentId)
      ? raw.intentId
      : undefined;
  if (intentId === undefined) {
    issues.push({
      field: "intentId",
      code: "invalid_intent_id",
      message: "Intent ID must use the form `pi_` followed by 8-64 URL-safe characters.",
    });
  }

  const amountResult = parsePaymentAmount(raw.amount);
  const amount = amountResult.ok ? amountResult.value : undefined;
  if (!amountResult.ok) {
    issues.push({
      field: "amount",
      code: amountResult.error.code,
      message: amountResult.error.message,
    });
  }

  const assetResult = parseAsset(raw.asset);
  const asset = assetResult.ok ? assetResult.value : undefined;
  if (!assetResult.ok) {
    issues.push(assetResult.issue);
  }

  const destination = isValidStellarPublicKey(raw.destination) ? raw.destination : undefined;
  if (destination === undefined) {
    issues.push({
      field: "destination",
      code: "invalid_destination",
      message: "Destination must be a valid Stellar public key (G..., 56 characters).",
    });
  }

  const network = isPaymentNetwork(raw.network) ? raw.network : undefined;
  if (network === undefined) {
    issues.push({
      field: "network",
      code: "unsupported_network",
      message: `Network must be one of: ${PAYMENT_NETWORKS.join(", ")}.`,
    });
  }

  const statusInput = raw.status === undefined ? "draft" : raw.status;
  const status = isPaymentIntentStatus(statusInput) ? statusInput : undefined;
  if (status === undefined) {
    issues.push({
      field: "status",
      code: "invalid_status",
      message: `Status must be one of: ${PAYMENT_INTENT_STATUSES.join(", ")}.`,
    });
  }

  const createdAtInput = raw.createdAt === undefined ? new Date().toISOString() : raw.createdAt;
  const createdAt = isCanonicalIsoTimestamp(createdAtInput) ? createdAtInput : undefined;
  if (createdAt === undefined) {
    issues.push({
      field: "createdAt",
      code: "invalid_created_at",
      message: "createdAt must be a canonical ISO-8601 UTC timestamp.",
    });
  }

  let expiresAt: string | undefined;
  if (raw.expiresAt !== undefined) {
    if (!isCanonicalIsoTimestamp(raw.expiresAt)) {
      issues.push({
        field: "expiresAt",
        code: "invalid_expires_at",
        message: "expiresAt must be a canonical ISO-8601 UTC timestamp.",
      });
    } else if (createdAt !== undefined && Date.parse(raw.expiresAt) <= Date.parse(createdAt)) {
      issues.push({
        field: "expiresAt",
        code: "invalid_expires_at",
        message: "expiresAt must be after createdAt.",
      });
    } else {
      expiresAt = raw.expiresAt;
    }
  }

  const idempotencyKey =
    typeof raw.idempotencyKey === "string" && IDEMPOTENCY_KEY_PATTERN.test(raw.idempotencyKey)
      ? raw.idempotencyKey
      : undefined;
  if (idempotencyKey === undefined) {
    issues.push({
      field: "idempotencyKey",
      code: "invalid_idempotency_key",
      message:
        "Idempotency key must be 16-128 characters from [A-Za-z0-9_-]. It is client metadata only; the server must enforce uniqueness.",
    });
  }

  let verification: SettlementVerification | undefined;
  if (status === "verified") {
    if (raw.verification === undefined) {
      issues.push({
        field: "verification",
        code: "verification_required",
        message:
          "A verified intent requires settlement evidence (network, transaction hash, ledger and successful payment match).",
      });
    } else {
      const verificationResult = parseVerification(raw.verification, network);
      if (verificationResult.ok) {
        verification = verificationResult.value;
      } else {
        issues.push(verificationResult.issue);
      }
    }
  } else if (raw.verification !== undefined) {
    issues.push({
      field: "verification",
      code: "unexpected_verification",
      message: 'Settlement verification is only accepted when status is "verified".',
    });
  }

  if (
    issues.length > 0 ||
    intentId === undefined ||
    amount === undefined ||
    asset === undefined ||
    destination === undefined ||
    network === undefined ||
    status === undefined ||
    createdAt === undefined ||
    idempotencyKey === undefined
  ) {
    return {
      ok: false,
      issues:
        issues.length > 0
          ? issues
          : [
              {
                field: "$",
                code: "invalid_input",
                message: "Payment intent input is incomplete.",
              },
            ],
    };
  }

  return {
    ok: true,
    intent: {
      intentId,
      amount,
      asset,
      destination,
      network,
      status,
      createdAt,
      idempotencyKey,
      ...(expiresAt !== undefined ? { expiresAt } : {}),
      ...(verification !== undefined ? { verification } : {}),
    },
  };
}

/**
 * Returns true only when verified status is backed by matching network
 * evidence. Authorization or submission alone never satisfies this check.
 */
export function hasVerifiedSettlement(
  intent: Pick<PaymentIntent, "network" | "status" | "verification">
): boolean {
  const verification = intent.verification;
  return (
    intent.status === "verified" &&
    verification !== undefined &&
    verification.network === intent.network &&
    TRANSACTION_HASH_PATTERN.test(verification.transactionHash) &&
    Number.isSafeInteger(verification.ledger) &&
    verification.ledger > 0 &&
    verification.successful === true &&
    verification.paymentMatched === true
  );
}

/**
 * Defense in depth: a `verified` status without evidence is presented as
 * `confirming`, matching the payment status component contract.
 */
export function effectiveStatus(intent: PaymentIntent): PaymentIntentStatus {
  return intent.status === "verified" && !hasVerifiedSettlement(intent)
    ? "confirming"
    : intent.status;
}

export function isPreSettlementStatus(status: PaymentIntentStatus): status is PreSettlementStatus {
  return (PRE_SETTLEMENT_STATUSES as readonly string[]).includes(status);
}

export interface SerializedPaymentIntent {
  version: typeof PAYMENT_INTENT_SERIALIZATION_VERSION;
  intentId: string;
  /** Canonical decimal string; minor units are derived, never serialized as BigInt. */
  amount: string;
  asset: PaymentAsset;
  destination: string;
  network: PaymentNetwork;
  status: PaymentIntentStatus;
  createdAt: string;
  expiresAt?: string;
  idempotencyKey: string;
  verification?: SettlementVerification;
}

/** Serializes an intent with a stable field order and no BigInt values. */
export function serializePaymentIntent(intent: PaymentIntent): string {
  const serialized: SerializedPaymentIntent = {
    version: PAYMENT_INTENT_SERIALIZATION_VERSION,
    intentId: intent.intentId,
    amount: intent.amount.value,
    asset:
      intent.asset.type === "native"
        ? { type: "native", code: "XLM" }
        : { type: "issued", code: intent.asset.code, issuer: intent.asset.issuer },
    destination: intent.destination,
    network: intent.network,
    status: intent.status,
    createdAt: intent.createdAt,
    idempotencyKey: intent.idempotencyKey,
  };

  if (intent.expiresAt !== undefined) serialized.expiresAt = intent.expiresAt;
  if (intent.verification !== undefined) serialized.verification = intent.verification;

  return JSON.stringify(serialized);
}

/**
 * Parses serialized intent data and re-validates every field. Unknown versions
 * and missing fields are rejected instead of being silently defaulted.
 */
export function deserializePaymentIntent(serialized: string): CreatePaymentIntentResult {
  let payload: unknown;
  try {
    payload = JSON.parse(serialized);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          field: "$",
          code: "invalid_serialization",
          message: `Serialized payment intent is not valid JSON: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }

  if (!isRecord(payload)) {
    return {
      ok: false,
      issues: [
        {
          field: "$",
          code: "invalid_serialization",
          message: "Serialized payment intent must be a JSON object.",
        },
      ],
    };
  }

  if (payload.version !== PAYMENT_INTENT_SERIALIZATION_VERSION) {
    return {
      ok: false,
      issues: [
        {
          field: "version",
          code: "unsupported_version",
          message: `Unsupported payment intent serialization version: ${JSON.stringify(
            payload.version
          )}.`,
        },
      ],
    };
  }

  const requiredFields = [
    "intentId",
    "amount",
    "asset",
    "destination",
    "network",
    "status",
    "createdAt",
    "idempotencyKey",
  ] as const;

  const missing = requiredFields
    .filter((field) => payload[field] === undefined)
    .map<PaymentValidationIssue>((field) => ({
      field,
      code: "invalid_input",
      message: `${field} is required when deserializing a payment intent.`,
    }));

  if (missing.length > 0) {
    return { ok: false, issues: missing };
  }

  return createPaymentIntent({
    intentId: payload.intentId as string,
    amount: payload.amount as string,
    asset: payload.asset as PaymentAsset,
    destination: payload.destination as string,
    network: payload.network as PaymentNetwork,
    status: payload.status as PaymentIntentStatus,
    createdAt: payload.createdAt as string,
    expiresAt: payload.expiresAt as string | undefined,
    idempotencyKey: payload.idempotencyKey as string,
    verification: payload.verification as SettlementVerification | undefined,
  });
}
