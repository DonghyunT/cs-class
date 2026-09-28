"use client";

import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

// Pointer decoration stays outside React state, with at most one write per frame.
export function ReactiveSurface({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  function move(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !matchMedia("(hover: hover)").matches)
      return;
    const node = event.currentTarget;
    if (node.closest('[data-motion="reduced"]')) return;
    const rect = node.getBoundingClientRect();
    const x = Math.max(
      0,
      Math.min(1, (event.clientX - rect.left) / rect.width),
    );
    const y = Math.max(
      0,
      Math.min(1, (event.clientY - rect.top) / rect.height),
    );
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      node.style.setProperty("--tilt-x", `${(0.5 - y) * 3}deg`);
      node.style.setProperty("--tilt-y", `${(x - 0.5) * 3}deg`);
      node.style.setProperty("--light-x", `${x * 100}%`);
      node.style.setProperty("--light-y", `${y * 100}%`);
    });
  }
  function reset(event: PointerEvent<HTMLDivElement>) {
    cancelAnimationFrame(frame.current);
    event.currentTarget.style.removeProperty("--tilt-x");
    event.currentTarget.style.removeProperty("--tilt-y");
  }
  return (
    <div
      className={`landing-reactive ${className}`}
      onPointerMove={move}
      onPointerLeave={reset}
    >
      {children}
    </div>
  );
}
