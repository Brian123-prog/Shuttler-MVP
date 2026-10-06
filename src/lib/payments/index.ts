import "server-only";
import { MockFinancialProvider } from "./mock";
import type { FinancialProvider } from "./provider";

export type ProviderSetup = { provider: FinancialProvider; webhookSecret: string } | { error: string };

/**
 * Chooses the provider from FINANCIAL_PROVIDER. Only "mock" exists today. The test provider is refused on a production
 * deployment unless ALLOW_MOCK_PAYMENTS=true, so a test provider can never be mistaken for a real one.
 */
export function getProvider(): ProviderSetup {
  const name = (process.env.FINANCIAL_PROVIDER ?? "").trim().toLowerCase();
  const secret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";
  if (!name) return { error: "Payments are not enabled." };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: "Payments are not configured." };
  if (name === "mock") {
    if (secret.length < 24) return { error: "Payments are not configured." };
    if (process.env.VERCEL_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") return { error: "Payments are not enabled." };
    return { provider: new MockFinancialProvider(secret), webhookSecret: secret };
  }
  return { error: "Payments are not enabled." };
}

export function paymentsEnabled(): boolean {
  return "provider" in getProvider();
}
