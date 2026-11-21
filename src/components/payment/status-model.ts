import {
  isVerifiedTestnetPaymentEvidence,
  type VerifiedTestnetPaymentEvidence,
} from "../../lib/stellar/payment-verification";

/** Presentation contract only; adapt payment-intent domain types at the caller. */
export type PaymentStatusState =
  | "draft"
  | "awaiting_authorization"
  | "submitted"
  | "confirming"
  | "verified"
  | "failed"
  | "expired";

export type ExplorerNetwork = "testnet" | "public";

export interface PaymentStatusData {
  state: PaymentStatusState;
  source: "mock" | "local" | "network";
  network?: ExplorerNetwork;
  transactionHash?: string;
  /** Opaque runtime evidence produced by the read-only Testnet verifier. */
  verification?: VerifiedTestnetPaymentEvidence;
}

export const statusCopy = {
  draft: { label: "Draft", icon: "✎", description: "Payment details are being prepared. Nothing has been submitted." },
  awaiting_authorization: { label: "Awaiting authorization", icon: "◇", description: "Waiting for your approval. Authorization alone does not confirm a payment." },
  submitted: { label: "Submitted", icon: "↑", description: "Submission has been reported. Network verification is still required." },
  confirming: { label: "Confirming", icon: "◷", description: "Awaiting network verification. Settlement has not been verified." },
  verified: { label: "Verified", icon: "✓", description: "Network evidence confirms a successful transaction matching this payment." },
  failed: { label: "Failed", icon: "×", description: "This payment attempt reported a failure. Check its network status before starting another attempt." },
  expired: { label: "Expired", icon: "⌛", description: "The authorization or submission window has expired. Check any submitted transaction before starting again." },
} satisfies Record<PaymentStatusState, { label: string; icon: string; description: string }>;

export function explorerUrl(hash: unknown, network: unknown): string | undefined {
  if (typeof hash !== "string" || hash.length !== 64 || !/^[a-fA-F0-9]{64}$/.test(hash)) return;
  if (network !== "testnet" && network !== "public") return;
  return `https://stellar.expert/explorer/${network}/tx/${hash.toLowerCase()}`;
}

export function hasVerification(data: PaymentStatusData): boolean {
  const evidence = data.verification;
  return data.source === "network" && isVerifiedTestnetPaymentEvidence(evidence) &&
    !!explorerUrl(data.transactionHash, data.network) &&
    !!explorerUrl(evidence.transactionHash, evidence.network) &&
    data.network === "testnet" &&
    evidence.network === data.network &&
    evidence.transactionHash.toLowerCase() === data.transactionHash?.toLowerCase() &&
    Number.isSafeInteger(evidence.ledger) && evidence.ledger > 0;
}

/** The only supported adapter from verified network evidence to a verified UI state. */
export function paymentStatusFromVerifiedEvidence(
  evidence: VerifiedTestnetPaymentEvidence
): PaymentStatusData | undefined {
  if (!isVerifiedTestnetPaymentEvidence(evidence)) return undefined;
  return {
    state: "verified",
    source: "network",
    network: "testnet",
    transactionHash: evidence.transactionHash,
    verification: evidence,
  };
}

export function displayState(data: PaymentStatusData): PaymentStatusState {
  return data.state === "verified" && !hasVerification(data) ? "confirming" : data.state;
}
