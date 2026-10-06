import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicEnv } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED_PREFIXES = ["/account", "/student", "/driver", "/university-admin", "/platform-admin"];
const GUEST_ONLY = ["/login", "/register"];

function matches(path: string, prefixes: string[]): boolean {
  return prefixes.some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Refreshes the Supabase session cookie and applies coarse route protection (called from src/proxy.ts).
 * Real authorization is enforced by row level security and server-side checks, not here.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();
  if (!env) return response;

  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // If Supabase cannot be reached, treat the visitor as signed out instead of failing every request.
  let signedIn = false;
  try {
    const { data } = await supabase.auth.getUser();
    signedIn = data.user !== null;
  } catch {
    signedIn = false;
  }

  const path = request.nextUrl.pathname;
  let destination: string | null = null;
  if (!signedIn && matches(path, PROTECTED_PREFIXES)) {
    destination = `/login?next=${encodeURIComponent(path + request.nextUrl.search)}`;
  } else if (signedIn && matches(path, GUEST_ONLY)) {
    destination = "/account";
  }
  if (destination === null) return response;

  const redirect = NextResponse.redirect(new URL(destination, request.url));
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
