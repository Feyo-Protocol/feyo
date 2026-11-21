import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LatestPaymentVerificationRequest,
  createTestnetHorizonVerificationClient,
  isVerifiedTestnetPaymentEvidence,
  verifyTestnetPayment,
  type ExpectedTestnetPayment,
  type TestnetHorizonVerificationClient,
} from "../src/lib/stellar/payment-verification";
import {
  STELLAR_TESTNET_HORIZON_URL,
  STELLAR_TESTNET_PASSPHRASE,
} from "../src/lib/stellar/network";

const SOURCE = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const DESTINATION = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const ISSUER = "GCXTYNPKR4WJ5US5VANUIOBOME2MVCFD47ZVNEBSU3COJBQIXJFCSRMD";
const OTHER = "GCQ7SWUVPHZ3URQDBRKURQMZKVMYR6B43MMLC6VK7U3DE2TKN552ZZT3";
const HASH = "ab".repeat(32);

const transactionFixture = {
  hash: HASH,
  ledger: 123456,
  successful: true,
  created_at: "2026-11-20T10:00:00Z",
  source_account: SOURCE,
  operation_count: 1,
};

const nativePaymentFixture = {
  id: "123456789",
  transaction_hash: HASH,
  transaction_successful: true,
  source_account: SOURCE,
  type: "payment",
  from: SOURCE,
  to: DESTINATION,
  amount: "12.5000000",
  asset_type: "native",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function operationsResponse(records: unknown[]): Response {
  return jsonResponse({ _embedded: { records } });
}

function expected(overrides: Partial<ExpectedTestnetPayment> = {}): ExpectedTestnetPayment {
  return {
    network: "testnet",
    transactionHash: HASH,
    source: SOURCE,
    destination: DESTINATION,
    amountStroops: BigInt(125000000),
    asset: { type: "native", code: "XLM" },
    ...overrides,
  };
}

function client(overrides: Partial<TestnetHorizonVerificationClient> = {}): TestnetHorizonVerificationClient {
  return {
    horizonUrl: STELLAR_TESTNET_HORIZON_URL,
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    getTransaction: async () => jsonResponse(transactionFixture),
    getOperations: async () => operationsResponse([nativePaymentFixture]),
    ...overrides,
  };
}

test("verifyTestnetPayment: returns opaque evidence for one exact successful native payment", async () => {
  const result = await verifyTestnetPayment(expected(), {
    client: client(),
    now: () => new Date("2026-11-20T10:01:00.000Z"),
  });

  assert.equal(result.status, "verified");
  if (result.status !== "verified") return;
  assert.equal(isVerifiedTestnetPaymentEvidence(result.evidence), true);
  assert.deepEqual(result.evidence, {
    network: "testnet",
    networkPassphrase: STELLAR_TESTNET_PASSPHRASE,
    horizonUrl: STELLAR_TESTNET_HORIZON_URL,
    transactionHash: HASH,
    ledger: 123456,
    ledgerClosedAt: "2026-11-20T10:00:00Z",
    operationId: "123456789",
    source: SOURCE,
    destination: DESTINATION,
    amountStroops: "125000000",
    asset: { type: "native", code: "XLM" },
    verifiedAt: "2026-11-20T10:01:00.000Z",
  });
  assert.equal(Object.isFrozen(result.evidence), true);
  assert.equal(isVerifiedTestnetPaymentEvidence({ ...result.evidence }), false);
});

test("verifyTestnetPayment: verifies issued assets by exact code and issuer", async () => {
  const issuedOperation = {
    ...nativePaymentFixture,
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: ISSUER,
  };
  const result = await verifyTestnetPayment(
    expected({ asset: { type: "issued", code: "USDC", issuer: ISSUER } }),
    { client: client({ getOperations: async () => operationsResponse([issuedOperation]) }) }
  );

  assert.equal(result.status, "verified");
  if (result.status === "verified") {
    assert.deepEqual(result.evidence.asset, { type: "issued", code: "USDC", issuer: ISSUER });
  }
});

test("verifyTestnetPayment: rejects incorrect source, destination, amount, asset code, and issuer", async () => {
  const issuedBase = {
    ...nativePaymentFixture,
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: ISSUER,
  };
  const cases: Array<{ label: string; operation: Record<string, unknown>; expected: ExpectedTestnetPayment; field: string }> = [
    {
      label: "source",
      operation: { ...nativePaymentFixture, source_account: OTHER, from: OTHER },
      expected: expected(),
      field: "source",
    },
    { label: "destination", operation: { ...nativePaymentFixture, to: OTHER }, expected: expected(), field: "destination" },
    { label: "amount", operation: { ...nativePaymentFixture, amount: "12.5000001" }, expected: expected(), field: "amount" },
    {
      label: "asset code",
      operation: { ...issuedBase, asset_code: "EURC" },
      expected: expected({ asset: { type: "issued", code: "USDC", issuer: ISSUER } }),
      field: "asset",
    },
    {
      label: "issuer",
      operation: { ...issuedBase, asset_issuer: OTHER },
      expected: expected({ asset: { type: "issued", code: "USDC", issuer: ISSUER } }),
      field: "asset",
    },
  ];

  for (const item of cases) {
    const result = await verifyTestnetPayment(item.expected, {
      client: client({ getOperations: async () => operationsResponse([item.operation]) }),
    });
    assert.equal(result.status, "mismatched", item.label);
    if (result.status === "mismatched") {
      assert.ok(result.mismatches.includes(item.field as never), item.label);
    }
  }
});

test("verifyTestnetPayment: unrelated payments and non-payment operations cannot verify", async () => {
  const unrelated = { ...nativePaymentFixture, to: OTHER };
  const manageData = {
    id: "987",
    transaction_hash: HASH,
    transaction_successful: true,
    source_account: SOURCE,
    type: "manage_data",
  };

  const unrelatedResult = await verifyTestnetPayment(expected(), {
    client: client({ getOperations: async () => operationsResponse([unrelated]) }),
  });
  assert.equal(unrelatedResult.status, "mismatched");
  if (unrelatedResult.status === "mismatched") {
    assert.equal(unrelatedResult.paymentOperationCount, 1);
    assert.ok(unrelatedResult.mismatches.includes("destination"));
  }

  const wrongTypeResult = await verifyTestnetPayment(expected(), {
    client: client({ getOperations: async () => operationsResponse([manageData]) }),
  });
  assert.equal(wrongTypeResult.status, "mismatched");
  if (wrongTypeResult.status === "mismatched") {
    assert.deepEqual(wrongTypeResult.mismatches, ["operation_type"]);
    assert.equal(wrongTypeResult.paymentOperationCount, 0);
  }
});

test("verifyTestnetPayment: a failed transaction is never treated as submitted or settled", async () => {
  let operationCalls = 0;
  const result = await verifyTestnetPayment(expected(), {
    client: client({
      getTransaction: async () => jsonResponse({ ...transactionFixture, successful: false }),
      getOperations: async () => {
        operationCalls += 1;
        return operationsResponse([nativePaymentFixture]);
      },
    }),
  });

  assert.equal(result.status, "failed");
  assert.equal(operationCalls, 0);
  if (result.status === "failed") assert.match(result.message, /no payment is verified/i);
});

test("verifyTestnetPayment: distinguishes not-found from failed and unavailable", async () => {
  const notFound = await verifyTestnetPayment(expected(), {
    client: client({ getTransaction: async () => jsonResponse({}, 404) }),
  });
  assert.equal(notFound.status, "not_found");
  if (notFound.status === "not_found") assert.match(notFound.message, /pending or absent/i);

  const unavailable = await verifyTestnetPayment(expected(), {
    client: client({ getTransaction: async () => jsonResponse({}, 503) }),
  });
  assert.equal(unavailable.status, "unavailable");
  if (unavailable.status === "unavailable") {
    assert.equal(unavailable.stage, "transaction");
    assert.equal(unavailable.httpStatus, 503);
  }
});

test("verifyTestnetPayment: reports transaction and operation network failures", async () => {
  const transactionFailure = await verifyTestnetPayment(expected(), {
    client: client({ getTransaction: async () => { throw new TypeError("fetch failed"); } }),
  });
  assert.equal(transactionFailure.status, "unavailable");
  if (transactionFailure.status === "unavailable") {
    assert.equal(transactionFailure.stage, "transaction");
    assert.match(transactionFailure.details ?? "", /fetch failed/);
  }

  const operationFailure = await verifyTestnetPayment(expected(), {
    client: client({ getOperations: async () => { throw new TypeError("socket closed"); } }),
  });
  assert.equal(operationFailure.status, "unavailable");
  if (operationFailure.status === "unavailable") {
    assert.equal(operationFailure.stage, "operations");
    assert.match(operationFailure.details ?? "", /socket closed/);
  }
});

test("verifyTestnetPayment: rejects wrong network identity and endpoint before evidence is trusted", async () => {
  let calls = 0;
  const countingClient = client({
    getTransaction: async () => {
      calls += 1;
      return jsonResponse(transactionFixture);
    },
  });
  const wrongInput = await verifyTestnetPayment(
    { ...expected(), network: "public" as "testnet" },
    { client: countingClient }
  );
  assert.equal(wrongInput.status, "invalid_request");
  assert.equal(calls, 0);

  const wrongClient = await verifyTestnetPayment(expected(), {
    client: client({ networkPassphrase: "Public Global Stellar Network ; September 2015" }),
  });
  assert.equal(wrongClient.status, "invalid_request");
  assert.equal(calls, 0);

  const wrongEndpoint = await verifyTestnetPayment(expected(), {
    client: client({ horizonUrl: "https://example.invalid" }),
  });
  assert.equal(wrongEndpoint.status, "invalid_request");
  if (wrongEndpoint.status === "invalid_request") {
    assert.ok(wrongEndpoint.issues.some((issue) => /official Stellar Testnet endpoint/i.test(issue)));
  }
});

test("verifyTestnetPayment: malformed transaction, operations, and JSON fail closed", async () => {
  const wrongHash = await verifyTestnetPayment(expected(), {
    client: client({ getTransaction: async () => jsonResponse({ ...transactionFixture, hash: "cd".repeat(32) }) }),
  });
  assert.equal(wrongHash.status, "malformed");
  if (wrongHash.status === "malformed") assert.equal(wrongHash.stage, "transaction");

  const malformedOperations = await verifyTestnetPayment(expected(), {
    client: client({ getOperations: async () => jsonResponse({ _embedded: { records: "nope" } }) }),
  });
  assert.equal(malformedOperations.status, "malformed");
  if (malformedOperations.status === "malformed") assert.equal(malformedOperations.stage, "operations");

  const incompleteOperations = await verifyTestnetPayment(expected(), {
    client: client({ getOperations: async () => operationsResponse([]) }),
  });
  assert.equal(incompleteOperations.status, "malformed");
  if (incompleteOperations.status === "malformed") {
    assert.match(incompleteOperations.details, /Expected 1 operation records/);
  }

  const contradictorySource = await verifyTestnetPayment(expected(), {
    client: client({
      getOperations: async () => operationsResponse([
        { ...nativePaymentFixture, source_account: OTHER },
      ]),
    }),
  });
  assert.equal(contradictorySource.status, "malformed");
  if (contradictorySource.status === "malformed") {
    assert.match(contradictorySource.details, /contradictory source fields/i);
  }

  const invalidJson = await verifyTestnetPayment(expected(), {
    client: client({ getTransaction: async () => new Response("not json", { status: 200 }) }),
  });
  assert.equal(invalidJson.status, "malformed");
  if (invalidJson.status === "malformed") assert.match(invalidJson.details, /not valid JSON/i);
});

test("verifyTestnetPayment: malformed hashes, addresses, amounts, and assets make no request", async () => {
  let calls = 0;
  const countingClient = client({
    getTransaction: async () => {
      calls += 1;
      return jsonResponse(transactionFixture);
    },
  });
  const result = await verifyTestnetPayment(
    expected({
      transactionHash: "not-a-hash",
      source: "S".repeat(56),
      amountStroops: BigInt(0),
      asset: { type: "issued", code: "USDC", issuer: "bad" },
    }),
    { client: countingClient }
  );
  assert.equal(result.status, "invalid_request");
  if (result.status === "invalid_request") assert.equal(result.issues.length, 4);
  assert.equal(calls, 0);

  const missingHash = await verifyTestnetPayment(
    expected({ transactionHash: undefined as unknown as string }),
    { client: countingClient }
  );
  assert.equal(missingHash.status, "invalid_request");
  if (missingHash.status === "invalid_request") {
    assert.ok(missingHash.issues.some((issue) => /transaction hash/i.test(issue)));
  }
  assert.equal(calls, 0);
});

test("official client uses only the Testnet transaction and bounded operations endpoints", async () => {
  const urls: string[] = [];
  const fetchImpl: typeof fetch = async (input) => {
    urls.push(String(input));
    return urls.length === 1
      ? jsonResponse(transactionFixture)
      : operationsResponse([nativePaymentFixture]);
  };
  const result = await verifyTestnetPayment(expected(), {
    client: createTestnetHorizonVerificationClient({ fetchImpl }),
  });

  assert.equal(result.status, "verified");
  assert.deepEqual(urls, [
    `${STELLAR_TESTNET_HORIZON_URL}/transactions/${HASH}`,
    `${STELLAR_TESTNET_HORIZON_URL}/transactions/${HASH}/operations?limit=200&order=asc`,
  ]);
});

test("LatestPaymentVerificationRequest rejects stale account, hash, and invalidated responses", () => {
  const guard = new LatestPaymentVerificationRequest();
  const first = expected();
  const token = guard.begin(first);
  assert.equal(guard.isCurrent(token, first), true);
  assert.equal(guard.isCurrent(token, expected({ source: OTHER })), false);
  assert.equal(guard.isCurrent(token, expected({ transactionHash: "cd".repeat(32) })), false);

  const second = expected({ source: OTHER });
  const secondToken = guard.begin(second);
  assert.equal(guard.isCurrent(token, first), false);
  assert.equal(guard.isCurrent(secondToken, second), true);
  guard.invalidate();
  assert.equal(guard.isCurrent(secondToken, second), false);
});
