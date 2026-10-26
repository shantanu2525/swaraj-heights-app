import { useState } from "react";
import {
  Building2,
  Smartphone,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  Info,
  RefreshCw,
  TriangleAlert,
  CircleUser,
} from "lucide-react";
import { useAppState, findUnitByMobile, setUnitPassword, setMeta } from "../lib/store";
import { passwordRecord, verifyPassword, normalizeMobile, writeSession } from "../lib/auth";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { Session, Unit } from "../types";

interface Props {
  onLogin: (s: Session) => void;
}

type Tab = "owner" | "admin";
type Step = "mobile" | "password" | "create";

export default function LoginScreen({ onLogin }: Props) {
  const { meta, units, sheetUrl, sync } = useAppState();
  const [tab, setTab] = useState<Tab>("owner");

  // owner flow
  const [step, setStep] = useState<Step>("mobile");
  const [mobile, setMobile] = useState("");
  const [unit, setUnit] = useState<Unit | null>(null);
  const [pw, setPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  // admin flow
  const [adminPw, setAdminPw] = useState("");

  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [shake, setShake] = useState(false);

  const adminConfigured = Boolean(meta.passwordHash);
  const loadingData = sync === "syncing" && units.length === 0;
  const connected = Boolean(sheetUrl);

  function fail(message: string) {
    setErr(message);
    setShake(true);
    setTimeout(() => setShake(false), 550);
  }

  /* ---------------- owner ---------------- */

  function findFlat(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const found = findUnitByMobile(mobile);
    if (!found) {
      fail(
        units.length === 0
          ? sheetUrl
            ? "No flats are registered yet. Please ask your society admin to add your flat."
            : "The Google Sheet backend isn't configured. Add VITE_APPS_SCRIPT_URL in Vercel Production settings and redeploy."
          : "This owner mobile number isn't registered. Please contact your society admin."
      );
      return;
    }
    setUnit(found);
    setPw("");
    // No password yet → the default password is the registered mobile number
    setStep("password");
  }

  async function ownerLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!unit || busy) return;
    setBusy(true);
    setErr("");
    const firstTime = !unit.passwordHash;
    const ok = firstTime
      ? normalizeMobile(pw) === normalizeMobile(mobile) && pw.trim().length > 0
      : await verifyPassword(pw, unit.passwordHash);
    setBusy(false);
    if (!ok) {
      fail(firstTime ? "For your first login, use your mobile number as the password." : "Incorrect password.");
      setPw("");
      return;
    }
    if (firstTime) {
      setStep("create"); // force a real password
      return;
    }
    const sess = { role: "owner" as const, unitId: unit.id, mobile: unit.label };
    writeSession(sess);
    onLogin(sess);
  }

  async function createPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!unit || busy) return;
    if (newPw.length < 4 || newPw !== confirmPw) return;
    if (normalizeMobile(newPw) === normalizeMobile(mobile)) {
      fail("Please choose something different from your mobile number.");
      return;
    }
    setBusy(true);
    setUnitPassword(unit.id, await passwordRecord(newPw));
    setBusy(false);
    const sess = { role: "owner" as const, unitId: unit.id, mobile: unit.label };
    writeSession(sess);
    toast("Password created — welcome!");
    onLogin(sess);
  }

  /* ---------------- admin ---------------- */

  async function adminLogin(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !adminPw) return;
    setBusy(true);
    setErr("");
    if (!adminConfigured) {
      // bootstrap: the very first admin password
      if (adminPw.length < 4) {
        setBusy(false);
        fail("Choose at least 4 characters for the admin password.");
        return;
      }
      setMeta({ passwordHash: await passwordRecord(adminPw) });
      setBusy(false);
      writeSession({ role: "admin" });
      toast("Admin password created");
      onLogin({ role: "admin" });
      return;
    }
    const ok = await verifyPassword(adminPw, meta.passwordHash);
    setBusy(false);
    if (!ok) {
      fail("Incorrect admin password.");
      setAdminPw("");
      return;
    }
    writeSession({ role: "admin" });
    onLogin({ role: "admin" });
  }

  const pwField = (value: string, set: (v: string) => void, placeholder: string, autoFocus = false) => (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setErr("");
        }}
        autoFocus={autoFocus}
        placeholder={placeholder}
        className={cn("field pr-11", err && "border-clay-600! ring-4! ring-clay-600/10!")}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-300 transition hover:text-ink-700"
        tabIndex={-1}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[100dvh] items-start justify-center bg-paper px-4 py-6 sm:py-10">
      <div className={cn("animate-pop card my-auto w-full max-w-md overflow-hidden rounded-3xl!", shake && "animate-shake")}>
        {/* brand header */}
        <div className="pine-texture px-5 pb-6 pt-8 text-center sm:px-7">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-marigold-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
            <Building2 size={22} className="text-white" strokeWidth={2.2} />
          </div>
          {meta.name.trim() ? (
            <>
              <h1 className="font-display mt-4 text-balance text-[22px] font-semibold leading-tight tracking-tight text-white">
                {meta.name.trim()}
              </h1>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-marigold-500">
                Maintenance Khata
              </p>
              <p className="mt-1 text-[12px] text-white/45">Sign in to continue</p>
            </>
          ) : (
            <>
              <h1 className="font-display mt-4 text-[23px] font-semibold tracking-tight text-white">
                Maintenance <span className="text-marigold-500">Khata</span>
              </h1>
              <p className="mt-1 text-[12px] text-white/45">Society accounts · sign in to continue</p>
            </>
          )}

          <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/[0.05] p-1">
            {([
              { id: "owner" as Tab, label: "Flat owner", icon: CircleUser },
              { id: "admin" as Tab, label: "Admin", icon: ShieldCheck },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  setErr("");
                  setStep("mobile");
                }}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-bold transition",
                  tab === t.id ? "bg-white text-ink-950" : "text-white/55 hover:text-white"
                )}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-5 py-6 sm:px-7">
          {/* The backend URL is compiled from Vercel's Production environment. */}
          {!connected && (
            <div className="animate-view mb-5 rounded-2xl border border-clay-600/25 bg-clay-100/45 p-4">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-clay-600">
                <TriangleAlert size={13} /> Backend not configured
              </p>
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-600">
                Add <code className="font-mono text-ink-900">VITE_APPS_SCRIPT_URL</code> in Vercel{" "}
                <strong>Settings / Environment Variables</strong>, select <strong>Production</strong>, then redeploy.
              </p>
            </div>
          )}

          {/* ---------- OWNER ---------- */}
          {tab === "owner" && step === "mobile" && (
            <form onSubmit={findFlat} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  <Smartphone size={12} /> Registered owner mobile number
                </span>
                <input
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 15));
                    setErr("");
                  }}
                  inputMode="tel"
                  autoFocus
                  placeholder="98765 43210"
                  className={cn("field tnum", err && "border-clay-600! ring-4! ring-clay-600/10!")}
                />
              </label>
              {err && (
                <p className="flex items-start gap-1.5 text-[12px] font-semibold text-clay-600">
                  <ShieldAlert size={13} className="mt-px shrink-0" /> {err}
                </p>
              )}
              <button
                type="submit"
                disabled={normalizeMobile(mobile).length < 6 || loadingData}
                className="btn-primary w-full py-3!"
              >
                {loadingData ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> Loading society data…
                  </>
                ) : (
                  <>
                    Continue <ArrowRight size={15} strokeWidth={2.5} />
                  </>
                )}
              </button>
              <p className="flex items-start gap-1.5 rounded-xl bg-paper px-3.5 py-2.5 text-[11px] leading-relaxed text-ink-500">
                <Info size={13} className="mt-px shrink-0 text-marigold-600" />
                There's no sign-up. Your society admin registers the flat owner's mobile number — only that owner can log in.
              </p>
            </form>
          )}

          {tab === "owner" && step === "password" && unit && (
            <form onSubmit={ownerLogin} className="space-y-4">
              <div className="rounded-xl border border-line bg-paper/70 px-3.5 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">Signing in as</p>
                <p className="mt-0.5 text-[14px] font-bold text-ink-950">
                  {unit.label}
                  <span className="ml-2 text-[12px] font-semibold text-ink-500">
                    {unit.ownerName}
                  </span>
                </p>
              </div>

              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  <KeyRound size={12} /> Password
                </span>
                {pwField(pw, setPw, unit.passwordHash ? "Your password" : "Your mobile number", true)}
              </label>

              {!unit.passwordHash && (
                <p className="flex items-start gap-1.5 rounded-xl bg-marigold-50 px-3.5 py-2.5 text-[11px] leading-relaxed text-marigold-600">
                  <Info size={13} className="mt-px shrink-0" />
                  First time here? Use your <strong>mobile number</strong> as the password — you'll set your own next.
                </p>
              )}
              {err && (
                <p className="flex items-start gap-1.5 text-[12px] font-semibold text-clay-600">
                  <ShieldAlert size={13} className="mt-px shrink-0" /> {err}
                </p>
              )}

              <button type="submit" disabled={!pw || busy} className="btn-primary w-full py-3!">
                {busy ? "Checking…" : "Sign in"} <ArrowRight size={15} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("mobile");
                  setErr("");
                }}
                className="w-full text-center text-[11.5px] font-semibold text-ink-400 hover:text-ink-700"
              >
                ← Use a different number
              </button>
            </form>
          )}

          {tab === "owner" && step === "create" && unit && (
            <form onSubmit={createPassword} className="space-y-4">
              <div className="rounded-xl border border-leaf-600/25 bg-leaf-100/50 px-3.5 py-3">
                <p className="text-[12.5px] font-bold text-leaf-700">Welcome, {unit.label}!</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600">
                  Create your own password now. You'll use it every time you sign in.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">New password</span>
                {pwField(newPw, setNewPw, "At least 4 characters", true)}
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Confirm password</span>
                <input
                  type={show ? "text" : "password"}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter it"
                  className={cn("field", confirmPw && newPw !== confirmPw && "border-clay-600!")}
                />
              </label>
              {confirmPw && newPw !== confirmPw && <p className="text-[12px] font-semibold text-clay-600">Passwords don't match.</p>}
              {err && <p className="text-[12px] font-semibold text-clay-600">{err}</p>}
              <button type="submit" disabled={newPw.length < 4 || newPw !== confirmPw || busy} className="btn-primary w-full py-3!">
                {busy ? "Saving…" : "Create password & continue"} <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            </form>
          )}

          {/* ---------- ADMIN ---------- */}
          {tab === "admin" && (
            <form onSubmit={adminLogin} className="space-y-4">
              {!adminConfigured && (
                <div className="rounded-xl border border-marigold-500/30 bg-marigold-50 px-3.5 py-3">
                  <p className="text-[12.5px] font-bold text-ink-950">First-time setup</p>
                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-600">
                    No admin password exists yet. The password you enter now becomes the society admin password.
                  </p>
                  {!connected && (
                    <p className="mt-2 flex items-start gap-1.5 border-t border-marigold-500/20 pt-2 text-[11px] leading-relaxed text-clay-600">
                      <TriangleAlert size={12} className="mt-px shrink-0" />
                      <code className="font-mono">VITE_APPS_SCRIPT_URL</code> is missing from the Production environment
                      — this password will stay on this device until Vercel is configured and redeployed.
                    </p>
                  )}
                </div>
              )}
              <label className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  <KeyRound size={12} /> Admin password
                </span>
                {pwField(adminPw, setAdminPw, adminConfigured ? "Enter admin password" : "Create admin password", true)}
              </label>
              {err && (
                <p className="flex items-start gap-1.5 text-[12px] font-semibold text-clay-600">
                  <ShieldAlert size={13} className="mt-px shrink-0" /> {err}
                </p>
              )}
              <button type="submit" disabled={!adminPw || busy} className="btn-primary w-full py-3!">
                {busy ? "Checking…" : adminConfigured ? "Sign in as admin" : "Create & sign in"}{" "}
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
              <p className="text-center text-[11px] leading-relaxed text-ink-400">
                Admins manage flats, expenses, collections and settings.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
