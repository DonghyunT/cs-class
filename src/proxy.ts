import { NextResponse, type NextRequest } from "next/server";

// EntryJS's audio loader uses XHR from an opaque sandbox. Preflight is allowed
// only for public editor assets, without exposing authenticated API responses.
export function proxy(request: NextRequest) {
  if (request.method === "OPTIONS") return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
    },
  });
  return NextResponse.next();
}

// Only preflights carry this header, so plain asset GETs are served without running (and billing) this function.
export const config = { matcher: [{ source: "/entryjs/:path*", has: [{ type: "header", key: "access-control-request-method" }] }] };
