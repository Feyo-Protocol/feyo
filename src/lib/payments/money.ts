import type { Result } from "../result";

/**
 * Exact decimal money handling for payment intents.
 *
 * Amounts are accepted only as decimal strings and converted to integer
 * minor units with BigInt. JavaScript numbers (including `NaN` and
 * `Infinity`) are rejected so no floating-point rounding can occur.
 */

/** Stellar supports seven decimal places (1 XLM = 10,000,000 stroops). */
export const STELLAR_AMOUNT_DECIMALS = 7;

const STROOPS_PER_UNIT = BigInt(10) ** BigInt(STELLAR_AMOUNT_DECIMALS);
const ZERO = BigInt(0);
/** Maximum positive int64 value; Stellar amounts are signed 64-bit integers. */
export const MAX_STROOPS = BigInt("9223372036854775807");

export type AmountErrorCode =
  | "invalid_amount"
  | "unsupported_precision"
  | "amount_not_positive"
  | "amount_out_of_range";

export interface AmountError {
  code: AmountErrorCode;
  message: string;
}

export interface PaymentAmount {
  /** Canonical decimal string without trailing fractional zeros. */
  value: string;
  /** Exact integer amount in stroops (7 decimal places). */
  minorUnits: bigint;
  decimals: typeof STELLAR_AMOUNT_DECIMALS;
}

function formatMinorUnits(minorUnits: bigint): string {
  const whole = minorUnits / STROOPS_PER_UNIT;
  const fraction = (minorUnits % STROOPS_PER_UNIT)
    .toString()
    .padStart(STELLAR_AMOUNT_DECIMALS, "0")
    .replace(/0+$/, "");
  return fraction.length > 0 ? `${whole}.${fraction}` : whole.toString();
}

/**
 * Parses a decimal amount into exact stroops.
 *
 * Accepts digits with an optional fractional part of up to seven places
 * (for example `"12"`, `"12.5"`, `"0.0000001"`). Rejects negative or zero
 * values, exponent notation, signed values, whitespace, comma separators and
 * anything with more precision than Stellar can represent.
 */
export function parsePaymentAmount(input: unknown): Result<PaymentAmount, AmountError> {
  if (typeof input !== "string") {
    return {
      ok: false,
      error: {
        code: "invalid_amount",
        message:
          "Amount must be a decimal string. JavaScript numbers are not accepted for money because they can round.",
      },
    };
  }

  if (input.length === 0 || input.trim() !== input) {
    return {
      ok: false,
      error: {
        code: "invalid_amount",
        message: "Amount must be a non-empty decimal string without surrounding whitespace.",
      },
    };
  }

  if (/^-\d+(?:\.\d+)?$/.test(input)) {
    return {
      ok: false,
      error: {
        code: "amount_not_positive",
        message: "Amount must be greater than zero; negative amounts are not supported.",
      },
    };
  }

  const match = /^(\d+)(?:\.(\d+))?$/.exec(input);
  if (!match) {
    return {
      ok: false,
      error: {
        code: "invalid_amount",
        message:
          'Amount must contain only digits with an optional decimal point (for example "12.50").',
      },
    };
  }

  const whole = match[1];
  const fraction = match[2] ?? "";

  if (fraction.length > STELLAR_AMOUNT_DECIMALS) {
    return {
      ok: false,
      error: {
        code: "unsupported_precision",
        message: `Amount supports at most ${STELLAR_AMOUNT_DECIMALS} decimal places.`,
      },
    };
  }

  const normalizedWhole = whole.replace(/^0+(?=\d)/, "");
  const minorUnits =
    BigInt(normalizedWhole) * STROOPS_PER_UNIT +
    BigInt(fraction.padEnd(STELLAR_AMOUNT_DECIMALS, "0") || "0");

  if (minorUnits === ZERO) {
    return {
      ok: false,
      error: {
        code: "amount_not_positive",
        message: "Amount must be greater than zero.",
      },
    };
  }

  if (minorUnits > MAX_STROOPS) {
    return {
      ok: false,
      error: {
        code: "amount_out_of_range",
        message: "Amount exceeds the maximum Stellar amount.",
      },
    };
  }

  return {
    ok: true,
    value: {
      value: formatMinorUnits(minorUnits),
      minorUnits,
      decimals: STELLAR_AMOUNT_DECIMALS,
    },
  };
}
