import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  headers: async () => [{
    source: "/entryjs/:path*",
    headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
  }, {
    // Entry's vendor bundle (versions in scripts/entryjs-assets.json) and sprite pictures keep their URLs when they
    // change, so a bump or sprite edit shows up to a day late; workspace.html/js/css still revalidate on every load.
    source: "/entryjs/:dir(vendor|sprites)/:path*",
    headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
  }],
};

export default nextConfig;
