import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  /** Minimal server trace for Docker / correct prod runtime (not `next dev`). */
  output: "standalone",
};

export default nextConfig;
