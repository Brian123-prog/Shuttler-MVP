import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Alert, Button, Card } from "@/components/ui";
import { formatKobo } from "@/lib/money";
import { getProvider } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { completeMockPaymentAction, declineMockPaymentAction } from "./actions";

export const metadata: Metadata = { title: "Test payment" };
export const dynamic = "force-dynamic";

export default async function MockCheckoutPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const setup = getProvider();
  if (!("provider" in setup) || setup.provider.id !== "mock" || !/^MOCK-[0-9a-f-]{36}$/.test(reference)) notFound();

  const db = createAdminClient();
  const { data: tx } = await db.from("mock_provider_transactions").select("amount_kobo, status").eq("reference", reference).maybeSingle();
  if (!tx) notFound();

  return (
    <main id="main" className="mx-auto max-w-md space-y-5 px-4 py-10">
      <Logo />
      <Alert tone="warning" title="Test payment provider">This is a stand-in for a real payment provider. No real money is moved.</Alert>
      <Card className="space-y-4">
        <p className="text-sm text-slate-600">Amount to pay</p>
        <p className="text-3xl font-bold text-brand-900">{formatKobo(tx.amount_kobo as number)}</p>
        {tx.status === "PENDING" ? (
          <div className="flex flex-wrap gap-3">
            <form action={completeMockPaymentAction}><input type="hidden" name="reference" value={reference} /><Button type="submit" size="lg">Complete test payment</Button></form>
            <form action={declineMockPaymentAction}><input type="hidden" name="reference" value={reference} /><Button type="submit" size="lg" variant="secondary">Decline</Button></form>
          </div>
        ) : (
          <p className="text-sm text-slate-700">This payment has already been {tx.status === "SUCCESS" ? "completed" : "declined"}.</p>
        )}
      </Card>
    </main>
  );
}
