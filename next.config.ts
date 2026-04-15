import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /** Minimal server trace for Docker / correct prod runtime (not `next dev`). */
  output: "standalone",
  experimental: {
    /**
     * `/src/proxy.ts` runs on `/api/*`; large multipart uploads (OTA/APK) can
     * exceed the default body budget and fail before route handlers.
     * Next 16+: `middlewareClientMaxBodySize` was renamed to `proxyClientMaxBodySize`.
     */
    proxyClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
