import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_STROOPS,
  parsePaymentAmount,
} from "../src/lib/payments/money";
import {
  createPaymentIntent,
  createPaymentIntentId,
  deserializePaymentIntent,
  effectiveStatus,
  hasVerifiedSettlement,
  isPreSettlementStatus,
  serializePaymentIntent,
  type CreatePaymentIntentInput,
  type PaymentAsset,
  type PaymentIntent,
  type PaymentIntentStatus,
  type PaymentNetwork,
  type SettlementVerification,
} from "../src/lib/payments/intent";

// Synthetic Testnet public keys for unit assertions; never secret keys.
const DESTINATION = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const ISSUER = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const SECRET_KEY = "S".repeat(56);

const CREATED_AT = "2026-10-25T12:00:00.000Z";
const INTENT_ID = "pi_01J9Z8Y7X6W5V4T3S2R1Q0P9N8";
const IDEMPOTENCY_KEY = "idem_0123456789abcdef";
const TRANSACTION_HASH = "a".repeat(64);

function validInput(overrides: Partial<CreatePaymentIntentInput> = {}): CreatePaymentIntentInput {
  return {
    intentId: INTENT_ID,
    amount: "12.50",
    asset: { type: "native", code: "XLM" },
    destination: DESTINATION,
    network: "testnet",
    idempotencyKey: IDEMPOTENCY_KEY,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function verification(overrides: Partial<SettlementVerification> = {}): SettlementVerification {
  return {
    network: "testnet",
    transactionHash: TRANSACTION_HASH,
    ledger: 123456,
    successful: true,
    paymentMatched: true,
    ...overrides,
  };
}

function issueFields(result: ReturnType<typeof createPaymentIntent>): string[] {
  return result.ok ? [] : result.issues.map((issue) => issue.field);
}

test("parsePaymentAmount: parses exact decimal strings into stroops", () => {
  const cases = [
    { input: "12.5", value: "12.5", minorUnits: BigInt(125000000) },
    { input: "12.50", value: "12.5", minorUnits: BigInt(125000000) },
    { input: "00012.5000000", value: "12.5", minorUnits: BigInt(125000000) },
    { input: "1", value: "1", minorUnits: BigInt(10000000) },
    { input: "0.0000001", value: "0.0000001", minorUnits: BigInt(1) },
    { input: "0.1000000", value: "0.1", minorUnits: BigInt(1000000) },
  ];

  for (const { input, value, minorUnits } of cases) {
    const result = parsePaymentAmount(input);
    assert.equal(result.ok, true, input);
    if (!result.ok) continue;
    assert.equal(result.value.value, value, input);
    assert.equal(result.value.minorUnits, minorUnits, input);
    assert.equal(result.value.decimals, 7);
  }
});

test("parsePaymentAmount: exact arithmetic avoids floating-point rounding", () => {
  const tenCents = parsePaymentAmount("0.1");
  const twentyCents = parsePaymentAmount("0.2");

  assert.equal(tenCents.ok, true);
  assert.equal(twentyCents.ok, true);
  if (!tenCents.ok || !twentyCents.ok) return;

  assert.equal(tenCents.value.minorUnits + twentyCents.value.minorUnits, BigInt(3000000));
  assert.notEqual(0.1 + 0.2, 0.3);
});

test("parsePaymentAmount: rejects zero, negative, unsafe and over-precise values", () => {
  const cases: Array<{ input: unknown; code: string }> = [
    { input: 0.1, code: "invalid_amount" },
    { input: Number.NaN, code: "invalid_amount" },
    { input: Number.POSITIVE_INFINITY, code: "invalid_amount" },
    { input: "1e3", code: "invalid_amount" },
    { input: "1,000", code: "invalid_amount" },
    { input: " 1", code: "invalid_amount" },
    { input: "1.", code: "invalid_amount" },
    { input: ".5", code: "invalid_amount" },
    { input: "+1", code: "invalid_amount" },
    { input: "", code: "invalid_amount" },
    { input: "-1", code: "amount_not_positive" },
    { input: "0", code: "amount_not_positive" },
    { input: "0.0000000", code: "amount_not_positive" },
    { input: "1.12345678", code: "unsupported_precision" },
  ];

  for (const { input, code } of cases) {
    const result = parsePaymentAmount(input);
    assert.equal(result.ok, false, String(input));
    if (result.ok) continue;
    assert.equal(result.error.code, code, String(input));
    assert.ok(result.error.message.length > 0);
  }
});

test("parsePaymentAmount: enforces the signed int64 Stellar range", () => {
  const max = parsePaymentAmount("922337203685.4775807");
  assert.equal(max.ok, true);
  if (!max.ok) return;
  assert.equal(max.value.minorUnits, MAX_STROOPS);

  const tooLarge = parsePaymentAmount("922337203685.4775808");
  assert.equal(tooLarge.ok, false);
  if (tooLarge.ok) return;
  assert.equal(tooLarge.error.code, "amount_out_of_range");
});

test("createPaymentIntent: builds a draft intent from valid input", () => {
  const result = createPaymentIntent(validInput());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.intent.intentId, INTENT_ID);
  assert.equal(result.intent.amount.value, "12.5");
  assert.equal(result.intent.amount.minorUnits, BigInt(125000000));
  assert.deepEqual(result.intent.asset, { type: "native", code: "XLM" });
  assert.equal(result.intent.destination, DESTINATION);
  assert.equal(result.intent.network, "testnet");
  assert.equal(result.intent.status, "draft");
  assert.equal(result.intent.createdAt, CREATED_AT);
  assert.equal(result.intent.idempotencyKey, IDEMPOTENCY_KEY);
  assert.equal(result.intent.verification, undefined);
  assert.equal(isPreSettlementStatus(result.intent.status), true);
});

test("createPaymentIntent: returns actionable issues for every invalid field", () => {
  const result = createPaymentIntent({
    intentId: "bad-id",
    amount: "0",
    asset: { type: "issued", code: "USDC" } as PaymentAsset,
    destination: SECRET_KEY,
    network: "mainnet" as unknown as PaymentNetwork,
    idempotencyKey: "short",
    createdAt: "2026-10-25",
    expiresAt: "2026-10-24T00:00:00.000Z",
    status: "completed" as unknown as PaymentIntentStatus,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  const fields = result.issues.map((issue) => issue.field);
  for (const field of [
    "intentId",
    "amount",
    "asset",
    "destination",
    "network",
    "idempotencyKey",
    "createdAt",
    "status",
  ]) {
    assert.ok(fields.includes(field), `expected an issue for ${field}`);
  }
  assert.ok(result.issues.every((issue) => issue.message.length > 0));
});

test("createPaymentIntent: rejects null lifecycle fields instead of defaulting them", () => {
  const result = createPaymentIntent(
    validInput({
      status: null as unknown as PaymentIntentStatus,
      createdAt: null as unknown as string,
    })
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  const fields = result.issues.map((issue) => issue.field);
  assert.ok(fields.includes("status"));
  assert.ok(fields.includes("createdAt"));
});

test("createPaymentIntent: requires an issuer for issued assets and preserves it", () => {
  const missingIssuer = createPaymentIntent(
    validInput({
      asset: { type: "issued", code: "USDC" } as unknown as PaymentAsset,
    })
  );
  assert.equal(missingIssuer.ok, false);
  assert.ok(issueFields(missingIssuer).includes("asset"));

  const badIssuer = createPaymentIntent(
    validInput({
      asset: { type: "issued", code: "USDC", issuer: "not-a-key" },
    })
  );
  assert.equal(badIssuer.ok, false);
  assert.ok(issueFields(badIssuer).includes("asset"));

  const issuedXlm = createPaymentIntent(
    validInput({
      asset: { type: "issued", code: "XLM", issuer: ISSUER },
    })
  );
  assert.equal(issuedXlm.ok, false);
  assert.ok(issueFields(issuedXlm).includes("asset"));

  const nativeWithIssuer = createPaymentIntent(
    validInput({
      asset: { type: "native", code: "XLM", issuer: ISSUER } as PaymentAsset,
    })
  );
  assert.equal(nativeWithIssuer.ok, false);
  assert.ok(issueFields(nativeWithIssuer).includes("asset"));

  const validIssued = createPaymentIntent(
    validInput({ asset: { type: "issued", code: "USDC", issuer: ISSUER } })
  );
  assert.equal(validIssued.ok, true);
  if (!validIssued.ok) return;
  assert.deepEqual(validIssued.intent.asset, { type: "issued", code: "USDC", issuer: ISSUER });
});

test("createPaymentIntent: validates the expiry window", () => {
  const beforeCreation = createPaymentIntent(
    validInput({ expiresAt: "2026-10-25T11:59:59.000Z" })
  );
  assert.equal(beforeCreation.ok, false);
  assert.ok(issueFields(beforeCreation).includes("expiresAt"));

  const nonCanonical = createPaymentIntent(validInput({ expiresAt: "2026-10-26" }));
  assert.equal(nonCanonical.ok, false);
  assert.ok(issueFields(nonCanonical).includes("expiresAt"));

  const valid = createPaymentIntent(validInput({ expiresAt: "2026-10-26T12:00:00.000Z" }));
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.intent.expiresAt, "2026-10-26T12:00:00.000Z");
});

test("createPaymentIntent: verified status requires complete matching settlement evidence", () => {
  const missingEvidence = createPaymentIntent(
    validInput({ status: "verified" })
  );
  assert.equal(missingEvidence.ok, false);
  if (missingEvidence.ok) return;
  assert.equal(missingEvidence.issues[0].code, "verification_required");

  const mismatchedNetwork = createPaymentIntent(
    validInput({
      status: "verified",
      verification: verification({ network: "public" as PaymentNetwork }),
    })
  );
  assert.equal(mismatchedNetwork.ok, false);
  if (mismatchedNetwork.ok) return;
  assert.equal(mismatchedNetwork.issues[0].code, "invalid_verification");

  const badHash = createPaymentIntent(
    validInput({ status: "verified", verification: verification({ transactionHash: "abc" }) })
  );
  assert.equal(badHash.ok, false);

  const badLedger = createPaymentIntent(
    validInput({ status: "verified", verification: verification({ ledger: 0 }) })
  );
  assert.equal(badLedger.ok, false);

  const unconfirmed = createPaymentIntent(
    validInput({
      status: "verified",
      verification: verification({ successful: false as unknown as true }),
    })
  );
  assert.equal(unconfirmed.ok, false);

  const valid = createPaymentIntent(
    validInput({ status: "verified", verification: verification() })
  );
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  assert.equal(valid.intent.status, "verified");
  assert.equal(valid.intent.verification?.transactionHash, TRANSACTION_HASH);
  assert.equal(hasVerifiedSettlement(valid.intent), true);
  assert.equal(effectiveStatus(valid.intent), "verified");
});

test("createPaymentIntent: rejects settlement evidence on non-verified statuses", () => {
  const result = createPaymentIntent(
    validInput({ status: "awaiting_authorization", verification: verification() })
  );

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.issues[0].code, "unexpected_verification");
});

test("effectiveStatus: downgrades a tampered verified intent without evidence", () => {
  const created = createPaymentIntent(validInput());
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const tampered: PaymentIntent = { ...created.intent, status: "verified" };

  assert.equal(hasVerifiedSettlement(tampered), false);
  assert.equal(effectiveStatus(tampered), "confirming");
});

test("serializePaymentIntent: emits versioned JSON without BigInt values", () => {
  const created = createPaymentIntent(
    validInput({
      asset: { type: "issued", code: "USDC", issuer: ISSUER },
      expiresAt: "2026-10-26T12:00:00.000Z",
    })
  );
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const serialized = serializePaymentIntent(created.intent);
  const payload = JSON.parse(serialized) as Record<string, unknown>;

  assert.equal(payload.version, 1);
  assert.equal(payload.amount, "12.5");
  assert.equal(typeof payload.amount, "string");
  assert.deepEqual(payload.asset, { type: "issued", code: "USDC", issuer: ISSUER });
  assert.equal(serialized.includes("minorUnits"), false);

  const roundTrip = deserializePaymentIntent(serialized);
  assert.equal(roundTrip.ok, true);
  if (!roundTrip.ok) return;
  assert.deepEqual(roundTrip.intent, created.intent);
});

test("deserializePaymentIntent: re-validates tampered and unknown payloads", () => {
  const created = createPaymentIntent(validInput());
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const payload = JSON.parse(serializePaymentIntent(created.intent)) as Record<string, unknown>;

  const tampered = deserializePaymentIntent(
    JSON.stringify({ ...payload, status: "verified", verification: undefined })
  );
  assert.equal(tampered.ok, false);
  if (tampered.ok) return;
  assert.ok(tampered.issues.some((issue) => issue.code === "verification_required"));

  const unsupported = deserializePaymentIntent(JSON.stringify({ ...payload, version: 2 }));
  assert.equal(unsupported.ok, false);
  if (unsupported.ok) return;
  assert.equal(unsupported.issues[0].code, "unsupported_version");

  const missingAmount = { ...payload };
  delete missingAmount.amount;
  const missing = deserializePaymentIntent(JSON.stringify(missingAmount));
  assert.equal(missing.ok, false);
  if (missing.ok) return;
  assert.ok(missing.issues.some((issue) => issue.field === "amount"));

  const invalidJson = deserializePaymentIntent("{not json");
  assert.equal(invalidJson.ok, false);
  if (invalidJson.ok) return;
  assert.equal(invalidJson.issues[0].code, "invalid_serialization");
});

test("createPaymentIntentId: produces a prefixed, validated identifier", () => {
  const id = createPaymentIntentId(() => "00000000-0000-4000-8000-000000000000");
  assert.equal(id, "pi_00000000-0000-4000-8000-000000000000");

  const result = createPaymentIntent(validInput({ intentId: id }));
  assert.equal(result.ok, true);
});

test("idempotency keys: accept UUIDs but remain client metadata only", () => {
  const uuid = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";
  const accepted = createPaymentIntent(validInput({ idempotencyKey: uuid }));
  assert.equal(accepted.ok, true);
  if (!accepted.ok) return;
  assert.equal(accepted.intent.idempotencyKey, uuid);

  const tooShort = createPaymentIntent(validInput({ idempotencyKey: "abc" }));
  assert.equal(tooShort.ok, false);

  const withSpaces = createPaymentIntent(
    validInput({ idempotencyKey: "idem key with spaces" })
  );
  assert.equal(withSpaces.ok, false);
});

test("isPreSettlementStatus: keeps draft and authorization separate from settlement", () => {
  assert.equal(isPreSettlementStatus("draft"), true);
  assert.equal(isPreSettlementStatus("awaiting_authorization"), true);
  assert.equal(isPreSettlementStatus("submitted"), false);
  assert.equal(isPreSettlementStatus("confirming"), false);
  assert.equal(isPreSettlementStatus("verified"), false);
  assert.equal(isPreSettlementStatus("failed"), false);
  assert.equal(isPreSettlementStatus("expired"), false);
});
