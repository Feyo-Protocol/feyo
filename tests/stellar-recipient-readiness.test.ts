import assert from "node:assert/strict";
import { test } from "node:test";
import {
  inspectTestnetRecipientReadiness,
} from "../src/lib/stellar/recipient-readiness";
import { STELLAR_TESTNET_HORIZON_URL } from "../src/lib/stellar/network";

const DESTINATION = "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ";
const OTHER_DESTINATION = "GCQ7SWUVPHZ3URQDBRKURQMZKVMYR6B43MMLC6VK7U3DE2TKN552ZZT3";
const ISSUER = "GCXTYNPKR4WJ5US5VANUIOBOME2MVCFD47ZVNEBSU3COJBQIXJFCSRMD";
const OTHER_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Latest-Ledger": "123456" },
  });
}

function nativeAccount(address = DESTINATION, balance = "25.0000000") {
  return {
    account_id: address,
    balances: [{ asset_type: "native", balance }],
  };
}

function issuedAccount(overrides: Record<string, unknown> = {}, address = DESTINATION) {
  return {
    account_id: address,
    balances: [{
      asset_type: "credit_alphanum4",
      asset_code: "USDC",
      asset_issuer: ISSUER,
      balance: "12.5000000",
      limit: "100.0000000",
      buying_liabilities: "1.0000000",
      selling_liabilities: "0.5000000",
      is_authorized: true,
      is_authorized_to_maintain_liabilities: true,
      is_clawback_enabled: false,
      ...overrides,
    }],
  };
}

function issuedAsset(issuer = ISSUER) {
  return { type: "issued" as const, code: "USDC", issuer };
}

function fetchWith(response: Response | (() => Promise<Response>), onRequest?: (url: string, init?: RequestInit) => void) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    onRequest?.(String(input), init);
    return typeof response === "function" ? response() : response;
  };
}

const deterministicNow = () => new Date("2026-11-27T08:00:00.000Z");

test("recipient readiness: rejects an invalid address without contacting Horizon", async () => {
  let calls = 0;
  const result = await inspectTestnetRecipientReadiness("not-a-stellar-key", { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse(nativeAccount()), () => { calls += 1; }),
  });
  assert.equal(result.status, "invalid_request");
  assert.equal(calls, 0);
});

test("recipient readiness: reads an existing funded native-XLM destination", async () => {
  let requestedUrl = "";
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse(nativeAccount()), (url) => { requestedUrl = url; }),
    now: deterministicNow,
  });
  assert.equal(result.status, "funded_destination");
  if (result.status !== "funded_destination") return;
  assert.equal(requestedUrl, `${STELLAR_TESTNET_HORIZON_URL}/accounts/${DESTINATION}`);
  assert.equal(result.nativeBalance, "25.0000000");
  assert.equal(result.latestLedger, 123456);
  assert.equal(result.observedAt, "2026-11-27T08:00:00.000Z");
});

test("recipient readiness: maps Horizon account 404 to an unfunded destination", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse({}, 404)),
  });
  assert.equal(result.status, "unfunded_destination");
  if (result.status === "unfunded_destination") assert.equal(result.httpStatus, 404);
});

test("recipient readiness: matches issued trustlines by exact code and issuer", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount())),
    now: deterministicNow,
  });
  assert.equal(result.status, "trustline_present");
  if (result.status !== "trustline_present") return;
  assert.deepEqual(result.asset, issuedAsset());
  assert.equal(result.trustline.balance, "12.5000000");
  assert.equal(result.trustline.limit, "100.0000000");
  assert.equal(result.trustline.authorization, "authorized");
  assert.equal(result.trustline.balanceVsLimit, "below_reported_limit");
  assert.equal(result.trustline.buyingLiabilities, "1.0000000");
  assert.equal(result.trustline.sellingLiabilities, "0.5000000");
  assert.equal(result.trustline.clawbackEnabled, false);
});

test("recipient readiness: same asset code from a different issuer is not a match", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse({
      account_id: DESTINATION,
      balances: [{
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: OTHER_ISSUER,
        balance: "5.0000000",
        limit: "100.0000000",
        is_authorized: true,
      }],
    })),
  });
  assert.equal(result.status, "trustline_missing");
  if (result.status === "trustline_missing") assert.equal(result.sameCodeDifferentIssuerFound, true);
});

test("recipient readiness: reports an absent matching issued-asset trustline", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(nativeAccount())),
  });
  assert.equal(result.status, "trustline_missing");
  if (result.status === "trustline_missing") assert.equal(result.sameCodeDifferentIssuerFound, false);
});

test("recipient readiness: reports issuer maintain-liabilities-only authorization", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount({
      is_authorized: false,
      is_authorized_to_maintain_liabilities: true,
    }))),
  });
  assert.equal(result.status, "trustline_present");
  if (result.status === "trustline_present") {
    assert.equal(result.trustline.authorization, "maintain_liabilities_only");
  }
});

test("recipient readiness: reports a fully unauthorized trustline", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount({
      is_authorized: false,
      is_authorized_to_maintain_liabilities: false,
    }))),
  });
  assert.equal(result.status, "trustline_present");
  if (result.status === "trustline_present") assert.equal(result.trustline.authorization, "unauthorized");
});

test("recipient readiness: reports a balance at or above the reported trustline limit", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount({ balance: "100.0000000", limit: "100.0000000" }))),
  });
  assert.equal(result.status, "trustline_present");
  if (result.status === "trustline_present") assert.equal(result.trustline.balanceVsLimit, "at_or_above_reported_limit");
});

test("recipient readiness: keeps missing authorization flags unknown", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount({
      is_authorized: undefined,
      is_authorized_to_maintain_liabilities: undefined,
    }))),
  });
  assert.equal(result.status, "trustline_present");
  if (result.status === "trustline_present") assert.equal(result.trustline.authorization, "unknown");
});

test("recipient readiness: rejects an account response for a different address", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse(nativeAccount(OTHER_DESTINATION))),
  });
  assert.equal(result.status, "malformed_response");
});

test("recipient readiness: rejects malformed balance and issuer values", async () => {
  const badAmount = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse(nativeAccount(DESTINATION, "1.12345678"))),
  });
  assert.equal(badAmount.status, "malformed_response");

  const badIssuer = await inspectTestnetRecipientReadiness(DESTINATION, issuedAsset(), {
    fetchImpl: fetchWith(jsonResponse(issuedAccount({ asset_issuer: "not-an-issuer" }))),
  });
  assert.equal(badIssuer.status, "malformed_response");
});

test("recipient readiness: distinguishes invalid asset input before Horizon", async () => {
  let calls = 0;
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "issued", code: "USDC", issuer: "bad" }, {
    fetchImpl: fetchWith(jsonResponse(nativeAccount()), () => { calls += 1; }),
  });
  assert.equal(result.status, "invalid_request");
  assert.equal(calls, 0);
});

test("recipient readiness: classifies non-404 Horizon errors as unavailable", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: fetchWith(jsonResponse({}, 503)),
  });
  assert.equal(result.status, "horizon_unavailable");
  if (result.status === "horizon_unavailable") {
    assert.equal(result.reason, "http_error");
    assert.equal(result.httpStatus, 503);
  }
});

test("recipient readiness: classifies network exceptions as unavailable", async () => {
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    fetchImpl: async () => { throw new Error("connection refused"); },
  });
  assert.equal(result.status, "horizon_unavailable");
  if (result.status === "horizon_unavailable") assert.equal(result.reason, "network_error");
});

test("recipient readiness: deadline returns even when fetch ignores AbortSignal", async () => {
  let receivedSignal: AbortSignal | undefined;
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    timeoutMs: 10,
    fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => {});
    },
  });
  assert.equal(result.status, "horizon_unavailable");
  if (result.status === "horizon_unavailable") assert.equal(result.reason, "timeout");
  assert.equal(receivedSignal?.aborted, true);
});

test("recipient readiness: deadline also covers a response body that never settles", async () => {
  let receivedSignal: AbortSignal | undefined;
  const response = {
    ok: true,
    status: 200,
    headers: new Headers(),
    json: () => new Promise<unknown>(() => {}),
  } as Response;
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    timeoutMs: 10,
    fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal as AbortSignal;
      return response;
    },
  });
  assert.equal(result.status, "horizon_unavailable");
  if (result.status === "horizon_unavailable") assert.equal(result.reason, "timeout");
  assert.equal(receivedSignal?.aborted, true);
});

test("recipient readiness: caller cancellation resolves even when fetch ignores abort", async () => {
  const controller = new AbortController();
  let receivedSignal: AbortSignal | undefined;
  const pending = inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    timeoutMs: 500,
    signal: controller.signal,
    fetchImpl: async (_input, init) => {
      receivedSignal = init?.signal as AbortSignal;
      return new Promise<Response>(() => {});
    },
  });
  controller.abort();
  const result = await pending;
  assert.equal(result.status, "cancelled");
  assert.equal(receivedSignal?.aborted, true);
});

test("recipient readiness: an already-aborted signal makes no request", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  const result = await inspectTestnetRecipientReadiness(DESTINATION, { type: "native", code: "XLM" }, {
    signal: controller.signal,
    fetchImpl: fetchWith(jsonResponse(nativeAccount()), () => { calls += 1; }),
  });
  assert.equal(result.status, "cancelled");
  assert.equal(calls, 0);
});
