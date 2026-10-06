import "server-only";

export type ProviderEnvironment = "MOCK" | "SANDBOX" | "PRODUCTION";
export type ProviderStatus = "PENDING" | "SUCCESS" | "FAILED";

export type InitiatePaymentInput = {
  intentId: string;
  amountKobo: number;
  currency: "NGN";
  description: string;
  /** Path inside this app the customer returns to after the provider's checkout. */
  returnPath: string;
};
export type InitiatePaymentResult = { providerReference: string; checkoutUrl: string };
export type VerifyPaymentResult = { status: ProviderStatus; amountKobo: number | null; reason?: string };
export type ProviderEvent = { eventId: string; providerReference: string };

/**
 * Everything the rest of the app knows about a payment provider. Real providers (Ecobank sandbox and production)
 * implement this interface in later milestones; transfers and account opening are added when they are needed.
 */
export interface FinancialProvider {
  readonly id: string;
  readonly environment: ProviderEnvironment;
  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
  verifyPayment(providerReference: string): Promise<VerifyPaymentResult>;
  /** Returns the event only when the signature is valid. */
  verifyWebhook(rawBody: string, signature: string | null): ProviderEvent | null;
}
