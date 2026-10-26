import { useSyncExternalStore } from "react";

export interface Toast {
  id: number;
  message: string;
  kind: "success" | "error" | "info";
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();
let seq = 1;

function emit() {
  listeners.forEach((l) => l());
}

export function toast(message: string, kind: Toast["kind"] = "success") {
  const t: Toast = { id: seq++, message, kind };
  toasts = [...toasts, t];
  emit();
  // brief and non-blocking — errors linger a little longer to be readable
  const ms = kind === "error" ? 3200 : 2200;
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, ms);
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => toasts
  );
}
