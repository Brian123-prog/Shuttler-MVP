/**
 * Money is always an integer number of minor units (kobo for NGN).
 * Never use floating point for financial amounts.
 * N150 = 15000 kobo.
 */
export type Kobo = number;

const NAIRA_INPUT = /^\d{1,12}(\.\d{1,2})?$/;

/** Parse user text such as "150" or "150.50" into kobo, or null if invalid. */
export function parseNairaToKobo(input: string): Kobo | null {
  const value = input.trim();
  if (!NAIRA_INPUT.test(value)) return null;
  const [whole = "0", frac = ""] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Format kobo as a naira string, e.g. 15000 -> "\u20A6150.00". */
export function formatKobo(kobo: Kobo): string {
  if (!Number.isSafeInteger(kobo)) throw new RangeError("Amount must be a safe integer of kobo");
  const negative = kobo < 0;
  const abs = Math.abs(kobo);
  const whole = Math.trunc(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const frac = (abs % 100).toString().padStart(2, "0");
  return `${negative ? "-" : ""}\u20A6${whole}.${frac}`;
}

/** Change owed for a cash payment. Throws if cash is less than the fare. */
export function calculateChange(cashKobo: Kobo, fareKobo: Kobo): Kobo {
  if (![cashKobo, fareKobo].every(Number.isSafeInteger)) throw new RangeError("Amounts must be integer kobo");
  if (cashKobo < fareKobo) throw new RangeError("Cash given is less than the fare");
  return cashKobo - fareKobo;
}
