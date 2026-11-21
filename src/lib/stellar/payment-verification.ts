import { MAX_STROOPS, parsePaymentAmount } from "../payments/money";
import { isValidStellarPublicKey } from "./address";
import {
  STELLAR_TESTNET_HORIZON_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "./network";

/**
 * Read-only verification of a classic payment recorded by Stellar Testnet.
 *
 * This module never builds, signs, or submits transactions. A verified result
 * is created only after a successful transaction and one exact payment
 * operation have both been parsed from the configured Testnet Horizon client.
 */

const TRANSACTION_HASH_PATTERN = /^[a-fA-F0-9]{64}$/;
const ASSET_CODE_PATTERN = /^[A-Za-z0-9]{1,12}$/;

export type TestnetPaymentAsset =
  | { type: "native"; code: "XLM" }
  | { type: "issued"; code: string; issuer: string };

export interface ExpectedTestnetPayment {
  network: "testnet";
  transactionHash: string;
  source: string;
  destination: string;
  /** Exact positive amount in stroops; JavaScript numbers are not accepted. */
  amountStroops: bigint;
  asset: TestnetPaymentAsset;
}

export interface TestnetHorizonVerificationClient {
  readonly horizonUrl: string;
  readonly networkPassphrase: string;
  getTransaction(transactionHash: string, signal?: AbortSignal): Promise<Response>;
  getOperations(transactionHash: string, signal?: AbortSignal): Promise<Response>;
}

export interface CreateTestnetHorizonClientOptions {
  fetchImpl?: typeof fetch;
}

/** Creates a client locked to the official public Stellar Testnet Horizon URL. */
export function createTestnetHorizonVerificationClient(
  options: CreateTestnetHorizonClientOptions = {}
): TestnetHorizonVerificationClient {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const request = (path: string, signal?: AbortSignal): Promise<Response> => {
    if (typeof fetchImpl !== "function") {
      return Promise.reject(new Error("No fetch implementation is available."));
    }
    return fetchImpl(`${STELLAR_TESTNET_HORIZON_URL}${path}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });
  };

  return {
    horizonUrl: STELLAR_TESTNET_HORIZON_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    getTransaction: (hash, signal) =>
      request(`/transactions/${encodeURIComponent(hash)}`, signal),
    getOperations: (hash, signal) =>
      request(
        `/transactions/${encodeURIComponent(hash)}/operations?limit=200&order=asc`,
        signal
      ),
  };
}

export type VerificationStage = "transaction" | "operations";
export type PaymentMismatchField =
  | "source"
  | "destination"
  | "amount"
  | "asset"
  | "operation_type";

export interface VerifiedTestnetPaymentEvidence {
  readonly network: "testnet";
  readonly networkPassphrase: typeof STELLAR_TESTNET_PASSPHRASE;
  readonly horizonUrl: string;
  readonly transactionHash: string;
  readonly ledger: number;
  readonly ledgerClosedAt: string;
  readonly operationId: string;
  readonly source: string;
  readonly destination: string;
  /** Decimal string because evidence may be rendered or serialized without BigInt coercion. */
  readonly amountStroops: string;
  readonly asset: TestnetPaymentAsset;
  readonly verifiedAt: string;
}

export type TestnetPaymentVerificationResult =
  | { status: "verified"; evidence: VerifiedTestnetPaymentEvidence }
  | {
      status: "not_found";
      network: "testnet";
      transactionHash: string;
      message: string;
    }
  | {
      status: "failed";
      network: "testnet";
      transactionHash: string;
      ledger: number;
      message: string;
    }
  | {
      status: "mismatched";
      network: "testnet";
      transactionHash: string;
      ledger: number;
      mismatches: PaymentMismatchField[];
      paymentOperationCount: number;
      message: string;
    }
  | {
      status: "invalid_request";
      network: "testnet";
      issues: string[];
      message: string;
    }
  | {
      status: "unavailable";
      network: "testnet";
      transactionHash?: string;
      stage: VerificationStage;
      httpStatus?: number;
      details?: string;
      message: string;
    }
  | {
      status: "malformed";
      network: "testnet";
      transactionHash: string;
      stage: VerificationStage;
      details: string;
      message: string;
    };

const trustedEvidence = new WeakSet<object>();

/**
 * Runtime provenance check. Plain objects and deserialized booleans cannot
 * become trusted verification evidence without a new Horizon verification.
 */
export function isVerifiedTestnetPaymentEvidence(
  value: unknown
): value is VerifiedTestnetPaymentEvidence {
  return typeof value === "object" && value !== null && trustedEvidence.has(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidAsset(asset: unknown): asset is TestnetPaymentAsset {
  if (!isRecord(asset)) return false;
  if (asset.type === "native") return asset.code === "XLM" && asset.issuer === undefined;
  return (
    asset.type === "issued" &&
    typeof asset.code === "string" &&
    ASSET_CODE_PATTERN.test(asset.code) &&
    isValidStellarPublicKey(asset.issuer)
  );
}

function validateExpectedPayment(input: unknown): string[] {
  if (!isRecord(input)) return ["Expected payment details must be an object."];

  const issues: string[] = [];
  if (input.network !== "testnet") {
    issues.push("Only Stellar Testnet verification is supported.");
  }
  if (
    typeof input.transactionHash !== "string" ||
    !TRANSACTION_HASH_PATTERN.test(input.transactionHash)
  ) {
    issues.push("Transaction hash must contain exactly 64 hexadecimal characters.");
  }
  if (!isValidStellarPublicKey(input.source)) {
    issues.push("Source must be a valid Stellar public key.");
  }
  if (!isValidStellarPublicKey(input.destination)) {
    issues.push("Destination must be a valid Stellar public key.");
  }
  if (
    typeof input.amountStroops !== "bigint" ||
    input.amountStroops <= BigInt(0) ||
    input.amountStroops > MAX_STROOPS
  ) {
    issues.push("Amount must be a positive int64 value expressed as bigint stroops.");
  }
  if (!isValidAsset(input.asset)) {
    issues.push("Asset must be native XLM or an issued asset with an exact code and issuer.");
  }
  return issues;
}

function malformed(
  transactionHash: string,
  stage: VerificationStage,
  details: string
): TestnetPaymentVerificationResult {
  return {
    status: "malformed",
    network: "testnet",
    transactionHash,
    stage,
    details,
    message: `Stellar Testnet Horizon returned malformed ${stage} evidence.`,
  };
}

async function readJson(
  response: Response,
  transactionHash: string,
  stage: VerificationStage
): Promise<{ ok: true; payload: unknown } | { ok: false; result: TestnetPaymentVerificationResult }> {
  try {
    return { ok: true, payload: await response.json() };
  } catch (error) {
    return {
      ok: false,
      result: malformed(
        transactionHash,
        stage,
        `Response body was not valid JSON: ${error instanceof Error ? error.message : String(error)}`
      ),
    };
  }
}

interface ParsedTransaction {
  hash: string;
  ledger: number;
  successful: boolean;
  createdAt: string;
  operationCount: number;
}

function parseTransaction(
  payload: unknown,
  expectedHash: string
): { ok: true; value: ParsedTransaction } | { ok: false; details: string } {
  if (!isRecord(payload)) return { ok: false, details: "Expected an object." };
  if (
    typeof payload.hash !== "string" ||
    payload.hash.toLowerCase() !== expectedHash
  ) {
    return { ok: false, details: "Transaction hash did not match the requested hash." };
  }
  if (!Number.isSafeInteger(payload.ledger) || (payload.ledger as number) <= 0) {
    return { ok: false, details: "Transaction ledger must be a positive safe integer." };
  }
  if (typeof payload.successful !== "boolean") {
    return { ok: false, details: "Transaction successful flag must be boolean." };
  }
  if (
    typeof payload.created_at !== "string" ||
    Number.isNaN(Date.parse(payload.created_at))
  ) {
    return { ok: false, details: "Transaction created_at must be a valid timestamp." };
  }
  if (!isValidStellarPublicKey(payload.source_account)) {
    return { ok: false, details: "Transaction source_account was invalid." };
  }
  if (!Number.isSafeInteger(payload.operation_count) || (payload.operation_count as number) < 0) {
    return { ok: false, details: "Transaction operation_count was invalid." };
  }

  return {
    ok: true,
    value: {
      hash: expectedHash,
      ledger: payload.ledger as number,
      successful: payload.successful,
      createdAt: payload.created_at,
      operationCount: payload.operation_count as number,
    },
  };
}

interface ParsedPaymentOperation {
  id: string;
  source: string;
  destination: string;
  amountStroops: bigint;
  asset: TestnetPaymentAsset;
}

function parsePaymentOperation(
  value: unknown,
  expectedHash: string,
  index: number
):
  | { ok: true; kind: "other" }
  | { ok: true; kind: "payment"; value: ParsedPaymentOperation }
  | { ok: false; details: string } {
  if (!isRecord(value)) {
    return { ok: false, details: `Operation at index ${index} was not an object.` };
  }
  if (
    typeof value.transaction_hash !== "string" ||
    value.transaction_hash.toLowerCase() !== expectedHash ||
    value.transaction_successful !== true
  ) {
    return {
      ok: false,
      details: `Operation at index ${index} was not successful evidence for the requested transaction.`,
    };
  }
  if (typeof value.type !== "string" || !isValidStellarPublicKey(value.source_account)) {
    return { ok: false, details: `Operation at index ${index} had invalid common fields.` };
  }
  if (value.type !== "payment") return { ok: true, kind: "other" };

  if (typeof value.id !== "string" || value.id.length === 0) {
    return { ok: false, details: `Payment operation at index ${index} had no valid id.` };
  }
  if (!isValidStellarPublicKey(value.from) || !isValidStellarPublicKey(value.to)) {
    return { ok: false, details: `Payment operation at index ${index} had invalid endpoints.` };
  }
  if (value.source_account !== value.from) {
    return {
      ok: false,
      details: `Payment operation at index ${index} had contradictory source fields.`,
    };
  }

  const amount = parsePaymentAmount(value.amount);
  if (!amount.ok) {
    return { ok: false, details: `Payment operation at index ${index} had an invalid amount.` };
  }

  let asset: TestnetPaymentAsset;
  if (value.asset_type === "native") {
    if (value.asset_code !== undefined || value.asset_issuer !== undefined) {
      return { ok: false, details: `Native payment operation at index ${index} had issued-asset fields.` };
    }
    asset = { type: "native", code: "XLM" };
  } else if (
    value.asset_type === "credit_alphanum4" ||
    value.asset_type === "credit_alphanum12"
  ) {
    const maximumCodeLength = value.asset_type === "credit_alphanum4" ? 4 : 12;
    if (
      typeof value.asset_code !== "string" ||
      !ASSET_CODE_PATTERN.test(value.asset_code) ||
      value.asset_code.length > maximumCodeLength ||
      !isValidStellarPublicKey(value.asset_issuer)
    ) {
      return { ok: false, details: `Payment operation at index ${index} had an invalid issued asset.` };
    }
    asset = {
      type: "issued",
      code: value.asset_code,
      issuer: value.asset_issuer,
    };
  } else {
    return { ok: false, details: `Payment operation at index ${index} had an unsupported asset type.` };
  }

  return {
    ok: true,
    kind: "payment",
    value: {
      id: value.id,
      source: value.from,
      destination: value.to,
      amountStroops: amount.value.minorUnits,
      asset,
    },
  };
}

function assetsEqual(left: TestnetPaymentAsset, right: TestnetPaymentAsset): boolean {
  if (left.type !== right.type || left.code !== right.code) return false;
  return left.type === "native" ||
    (right.type === "issued" && left.issuer === right.issuer);
}

function operationMismatches(
  operation: ParsedPaymentOperation,
  expected: ExpectedTestnetPayment
): PaymentMismatchField[] {
  const mismatches: PaymentMismatchField[] = [];
  if (operation.source !== expected.source) mismatches.push("source");
  if (operation.destination !== expected.destination) mismatches.push("destination");
  if (operation.amountStroops !== expected.amountStroops) mismatches.push("amount");
  if (!assetsEqual(operation.asset, expected.asset)) mismatches.push("asset");
  return mismatches;
}

export interface VerifyTestnetPaymentOptions {
  client?: TestnetHorizonVerificationClient;
  signal?: AbortSignal;
  now?: () => Date;
}

/**
 * Verifies one expected classic payment against independent Horizon evidence.
 * `not_found` is intentionally not called failed or settled: ingestion may be
 * pending, the hash may be absent, or the transaction may never have landed.
 */
export async function verifyTestnetPayment(
  expectedInput: ExpectedTestnetPayment,
  options: VerifyTestnetPaymentOptions = {}
): Promise<TestnetPaymentVerificationResult> {
  const issues = validateExpectedPayment(expectedInput);
  if (issues.length > 0) {
    return {
      status: "invalid_request",
      network: "testnet",
      issues,
      message: "Payment verification request was invalid and no Horizon lookup was made.",
    };
  }

  const expected: ExpectedTestnetPayment = {
    ...expectedInput,
    transactionHash: expectedInput.transactionHash.toLowerCase(),
  };
  const client = options.client ?? createTestnetHorizonVerificationClient();

  const clientIssues: string[] = [];
  if (client.horizonUrl !== STELLAR_TESTNET_HORIZON_URL) {
    clientIssues.push("Horizon client URL did not match the official Stellar Testnet endpoint.");
  }
  if (client.networkPassphrase !== STELLAR_TESTNET_PASSPHRASE) {
    clientIssues.push("Horizon client network passphrase did not match Stellar Testnet.");
  }
  if (clientIssues.length > 0) {
    return {
      status: "invalid_request",
      network: "testnet",
      issues: clientIssues,
      message: "Payment verification refused a client outside the official Stellar Testnet boundary.",
    };
  }

  let transactionResponse: Response;
  try {
    transactionResponse = await client.getTransaction(expected.transactionHash, options.signal);
  } catch (error) {
    return {
      status: "unavailable",
      network: "testnet",
      transactionHash: expected.transactionHash,
      stage: "transaction",
      details: error instanceof Error ? error.message : String(error),
      message: "Could not reach Stellar Testnet Horizon for transaction evidence.",
    };
  }

  if (transactionResponse.status === 404) {
    return {
      status: "not_found",
      network: "testnet",
      transactionHash: expected.transactionHash,
      message: "The transaction is not currently recorded by Testnet Horizon; it may be pending or absent.",
    };
  }
  if (!transactionResponse.ok) {
    return {
      status: "unavailable",
      network: "testnet",
      transactionHash: expected.transactionHash,
      stage: "transaction",
      httpStatus: transactionResponse.status,
      message: `Testnet Horizon could not provide transaction evidence (HTTP ${transactionResponse.status}).`,
    };
  }

  const transactionJson = await readJson(
    transactionResponse,
    expected.transactionHash,
    "transaction"
  );
  if (!transactionJson.ok) return transactionJson.result;
  const transaction = parseTransaction(transactionJson.payload, expected.transactionHash);
  if (!transaction.ok) {
    return malformed(expected.transactionHash, "transaction", transaction.details);
  }
  if (!transaction.value.successful) {
    return {
      status: "failed",
      network: "testnet",
      transactionHash: expected.transactionHash,
      ledger: transaction.value.ledger,
      message: "Testnet Horizon recorded this transaction as failed; no payment is verified.",
    };
  }

  let operationsResponse: Response;
  try {
    operationsResponse = await client.getOperations(expected.transactionHash, options.signal);
  } catch (error) {
    return {
      status: "unavailable",
      network: "testnet",
      transactionHash: expected.transactionHash,
      stage: "operations",
      details: error instanceof Error ? error.message : String(error),
      message: "Could not reach Stellar Testnet Horizon for operation evidence.",
    };
  }
  if (!operationsResponse.ok) {
    return {
      status: "unavailable",
      network: "testnet",
      transactionHash: expected.transactionHash,
      stage: "operations",
      httpStatus: operationsResponse.status,
      message: `Testnet Horizon could not provide operation evidence (HTTP ${operationsResponse.status}).`,
    };
  }

  const operationsJson = await readJson(
    operationsResponse,
    expected.transactionHash,
    "operations"
  );
  if (!operationsJson.ok) return operationsJson.result;
  if (!isRecord(operationsJson.payload) || !isRecord(operationsJson.payload._embedded)) {
    return malformed(expected.transactionHash, "operations", "Expected an _embedded object.");
  }
  const records = operationsJson.payload._embedded.records;
  if (!Array.isArray(records)) {
    return malformed(expected.transactionHash, "operations", "Expected an operations records array.");
  }
  if (records.length !== transaction.value.operationCount) {
    return malformed(
      expected.transactionHash,
      "operations",
      `Expected ${transaction.value.operationCount} operation records, received ${records.length}.`
    );
  }

  const payments: ParsedPaymentOperation[] = [];
  let sawOtherOperation = false;
  for (const [index, record] of records.entries()) {
    const parsed = parsePaymentOperation(record, expected.transactionHash, index);
    if (!parsed.ok) return malformed(expected.transactionHash, "operations", parsed.details);
    if (parsed.kind === "payment") payments.push(parsed.value);
    else sawOtherOperation = true;
  }

  for (const payment of payments) {
    if (operationMismatches(payment, expected).length !== 0) continue;

    const evidence: VerifiedTestnetPaymentEvidence = Object.freeze({
      network: "testnet",
      networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
      horizonUrl: client.horizonUrl,
      transactionHash: transaction.value.hash,
      ledger: transaction.value.ledger,
      ledgerClosedAt: transaction.value.createdAt,
      operationId: payment.id,
      source: payment.source,
      destination: payment.destination,
      amountStroops: payment.amountStroops.toString(),
      asset: Object.freeze({ ...payment.asset }),
      verifiedAt: (options.now ?? (() => new Date()))().toISOString(),
    });
    trustedEvidence.add(evidence);
    return { status: "verified", evidence };
  }

  const mismatches = new Set<PaymentMismatchField>();
  if (payments.length === 0 || sawOtherOperation) mismatches.add("operation_type");
  for (const payment of payments) {
    for (const mismatch of operationMismatches(payment, expected)) mismatches.add(mismatch);
  }

  return {
    status: "mismatched",
    network: "testnet",
    transactionHash: expected.transactionHash,
    ledger: transaction.value.ledger,
    mismatches: [...mismatches],
    paymentOperationCount: payments.length,
    message: "The transaction succeeded, but no classic payment operation exactly matched the expectation.",
  };
}

function expectedFingerprint(expected: ExpectedTestnetPayment): string {
  const asset = expected.asset.type === "native"
    ? "native:XLM"
    : `issued:${expected.asset.code}:${expected.asset.issuer}`;
  return [
    expected.network,
    expected.transactionHash.toLowerCase(),
    expected.source,
    expected.destination,
    expected.amountStroops.toString(),
    asset,
  ].join("|");
}

/** Guards UI callers from applying a response after account or intent changes. */
export class LatestPaymentVerificationRequest {
  private sequence = 0;
  private fingerprint: string | null = null;

  begin(expected: ExpectedTestnetPayment): number {
    this.sequence += 1;
    this.fingerprint = expectedFingerprint(expected);
    return this.sequence;
  }

  isCurrent(token: number, expected: ExpectedTestnetPayment): boolean {
    return token === this.sequence && this.fingerprint === expectedFingerprint(expected);
  }

  invalidate(): void {
    this.sequence += 1;
    this.fingerprint = null;
  }
}
