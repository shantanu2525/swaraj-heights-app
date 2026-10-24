import { Building2, LayoutDashboard, ClipboardList, HandCoins, Settings, Plus, Sheet, RefreshCw, CircleAlert, LockKeyhole, CircleUser, LogOut, Eye } from "lucide-react";
import { useAppState } from "../lib/store";
import { fmtDateTime } from "../lib/format";
import { cn } from "../utils/cn";

export type View = "dashboard" | "records" | "collections" | "settings" | "profile";

type NavItem = { id: View; label: string; icon: typeof LayoutDashboard; hint: string };

const ADMIN_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Totals & charts" },
  { id: "records", label: "Expenses", icon: ClipboardList, hint: "Every repair & bill" },
  { id: "collections", label: "Collections", icon: HandCoins, hint: "Monthly dues from flats" },
  { id: "settings", label: "Settings", icon: Settings, hint: "Flats, sheet & lock" },
];

const OWNER_NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, hint: "Society spending" },
  { id: "records", label: "Expenses", icon: ClipboardList, hint: "What the society spent" },
  { id: "collections", label: "My Dues", icon: HandCoins, hint: "Payments & receipts" },
  { id: "profile", label: "My Profile", icon: CircleUser, hint: "Details & password" },
];

interface Props {
  view: View;
  onNavigate: (v: View) => void;
  onNew: () => void;
  role: "admin" | "owner";
  flatLabel?: string;
  onLogout: () => void;
}

/** Shows the society's own name once the admin has set it, else the app name */
export function Logo() {
  const { meta } = useAppState();
  const society = meta.name.trim();

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-marigold-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_4px_12px_-2px_rgba(217,138,18,0.55)]">
        <Building2 size={20} className="text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 leading-tight">
        {society ? (
          <>
            <p
              className="font-display truncate text-[16px] font-semibold tracking-tight text-white"
              title={society}
            >
              {society}
            </p>
            <p className="truncate text-[10px] font-medium uppercase tracking-[0.14em] text-white/40">
              Maintenance Khata
            </p>
          </>
        ) : (
          <>
            <p className="font-display text-[17px] font-semibold tracking-tight text-white">
              Maintenance <span className="text-marigold-500">Khata</span>
            </p>
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-white/40">Building ledger in ₹</p>
          </>
        )}
      </div>
    </div>
  );
}

export function SyncBadge({ onClick, compact }: { onClick?: () => void; compact?: boolean }) {
  const { sync, sheetUrl, lastSynced } = useAppState();

  const map = {
    local: { dot: "bg-ink-300", label: "Local only", sub: "Not connected to a sheet", pulse: false },
    syncing: { dot: "bg-marigold-500", label: "Syncing…", sub: "Writing to your sheet", pulse: true },
    synced: { dot: "bg-leaf-600", label: "Sheet synced", sub: lastSynced ? `Updated ${fmtDateTime(lastSynced)}` : "Connected to Google Sheet", pulse: false },
    error: { dot: "bg-clay-600", label: "Sync error", sub: "Tap to check connection", pulse: false },
  } as const;

  const s = map[sync];
  const Icon = sync === "syncing" ? RefreshCw : sync === "error" ? CircleAlert : Sheet;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-1 rounded-xl py-2 text-[10.5px] font-semibold text-ink-400 transition"
        title={sheetUrl ? "Google Sheet connected" : "Connect a Google Sheet"}
      >
        <span className="relative flex items-center justify-center">
          {s.pulse && <span className={cn("absolute inline-flex size-2 animate-ping rounded-full opacity-60", s.dot)} />}
          <span className={cn("relative inline-flex size-2 rounded-full", s.dot)} />
        </span>
        Sync
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left transition hover:bg-white/[0.08]"
      title={sheetUrl ? "Google Sheet connected" : "Connect a Google Sheet"}
    >
      <span className="relative flex size-2 shrink-0">
        {s.pulse && <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", s.dot)} />}
        <span className={cn("relative inline-flex size-2 rounded-full", s.dot)} />
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block text-[12.5px] font-semibold text-white/90">{s.label}</span>
        <span className="block truncate text-[10.5px] text-white/35">{s.sub}</span>
      </span>
      <Icon size={15} className={cn("shrink-0 text-white/30 transition group-hover:text-white/60", sync === "syncing" && "animate-spin")} />
    </button>
  );
}

export default function Sidebar({ view, onNavigate, onNew, role, flatLabel, onLogout }: Props) {
  const { records, meta } = useAppState();
  const lockEnabled = Boolean(meta.passwordHash);
  const isAdmin = role === "admin";
  const NAV = isAdmin ? ADMIN_NAV : OWNER_NAV;

  return (
    <aside className="pine-texture sticky top-0 hidden h-[100dvh] w-[264px] shrink-0 flex-col px-5 py-6 lg:flex">
      <Logo />

      {isAdmin ? (
        <button onClick={onNew} className="btn-primary mt-7 w-full py-3!">
          <Plus size={17} strokeWidth={2.5} /> New Entry
        </button>
      ) : (
        <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.05] px-3.5 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Signed in as</p>
          <p className="mt-1 flex items-center gap-2 text-[14px] font-bold text-white">
            <span className="tnum">{flatLabel}</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.08] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white/55">
              <Eye size={9.5} /> View only
            </span>
          </p>
        </div>
      )}

      <nav className="mt-8 flex flex-col gap-1">
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Menu</p>
        {NAV.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200",
                active ? "bg-white/[0.09] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "hover:bg-white/[0.05]"
              )}
            >
              <item.icon
                size={17}
                strokeWidth={2.1}
                className={cn("transition", active ? "text-marigold-500" : "text-white/40 group-hover:text-white/70")}
              />
              <span className="flex-1 leading-tight">
                <span className={cn("block text-[13.5px] font-semibold", active ? "text-white" : "text-white/60 group-hover:text-white/85")}>
                  {item.label}
                </span>
                <span className="block text-[10.5px] text-white/25">{item.hint}</span>
              </span>
              {item.id === "records" && (
                <span className={cn("tnum rounded-md px-1.5 py-0.5 text-[10.5px] font-bold", active ? "bg-marigold-500/20 text-marigold-500" : "bg-white/[0.06] text-white/35")}>
                  {records.length}
                </span>
              )}
              {item.id === "settings" && lockEnabled && isAdmin && (
                <LockKeyhole size={13} className={cn("shrink-0", active ? "text-marigold-500" : "text-white/30")} />
              )}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left transition hover:border-clay-600/40 hover:bg-clay-600/15"
        >
          <LogOut size={15} className="text-white/40" />
          <span className="text-[12.5px] font-semibold text-white/80">Sign out</span>
        </button>
        <SyncBadge onClick={() => onNavigate("settings")} />
      </div>
    </aside>
  );
}
