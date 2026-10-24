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
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== t.id);
    emit();
  }, 4200);
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
