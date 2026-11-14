// Production builds point this at the workspace host or the Entry CDN (scripts/entryjs-cdn.mjs); workspace.js reads
// this page's origin from the referrer, so the iframes keep referrerPolicy="origin".
import entryWorkspace from "@/lib/classroom/entry-workspace.json";

export const ENTRY_WORKSPACE_SRC = entryWorkspace.src;
// Chrome never reuses its cache inside an opaque sandbox, so on another host the workspace keeps that host's origin,
// which holds nothing but the workspace. The app's own copy stays opaque; next.config.ts enforces that as well.
export const ENTRY_WORKSPACE_SANDBOX = ENTRY_WORKSPACE_SRC.startsWith("/") ? "allow-scripts" : "allow-scripts allow-same-origin";

// The origin the frame's messages carry: its own only when the sandbox lets it keep one and it is another site's.
export function entryFrameOrigin(frame: HTMLIFrameElement) {
  const origin = new URL(frame.src).origin;
  return frame.sandbox.contains("allow-same-origin") && origin !== location.origin ? origin : "null";
}
