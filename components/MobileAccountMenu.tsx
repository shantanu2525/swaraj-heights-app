import { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown, ShieldCheck, CircleUser, Eye, RefreshCw, X } from "lucide-react";
import { useAppState, pullNow } from "../lib/store";
import { fmtDateTime } from "../lib/format";
import { cn } from "../utils/cn";

interface Props {
  role: "admin" | "owner";
  flatLabel?: string;
  onLogout: () => void;
}

export default function MobileAccountMenu({ role, flatLabel, onLogout }: Props) {
  const { sync, lastSynced, sheetUrl } = useAppState();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isAdmin = role === "admin";

  // close on outside tap / escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setConfirm(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setConfirm(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.07] py-1.5 pl-2.5 pr-2 text-white/85 transition active:scale-[0.97]"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {isAdmin ? <ShieldCheck size={14} className="text-marigold-500" /> : <CircleUser size={14} className="text-marigold-500" />}
        <span className="tnum max-w-[86px] truncate text-[12px] font-bold">{isAdmin ? "Admin" : flatLabel}</span>
        <ChevronDown size={13} className={cn("text-white/45 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="animate-fade fixed inset-0 z-40 bg-pine-950/20" onClick={() => setOpen(false)} />
          <div className="animate-pop absolute right-0 top-[calc(100%+8px)] z-50 w-[min(248px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-card shadow-[0_18px_44px_-14px_rgba(13,31,23,0.45)]">
            {/* identity */}
            <div className="border-b border-line bg-paper/70 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">Signed in as</p>
              <p className="mt-1 flex items-center gap-2 text-[14px] font-bold text-ink-950">
                {isAdmin ? "Society Admin" : flatLabel}
                {!isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-paper px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ink-500">
                    <Eye size={9} /> View only
                  </span>
                )}
              </p>
            </div>

            {/* sync status */}
            {sheetUrl && (
              <button
                onClick={() => void pullNow()}
                disabled={sync === "syncing"}
                className="flex w-full items-center gap-2.5 border-b border-line px-4 py-3 text-left transition hover:bg-marigold-50/60 disabled:opacity-60"
              >
                <RefreshCw size={14} className={cn("shrink-0 text-ink-400", sync === "syncing" && "animate-spin")} />
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-[12.5px] font-semibold text-ink-900">
                    {sync === "syncing" ? "Syncing…" : "Refresh data"}
                  </span>
                  <span className="block truncate text-[10.5px] text-ink-400">
                    {lastSynced ? `Updated ${fmtDateTime(lastSynced)}` : "Tap to pull latest"}
                  </span>
                </span>
              </button>
            )}

            {/* logout */}
            <div className="p-2">
              {confirm ? (
                <div className="space-y-1.5">
                  <p className="px-2 pt-1 text-[11.5px] font-semibold text-ink-600">Sign out of this device?</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={onLogout}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-clay-600 px-3 py-2 text-[12.5px] font-bold text-white transition active:scale-[0.97]"
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                    <button
                      onClick={() => setConfirm(false)}
                      className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-ink-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm(true)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-clay-100/60"
                >
                  <LogOut size={14} className="shrink-0 text-clay-600" />
                  <span className="text-[12.5px] font-semibold text-clay-600">Sign out</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
