"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import styles from "./select.module.css";

type Option = { value: string; label: string };
export function Select({ label, value, options, onValueChange, disabled = false }: {
  label: string; value: string; options: Option[]; onValueChange: (value: string) => void | Promise<void>; disabled?: boolean;
}) {
  return <SelectPrimitive.Root items={options} value={value} disabled={disabled} onValueChange={(next) => { if (next !== null) void onValueChange(next); }}>
    <SelectPrimitive.Trigger aria-label={label} data-slot="select-trigger" className={styles.trigger}>
      <SelectPrimitive.Value className={styles.value} />
      <SelectPrimitive.Icon className={styles.icon}><ChevronDown size={16} aria-hidden="true" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner className={styles.positioner} alignItemWithTrigger={false} sideOffset={6} align="start">
        <SelectPrimitive.Popup className={styles.popup} data-slot="select-popup">
          <SelectPrimitive.List className={styles.list}>
            {options.map((option) => <SelectPrimitive.Item key={option.value} value={option.value} className={styles.item}>
              <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              <SelectPrimitive.ItemIndicator className={styles.indicator}><Check size={16} aria-hidden="true" /></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>)}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>;
}
