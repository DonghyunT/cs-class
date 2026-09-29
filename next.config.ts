import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  headers: async () => [{
    source: "/entryjs/:path*",
    headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
  }],
};

export default nextConfig;
