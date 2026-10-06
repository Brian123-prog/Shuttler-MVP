import "server-only";
import { createClient } from "@/lib/supabase/server";

/** A short-lived link to a profile picture. Storage rules decide whether the signed-in user may see it. */
export async function avatarUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("avatars").createSignedUrl(path, 3600);
  return error || !data ? null : data.signedUrl;
}
