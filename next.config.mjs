/**
 * Build behaviour (Next.js 16):
 * - Next 16 no longer runs lint during the build. Run npm run lint yourself.
 * - Type errors are reported but do not block the build unless STRICT_TYPES=true. npm run typecheck is the strict check.
 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: { ignoreBuildErrors: process.env.STRICT_TYPES !== "true" },
  serverExternalPackages: ["qrcode"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
export default nextConfig;
