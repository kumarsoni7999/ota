import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /** Minimal server trace for Docker / correct prod runtime (not `next dev`). */
  output: "standalone",
  experimental: {
    /**
     * `/src/proxy.ts` runs on `/api/*`; large multipart uploads (apk/aab) can
     * exceed the default 10MB body budget and get truncated before handlers.
     */
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;
