"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

// Keep this in sync with .main's max-width in lesson-shell.module.css.
const DEFAULT_MAIN_MAX_WIDTH = 1472;

export function useWorkspaceExpansion(wide: boolean, toggle: RefObject<HTMLButtonElement | null>, heading: RefObject<HTMLElement | null>, enabled = true) {
  const [hasExtraWidth, setHasExtraWidth] = useState(false);
  const restoreFocus = useRef(false);
  const visible = wide || hasExtraWidth;

  useEffect(() => {
    if (!enabled) return;
    const shell = heading.current?.closest<HTMLElement>("[data-lesson-shell]");
    if (!shell) return;
    const measure = () => {
      // The shell keeps its available width even when an expanded main has no maximum.
      const next = shell.clientWidth > DEFAULT_MAIN_MAX_WIDTH;
      if (next) restoreFocus.current = false;
      else if (!wide && toggle.current && document.activeElement === toggle.current) restoreFocus.current = true;
      setHasExtraWidth(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(shell);
    return () => { observer.disconnect(); restoreFocus.current = false; };
  }, [enabled, heading, toggle, wide]);

  useEffect(() => {
    if (visible || !restoreFocus.current) return;
    restoreFocus.current = false;
    // Removal moves focus to the body. A later input/iframe focus belongs to the user.
    if (document.activeElement === document.body) heading.current?.focus({ preventScroll: true });
  }, [heading, visible]);

  return visible;
}
