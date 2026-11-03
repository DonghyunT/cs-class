import type { NextConfig } from "next";
import entryCdn from "./scripts/entryjs-cdn.json";

// The Entry workspace host (scripts/entryjs-cdn.json) serves only /entryjs/; anything else there goes to the app.
const { workspaceHost, appHost } = entryCdn;
const onWorkspaceHost = workspaceHost ? [{ type: "host" as const, value: workspaceHost.replaceAll(".", "\\.") }] : [];

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
  }, {
    // workspace.js trusts whichever page embeds it, so outside the workspace host, which holds nothing else, it always
    // runs in an opaque sandbox, even when another site frames it without one.
    source: "/entryjs/workspace.html",
    missing: onWorkspaceHost,
    headers: [{ key: "Content-Security-Policy", value: "sandbox allow-scripts" }],
  }],
  redirects: async () => onWorkspaceHost.length && appHost ? [{
    source: "/:path((?!entryjs/).*)",
    has: onWorkspaceHost,
    destination: `https://${appHost}/:path`,
    permanent: false,
  }] : [],
};

export default nextConfig;
