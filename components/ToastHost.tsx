import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useToasts } from "../lib/toaster";
import { cn } from "../utils/cn";

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "border-leaf-600/25 bg-card text-ink-900",
  error: "border-clay-600/30 bg-card text-ink-900",
  info: "border-line-strong bg-card text-ink-900",
};

const ICON_COLORS = {
  success: "text-leaf-600",
  error: "text-clay-600",
  info: "text-marigold-600",
};

export default function ToastHost() {
  const toasts = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[calc(100vw-2.5rem)] max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        return (
          <div
            key={t.id}
            className={cn(
              "animate-toast pointer-events-auto flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-[0_12px_32px_-12px_rgba(23,48,37,0.35)]",
              STYLES[t.kind]
            )}
          >
            <Icon size={17} className={cn("mt-px shrink-0", ICON_COLORS[t.kind])} />
            <p className="text-[13px] font-medium leading-snug">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}
