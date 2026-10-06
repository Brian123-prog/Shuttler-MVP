import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { Alert, Button } from "@/components/ui";
import { getUserContext } from "@/lib/auth/context";
import { homeFor } from "@/lib/auth/guards";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { logoutAction } from "../(auth)/actions";

export const metadata: Metadata = { title: "My account" };

/** Routes the signed-in user to the right dashboard. Pending-admin grants are activated here at login. */
export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  await supabase.rpc("claim_admin_grants");

  const ctx = await getUserContext();
  if (!ctx) redirect("/login");

  const disabled = ctx.profile?.account_status === "DISABLED";
  const home = disabled ? null : homeFor(ctx);
  if (home) redirect(home);

  return (
    <main id="main" className="mx-auto max-w-md space-y-5 px-4 py-10">
      <Logo />
      {disabled ? (
        <Alert tone="danger" title="Account disabled">Your account has been disabled. Contact your university transport office for help.</Alert>
      ) : (
        <Alert tone="info" title="No role assigned">Your account is not linked to a university role yet. If you expected access, contact your university administrator.</Alert>
      )}
      <form action={logoutAction}><Button type="submit" variant="secondary">Log out</Button></form>
    </main>
  );
}
