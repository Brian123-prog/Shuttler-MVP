import { Alert } from "@/components/ui";

export function NotConfigured() {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <Alert tone="warning" title="Temporarily unavailable">
      {isDev ? "Supabase environment variables are missing. Copy .env.example to .env.local and fill in your project values." : "Shuttler is temporarily unavailable. Please try again later."}
    </Alert>
  );
}
