import { useState } from "react";
import {
  Sheet,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Copy,
  Check,
  Sparkles,
  Trash2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  Landmark,
  MapPin,
  Phone,
  ShieldCheck,
  LockKeyhole,
  Lock,
  CloudCheck,
  HardDrive,
} from "lucide-react";
import { useAppState, pushNow, pullNow, loadSample, clearAll, setMeta } from "../lib/store";
import { APPS_SCRIPT_CODE, SCRIPT_VERSION } from "../lib/appsScriptCode";
import { APPS_SCRIPT_WEB_APP_URL, HAS_CONFIGURED_BACKEND } from "../config";
import { passwordRecord, verifyPassword } from "../lib/auth";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import FlatsSection from "./FlatsSection";

function Section({
  step,
  title,
  desc,
  children,
  delay,
}: {
  step?: string;
  title: string;
  desc?: string;
  children: React.ReactNode;
  delay?: string;
}) {
  return (
    <section className={cn("card animate-rise p-5 sm:p-6", delay)}>
      <div className="flex items-start gap-3.5">
        {step && (
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink-900 font-display text-[14px] font-semibold text-marigold-500">
            {step}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">{title}</h3>
          {desc && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">{desc}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ app lock ------------------------------ */

function AppLockSection({ onRelock }: { onRelock?: () => void }) {
  const { meta } = useAppState();
  const enabled = Boolean(meta.passwordHash);
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState<"enable" | "change" | "remove" | null>(null);

  const pwOk = nw.length >= 4 && nw === cf;

  function reset() {
    setCur("");
    setNw("");
    setCf("");
  }

  async function enable() {
    if (!pwOk || busy) return;
    setBusy("enable");
    const rec = await passwordRecord(nw);
    setMeta({ passwordHash: rec });
    setBusy(null);
    reset();
    toast("Admin password set — only its salted hash is stored");
  }

  async function change() {
    if (!pwOk || !cur || busy) return;
    setBusy("change");
    if (!(await verifyPassword(cur, meta.passwordHash))) {
      setBusy(null);
      toast("Current password is incorrect", "error");
      return;
    }
    setMeta({ passwordHash: await passwordRecord(nw) });
    setBusy(null);
    reset();
    toast("Password updated");
  }

  async function remove() {
    if (!cur || busy) return;
    setBusy("remove");
    if (!(await verifyPassword(cur, meta.passwordHash))) {
      setBusy(null);
      toast("Current password is incorrect", "error");
      return;
    }
    setMeta({ passwordHash: "" });
    setBusy(null);
    reset();
    toast("Admin password removed", "info");
  }

  return (
    <Section
      title="Admin password"
      desc="The password you use to sign in as society admin. It's never stored or synced — only a salted SHA-256 hash is kept (in the sheet's Settings tab), so even someone reading your spreadsheet can't recover it."
      delay="rise-3"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-bold",
              enabled ? "bg-leaf-100 text-leaf-700" : "bg-paper text-ink-500"
            )}
          >
            {enabled ? <ShieldCheck size={13} /> : <LockKeyhole size={13} />}
            {enabled ? "Admin password set" : "No admin password yet"}
          </span>
          {enabled && onRelock && (
            <button onClick={onRelock} className="btn-ghost px-3! py-1.5! text-[12px]!">
              <Lock size={12.5} /> Sign out
            </button>
          )}
        </div>

        {!enabled ? (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">New password (min 4 chars)</span>
              <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} className="field w-44" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">Confirm</span>
              <input type="password" value={cf} onChange={(e) => setCf(e.target.value)} className={cn("field w-44", cf && nw !== cf && "border-clay-600!")} autoComplete="new-password" />
            </label>
            <button onClick={enable} disabled={!pwOk || Boolean(busy)} className="btn-primary">
              <LockKeyhole size={14} /> {busy === "enable" ? "Saving…" : "Set password"}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">Current password</span>
              <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="field w-40" autoComplete="current-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">New password</span>
              <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} className="field w-40" autoComplete="new-password" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">Confirm new</span>
              <input type="password" value={cf} onChange={(e) => setCf(e.target.value)} className={cn("field w-40", cf && nw !== cf && "border-clay-600!")} autoComplete="new-password" />
            </label>
            <div className="flex gap-2">
              <button onClick={change} disabled={!pwOk || !cur || Boolean(busy)} className="btn-primary">
                {busy === "change" ? "Updating…" : "Update"}
              </button>
              <button onClick={remove} disabled={!cur || Boolean(busy)} className="btn-danger" title="Verify current password to remove it">
                {busy === "remove" ? "Removing…" : "Remove password"}
              </button>
            </div>
          </div>
        )}

        {nw.length > 0 && nw.length < 4 && <p className="text-[11.5px] font-medium text-clay-600">Use at least 4 characters.</p>}
        {cf && nw !== cf && <p className="text-[11.5px] font-medium text-clay-600">Passwords don't match.</p>}
      </div>
    </Section>
  );
}

/* ------------------------------ main view ------------------------------ */

export default function SettingsView({ onRelock }: { onRelock?: () => void }) {
  const { sheetUrl, sync, lastError, records, units, payments, scriptVersion, meta } = useAppState();
  const [busy, setBusy] = useState<"push" | "pull" | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [showGuide, setShowGuide] = useState(!sheetUrl);

  const scriptOutdated = Boolean(sheetUrl) && scriptVersion !== null && scriptVersion < SCRIPT_VERSION;

  async function run(kind: "push" | "pull", fn: () => Promise<boolean>) {
    setBusy(kind);
    await fn();
    setBusy(null);
  }

  function copyScript() {
    navigator.clipboard
      .writeText(APPS_SCRIPT_CODE)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2200);
        toast("Apps Script copied — paste it in the Apps Script editor");
      })
      .catch(() => toast("Could not copy — select the code manually", "error"));
  }

  return (
    <div className="w-full space-y-4">
      {/* connection */}
      <section className="card animate-rise overflow-hidden">
        <div className="pine-texture px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white/[0.08]">
              <Sheet size={19} className="text-marigold-500" />
            </span>
            <div>
              <h3 className="font-display text-[18px] font-semibold tracking-tight text-white">Google Sheet backend</h3>
              <p className="text-[12px] text-white/45">Your spreadsheet is the database — you own every row.</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3",
              HAS_CONFIGURED_BACKEND
                ? "border-leaf-600/25 bg-leaf-100/45"
                : "border-clay-600/25 bg-clay-100/45"
            )}
          >
            {HAS_CONFIGURED_BACKEND ? (
              <CloudCheck size={17} className="mt-0.5 shrink-0 text-leaf-700" />
            ) : (
              <AlertTriangle size={17} className="mt-0.5 shrink-0 text-clay-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-bold text-ink-950">
                {HAS_CONFIGURED_BACKEND ? "Configured globally" : "Backend URL missing"}
              </p>
              {HAS_CONFIGURED_BACKEND ? (
                <p className="mt-1 truncate font-mono text-[11px] text-ink-500" title={APPS_SCRIPT_WEB_APP_URL}>
                  {APPS_SCRIPT_WEB_APP_URL}
                </p>
              ) : (
                <p className="mt-1 text-[11.5px] leading-relaxed text-ink-600">
                  Add <code className="font-mono text-ink-900">VITE_APPS_SCRIPT_URL</code> in Vercel{" "}
                  <strong>Settings / Environment Variables</strong>, select Production, then redeploy.
                </p>
              )}
            </div>
          </div>

          {sync === "error" && lastError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-clay-600/20 bg-clay-100/50 px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-clay-600" />
              <p className="text-[12.5px] leading-snug text-clay-600">{lastError}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {!sheetUrl ? (
              <p className="text-[12px] font-semibold text-clay-600">
                Configure VITE_APPS_SCRIPT_URL in Vercel Production settings to enable syncing.
              </p>
            ) : (
              <>
              <button
                  onClick={() => run("pull", () => pullNow())}
                  disabled={Boolean(busy)}
                  className="btn-ghost"
                  title="Replace local data with the sheet's contents"
                >
                  <DownloadCloud size={15} className={cn(busy === "pull" && "animate-bounce")} />
                  {busy === "pull" ? "Pulling…" : "Pull from sheet"}
                </button>
                <button
                  onClick={() =>
                    run("push", async () => {
                      const ok = await pushNow();
                      if (ok) toast("Pushed to Google Sheet");
                      return ok;
                    })
                  }
                  disabled={Boolean(busy)}
                  className="btn-primary"
                  title="Overwrite the sheet with everything stored here"
                >
                  <UploadCloud size={15} className={cn(busy === "push" && "animate-bounce")} />
                  {busy === "push" ? "Pushing…" : "Push to sheet"}
                </button>
              </>
            )}
            {sheetUrl && (
              <span className="ml-auto inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-500">
                <RefreshCw size={12} className={cn(sync === "syncing" && "animate-spin")} />
                Auto-syncs after every change
              </span>
            )}
          </div>
        </div>
      </section>

      {scriptOutdated && (
        <section className="card animate-rise rise-1 overflow-hidden">
          <div className="pine-texture flex items-center gap-3 px-6 py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-marigold-500/15">
              <RefreshCw size={19} className="text-marigold-500" />
            </span>
            <div>
              <h3 className="font-display text-[17px] font-semibold tracking-tight text-white">
                Redeploy to v{SCRIPT_VERSION}
              </h3>
              <p className="text-[12px] text-white/45">
                You're on v{scriptVersion}. v{SCRIPT_VERSION} removes the tenant password column and adds tenant
                emergency-contact, family, members, email, address and parking-slot fields.
              </p>
            </div>
          </div>

          <ol className="space-y-3 px-6 py-5">
            {[
              {
                title: "Copy the updated code",
                body: "It's the v" + SCRIPT_VERSION + " script shown below — one copy gets everything.",
              },
              {
                title: "Open the Apps Script editor",
                body: "In your Google Sheet: Extensions → Apps Script. Select all the old code, delete it, then paste.",
              },
              {
                title: "Save",
                body: "Hit the disk icon (or Ctrl/Cmd+S).",
              },
              {
                title: "Redeploy a NEW version",
                body: "Deploy → Manage deployments → pencil (Edit) → Version: “New version” → Deploy. Keep “Execute as: Me” and access “Anyone”.",
              },
              {
                title: "You're done — nothing else changes",
                body: "The same /exec URL keeps working, so this app needs no changes. Your existing rows are preserved; the script only reads what each column header says.",
              },
            ].map((s, i) => (
              <li key={s.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-ink-900 font-display text-[13px] font-semibold text-marigold-500">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-bold text-ink-950">{s.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex items-center gap-2 border-t border-line bg-paper/60 px-6 py-4">
            <button onClick={copyScript} className="btn-primary">
              {copied ? <Check size={15} className="text-leaf-600" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy updated script"}
            </button>
            <a
              href={sheetUrl?.replace(/\/exec.*$/, "") ?? "https://script.google.com"}
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
              title="Open your Apps Script project"
            >
              Open Apps Script <ExternalLink size={14} />
            </a>
          </div>

          <p className="border-t border-line bg-marigold-50/60 px-6 py-3 text-[11.5px] leading-relaxed text-ink-500">
            <strong className="text-ink-700">Already-corrupted paid dues?</strong> No manual cleanup — the app normalises
            them on the next sync. Redeploying just keeps the sheet clean going forward.
          </p>
        </section>
      )}

      {sheetUrl && !scriptOutdated && !showGuide && (
        <button onClick={() => setShowGuide(true)} className="btn-ghost animate-rise rise-1">
          View setup guide
        </button>
      )}

      {showGuide && (
        <>
          <Section
            step="1"
            title="Create the spreadsheet"
            desc="One blank Google Sheet is all you need. The script auto-creates four tabs — “Maintenance Records”, “Flats”, “Collections” and “Settings” — with proper headers on first run."
            delay="rise-1"
          >
            <a href="https://sheets.new" target="_blank" rel="noreferrer" className="btn-ghost">
              Open sheets.new <ExternalLink size={14} />
            </a>
          </Section>

          <Section
            step="2"
            title="Paste the Apps Script"
            desc="In the sheet: Extensions → Apps Script. Delete the default function, paste this code, and hit Save."
            delay="rise-2"
          >
            <div className="relative">
              <button
                onClick={copyScript}
                className="btn-ghost absolute right-3 top-3 z-10 border-white/10! bg-pine-950/80! px-3! py-1.5! text-[12px]! text-white/85! hover:bg-pine-900! hover:text-white!"
              >
                {copied ? <Check size={13} className="text-leaf-600" /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <pre className="codeblock max-h-[320px] overflow-y-auto">{APPS_SCRIPT_CODE}</pre>
            </div>
          </Section>

          <Section
            step="3"
            title="Deploy as a web app"
            delay="rise-3"
            desc="Deploy → New deployment → gear icon → Web app. Set “Execute as: Me” and “Who has access: Anyone”, then Deploy. Authorise with your Google account (Advanced → Go to project if warned). Copy the URL ending in /exec."
          >
            <ol className="space-y-1.5">
              {[
                "Execute as → Me",
                "Who has access → Anyone",
                "Copy the /exec URL after deploying",
                "Redeploy (Manage deployments → edit → new version) if you change the code later",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[12.5px] font-medium text-ink-700">
                  <ChevronRight size={13} className="shrink-0 text-marigold-600" /> {t}
                </li>
              ))}
            </ol>
          </Section>

          <Section
            step="4"
            title="Set the Vercel Production variable"
            delay="rise-4"
            desc="In Vercel: Project -> Settings -> Environment Variables. Add VITE_APPS_SCRIPT_URL, paste the deployed /exec URL, select Production, save, then redeploy. Every device will use it automatically."
          >
            <pre className="codeblock">
              {`Name: VITE_APPS_SCRIPT_URL\nValue: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec\nEnvironment: Production`}
            </pre>
          </Section>
        </>
      )}

      <FlatsSection />

      {/* society letterhead — synced via Settings tab */}
      <Section
        title="Society letterhead"
        desc="Your society's name and contact details, printed at the top of every maintenance receipt PDF."
        delay="rise-3"
      >
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
              <Landmark size={12} /> Society / building name
            </span>
            <input
              value={meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              placeholder="e.g. Greenview CHS Ltd."
              className="field"
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                <MapPin size={12} /> Address
              </span>
              <input
                value={meta.address}
                onChange={(e) => setMeta({ address: e.target.value })}
                placeholder="Plot 12, MG Road, Pune 411001"
                className="field"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                <Phone size={12} /> Phone
              </span>
              <input
                value={meta.phone}
                onChange={(e) => setMeta({ phone: e.target.value })}
                placeholder="98765 43210"
                className="field"
              />
            </label>
          </div>
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink-400">
            {sheetUrl ? (
              <>
                <CloudCheck size={13} className="text-leaf-600" /> Saved automatically & synced to the sheet's Settings tab
              </>
            ) : (
              <>
                <HardDrive size={13} /> Stored on this device — connect a sheet to sync it everywhere
              </>
            )}
          </p>
        </div>
      </Section>

      <AppLockSection onRelock={onRelock} />

      {/* data tools */}
      <Section
        title="Local data"
        desc={`${records.length} expenses · ${units.length} flats · ${payments.length} collections kept in this browser — the app works offline and syncs when connected.`}
        delay="rise-4"
      >
        <div className="flex flex-wrap gap-2">
          <button onClick={loadSample} className="btn-ghost">
            <Sparkles size={14} /> Load sample data
          </button>
          {confirmClear ? (
            <>
              <button
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
                className="btn-danger"
              >
                <Trash2 size={14} /> Yes, delete all {records.length + units.length + payments.length}
              </button>
              <button onClick={() => setConfirmClear(false)} className="btn-ghost">
                Keep my records
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmClear(true)} disabled={records.length + units.length + payments.length === 0} className="btn-danger">
              <Trash2 size={14} /> Clear all records
            </button>
          )}
        </div>
        <p className="mt-3 text-[11.5px] text-ink-400">Clearing also removes the rows from your sheet on the next sync.</p>
      </Section>
    </div>
  );
}
