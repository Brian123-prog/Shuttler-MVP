import "server-only";
import { randomUUID } from "node:crypto";
import type { ImageInfo } from "@/lib/image";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Stores the photo a driver chose at registration. The person has no session yet (they may still need to confirm their email),
 * so the server saves it into their own folder using the service role. Returns false instead of failing the registration.
 */
export async function storeRegistrationAvatar(userId: string, bytes: Uint8Array, info: ImageInfo): Promise<boolean> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return false;
  try {
    const db = createAdminClient();
    const path = `${userId}/${randomUUID()}.${info.ext}`;
    const uploaded = await db.storage.from("avatars").upload(path, bytes, { contentType: info.contentType, upsert: false });
    if (uploaded.error) return false;
    const updated = await db.from("profiles").update({ avatar_path: path }).eq("id", userId);
    if (updated.error) {
      await db.storage.from("avatars").remove([path]);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
