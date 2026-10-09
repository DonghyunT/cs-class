"use client";
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./practice-guidance.module.css";

export function PracticeGuidance({ focused, label, children, initiallyOpen = true }: { focused: boolean; label: string; children: ReactNode; initiallyOpen?: boolean }) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (details.current) details.current.open = focused ? false : initiallyOpen; }, [focused, initiallyOpen]);
  return <details ref={details} className={styles.guidance} data-focused={focused} open={!focused && initiallyOpen}><summary>{label}</summary><div>{children}</div></details>;
}
