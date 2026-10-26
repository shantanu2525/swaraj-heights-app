import { useEffect, useState } from "react";
import { Building2, Check, CloudDownload, LogOut, RefreshCw, TriangleAlert } from "lucide-react";
import { cn } from "../utils/cn";

interface Props {
  /** true while the sheet pull is in flight */
  syncing: boolean;
  /** sheet reachable at all */
  connected: boolean;
  /** sync finished but the flat still isn't there */
  notFound?: boolean;
  flatHint?: string;
  onRetry: () => void;
  onLogout: () => void;
}

const STEPS = ["Connecting to your society sheet", "Loading flats & residents", "Loading dues & receipts"];

/**
 * Shown to a resident right after login while the Google Sheet pull is still
 * running, so they never land on a half-empty "My Dues" screen.
 */
export default function SyncGate({ syncing, connected, notFound, flatHint, onRetry, onLogout }: Props) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // advance the checklist while we wait (purely indicative pacing)
  useEffect(() => {
    if (!syncing) return;
    setStep(0);
    const a = setTimeout(() => setStep(1), 700);
    const b = setTimeout(() => setStep(2), 1600);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [syncing]);

  useEffect(() => {
    if (!syncing) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [syncing]);

  const slow = elapsed >= 8;

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-paper px-4 py-6 sm:py-10">
      <div className="animate-pop card my-auto w-full max-w-sm overflow-hidden rounded-3xl!">
        <div className="pine-texture px-5 pb-7 pt-8 text-center sm:px-7">
          {/* progress ring */}
          <div className="relative mx-auto size-20">
            <svg viewBox="0 0 48 48" className="size-20 -rotate-90">
              <circle cx="24" cy="24" r="21" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
              {syncing ? (
                <circle
                  cx="24"
                  cy="24"
                  r="21"
                  fill="none"
                  stroke="#d98a12"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="33 99"
                  className="origin-center animate-spin"
                  style={{ animationDuration: "1.1s" }}
                />
              ) : (
                <circle
                  cx="24"
                  cy="24"
                  r="21"
                  fill="none"
                  stroke={notFound ? "#b3432b" : "#2c7a4b"}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray="132 132"
                />
              )}
            </svg>
            <span className="absolute inset-0 grid place-items-center">
              {syncing ? (
                <CloudDownload size={24} className="text-marigold-500" />
              ) : notFound ? (
                <TriangleAlert size={24} className="text-clay-600" />
              ) : (
                <Building2 size={24} className="text-leaf-600" />
              )}
            </span>
          </div>

          <h2 className="font-display mt-5 text-[20px] font-semibold tracking-tight text-white">
            {syncing ? "Getting your details ready" : notFound ? "Flat not found yet" : "Almost there"}
          </h2>
          <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
            {syncing
              ? "Fetching the latest records from your society's Google Sheet."
              : notFound
                ? connected
                  ? "We synced successfully, but your flat isn't in the register yet."
                  : "This device isn't connected to your society's data."
                : "Finishing up."}
          </p>
        </div>

        <div className="px-5 py-6 sm:px-7">
          {syncing ? (
            <ul className="space-y-2.5">
              {STEPS.map((label, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li key={label} className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition-all duration-300",
                        done
                          ? "border-leaf-600 bg-leaf-600 text-white"
                          : active
                            ? "border-marigold-500 bg-marigold-100"
                            : "border-line bg-paper"
                      )}
                    >
                      {done ? (
                        <Check size={11} strokeWidth={3.2} />
                      ) : active ? (
                        <span className="size-1.5 animate-pulse rounded-full bg-marigold-500" />
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        "text-[12.5px] font-medium transition-colors",
                        done ? "text-ink-500" : active ? "font-semibold text-ink-950" : "text-ink-300"
                      )}
                    >
                      {label}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="space-y-3">
              <p className="rounded-xl bg-paper px-3.5 py-3 text-[12px] leading-relaxed text-ink-600">
                {connected ? (
                  <>
                    Ask your society admin to add{" "}
                    {flatHint ? <strong className="text-ink-900">{flatHint}</strong> : "your flat"} in{" "}
                    <strong className="text-ink-900">Settings → Flats &amp; residents</strong>, then tap refresh.
                  </>
                ) : (
                  <>
                    Add <strong className="font-mono text-ink-900">VITE_APPS_SCRIPT_URL</strong> in Vercel's Production
                    environment settings, then redeploy the website.
                  </>
                )}
              </p>
              <div className="flex gap-2">
                {connected && (
                  <button onClick={onRetry} className="btn-primary flex-1">
                    <RefreshCw size={15} /> Try again
                  </button>
                )}
                <button onClick={onLogout} className={cn("btn-ghost", !connected && "flex-1")}>
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            </div>
          )}

          {syncing && slow && (
            <div className="animate-fade mt-5 border-t border-line pt-4">
              <p className="text-[11.5px] leading-relaxed text-ink-400">
                Taking longer than usual — Google Sheets can be slow on the first load. You can keep waiting or{" "}
                <button onClick={onLogout} className="font-semibold text-clay-600 underline underline-offset-2">
                  sign out
                </button>
                .
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
