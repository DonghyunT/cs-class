"use client";

import { Toast, type ToastManager } from "@base-ui/react/toast";
import { useEffect, useRef, type RefObject } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import styles from "./toast.module.css";

// Toasts added with `type: "warning"` show a warning icon instead of the check.
export function SuccessToasts({ manager, label = "저장 알림" }: { manager: ToastManager; label?: string }) {
  const container = useRef<HTMLDivElement>(null);
  return <div ref={container}><Toast.Provider toastManager={manager} timeout={4000}><ToastViewport container={container} label={label} /></Toast.Provider></div>;
}

function ToastViewport({ container, label }: { container: RefObject<HTMLDivElement | null>; label: string }) {
  const { toasts } = Toast.useToastManager();
  useEffect(() => {
    // Base UI's global F6 shortcut must not enter an inert or hidden modal background.
    const keepModalFocus = (event: KeyboardEvent) => {
      if (event.key === "F6" && container.current?.closest('[inert], [aria-hidden="true"]')) {
        event.preventDefault(); event.stopImmediatePropagation();
      }
    };
    window.addEventListener("keydown", keepModalFocus, true);
    return () => window.removeEventListener("keydown", keepModalFocus, true);
  }, [container]);
  return <Toast.Portal container={container}><Toast.Viewport className={styles.viewport} aria-label={label}>
    {toasts.map((toast) => <Toast.Root key={toast.id} toast={toast} data-slot="toast" className={styles.toast}>
      <Toast.Content className={styles.content}>
        {toast.type === "warning" ? <AlertTriangle size={20} aria-hidden="true" className={styles.warning} /> : <CheckCircle2 size={20} aria-hidden="true" />}
        <Toast.Title className={styles.title} />
        <Toast.Close className={styles.close} aria-label="알림 닫기"><X size={18} aria-hidden="true" /></Toast.Close>
      </Toast.Content>
    </Toast.Root>)}
  </Toast.Viewport></Toast.Portal>;
}
