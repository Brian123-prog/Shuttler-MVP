import { NextResponse, type NextRequest } from "next/server";
import { getProvider } from "@/lib/payments";
import { handleProviderWebhook } from "@/lib/payments/process";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Receives provider notifications. Authenticity is checked with the provider's signature; the result is then re-verified with the provider. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: name } = await params;
  const setup = getProvider();
  if (!("provider" in setup) || setup.provider.id !== name) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rawBody = await request.text();
  if (rawBody.length > 20_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  try {
    const result = await handleProviderWebhook(setup.provider, rawBody, request.headers.get("x-shuttler-signature"));
    if (!result.ok) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    return NextResponse.json({ received: true });
  } catch {
    // A non-2xx response makes the provider retry; processing is idempotent.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
