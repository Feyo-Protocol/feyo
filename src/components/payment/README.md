# Payment status

`PaymentStatus` is a controlled presentation component. It does not sign, submit,
poll, retry payments, or verify the network itself. Its styles are imported by
`src/app/globals.css`. No existing payment-intent lifecycle types were present at
implementation time; `PaymentStatusData` is a UI adapter contract, not a second
payment-intent domain model. Map the future shared intent model at the call site.

```tsx
<PaymentStatus payment={{ state: "submitted", source: "local" }} />
```

Use `mock` for demonstrations, `local` for locally observed submission, and
`network` only for results returned by the read-only Horizon verifier. Build a
verified state with `paymentStatusFromVerifiedEvidence()`. A requested
`verified` state falls back to `confirming` unless its evidence retains the
verifier's runtime provenance and identifies the same Testnet transaction hash
and positive ledger. Plain objects, copied objects, serialized flags, and hashes
alone never prove settlement. Persisted payments must be reverified before they
can regain a verified UI state.

Explorer links use StellarExpert's `public` (Mainnet) and `testnet` networks.
They require a network-sourced hash with valid syntax and an explicit supported
network. A link does not prove inclusion or success. Mock and local data never
produce links. Testnet verification is explicitly labeled as having no real value.

`lookupError` describes a refresh failure, independently of payment failure.
`onRetry` is an optional **status lookup** callback, not a payment resubmission.
The parent controls `retrying`, handles errors, and supplies updated evidence.
Pass callbacks from a client component. No retry button appears without a handler.
An expired intent does not establish the outcome of an already submitted payment.

The timeline is a list of possible stages, not inferred event history. One step
is marked current; updates use a polite atomic live region. All icons have visible
text labels, controls retain focus outlines, narrow screens use a vertical list,
and indicators are static even without reduced-motion preferences.

Run `npm test` for deterministic server-rendered component and evidence tests.
Synthetic hashes exist only in test input, never in a shipped demo or fixture.
