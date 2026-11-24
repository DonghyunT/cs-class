import { expect, test } from "@playwright/test";
import { entryFrameOrigin } from "../src/lib/classroom/entry-workspace-frame";

// Production opens the Entry workspace on another host and trusts only messages from that origin. Every other test runs
// the local copy, whose frame is opaque ("null"), so this is the only check of the production branch.
const frame = (src: string, sandbox: string) => ({ src, sandbox: { contains: (token: string) => sandbox.split(" ").includes(token) } }) as unknown as HTMLIFrameElement;

test("작업실 메시지의 출처는 다른 호스트에서 자기 출처를 지닐 때만 그 호스트이고, 나머지는 불투명(null)이다", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "location");
  Object.defineProperty(globalThis, "location", { value: { origin: "https://app.example" }, configurable: true });
  try {
    expect(entryFrameOrigin(frame("https://workspace.example/entryjs/workspace.html?mission=name", "allow-scripts allow-same-origin"))).toBe("https://workspace.example");
    // Another host without allow-same-origin is still an opaque sandbox.
    expect(entryFrameOrigin(frame("https://workspace.example/entryjs/workspace.html", "allow-scripts"))).toBe("null");
    // The app's own copy never answers with the app's origin, whatever its sandbox says.
    expect(entryFrameOrigin(frame("https://app.example/entryjs/workspace.html", "allow-scripts"))).toBe("null");
    expect(entryFrameOrigin(frame("https://app.example/entryjs/workspace.html", "allow-scripts allow-same-origin"))).toBe("null");
  } finally {
    if (previous) Object.defineProperty(globalThis, "location", previous); else Reflect.deleteProperty(globalThis, "location");
  }
});
