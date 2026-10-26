import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, ClipboardList, HandCoins, Settings, Plus, CircleUser } from "lucide-react";
import Sidebar, { Logo } from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import RecordsView from "./components/RecordsView";
import CollectionsView from "./components/CollectionsView";
import SettingsView from "./components/SettingsView";
import ProfileView from "./components/ProfileView";
import LoginScreen from "./components/LoginScreen";
import MobileAccountMenu from "./components/MobileAccountMenu";
import SyncGate from "./components/SyncGate";
import RecordModal from "./components/RecordModal";
import ToastHost from "./components/ToastHost";
import { pullNow, getState, useAppState } from "./lib/store";
import { readSession, clearSession } from "./lib/auth";
import { cn } from "./utils/cn";
import type { MaintenanceRecord, Session } from "./types";

type View = "dashboard" | "records" | "collections" | "settings" | "profile";

type Modal = { mode: "add" } | { mode: "edit"; record: MaintenanceRecord } | null;

const HEADERS: Record<View, { title: string; sub: string }> = {
  dashboard: { title: "Overview", sub: "A clear picture of society money — in and out" },
  records: { title: "Expenses", sub: "Every repair & maintenance bill, newest first" },
  collections: { title: "Collections", sub: "Monthly maintenance dues from every flat" },
  settings: { title: "Settings", sub: "Flats, sheet sync, letterhead & admin lock" },
  profile: { title: "My Profile", sub: "Your flat details and login password" },
};

const OWNER_HEADERS: Partial<Record<View, { title: string; sub: string }>> = {
  dashboard: { title: "Overview", sub: "How your society's maintenance money is spent" },
  records: { title: "Expenses", sub: "Society spending — view only" },
  collections: { title: "My Dues", sub: "Your maintenance payments & receipts" },
};

export default function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<Modal>(null);
  const state = useAppState();
  // <main> is the scroll container on mobile (app shell), the window on desktop
  const scrollRef = useRef<HTMLElement | null>(null);
  // false until the first sheet pull settles, so residents aren't shown a
  // half-loaded screen (or a false "flat not found") while data is in flight
  const [bootSynced, setBootSynced] = useState(() => !getState().sheetUrl);

  // The backend URL comes from src/config.ts. Every device pulls the same
  // sheet automatically; `bootSynced` flips only once data has settled.
  useEffect(() => {
    let alive = true;
    const finish = () => {
      if (alive) setBootSynced(true);
    };

    if (!getState().sheetUrl) {
      setBootSynced(true);
      return () => {
        alive = false;
      };
    }
    void pullNow({ quiet: true }).finally(finish);
    return () => {
      alive = false;
    };
  }, []);

  /** re-pull on demand (resident retry) */
  async function retrySync() {
    setBootSynced(false);
    await pullNow();
    setBootSynced(true);
  }

  if (!session) return <LoginScreen onLogin={setSession} />;

  const isAdmin = session.role === "admin";
  const ownerUnit = session.unitId ? state.units.find((u) => u.id === session.unitId) : undefined;

  function logout() {
    clearSession();
    setSession(null);
    setView("dashboard");
  }

  function scrollTop() {
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
    const el = scrollRef.current;
    if (el && el.scrollHeight > el.clientHeight) el.scrollTo({ top: 0, behavior });
    else window.scrollTo({ top: 0, behavior });
  }

  function navigate(next: View) {
    if (next === view) {
      scrollTop();
      return;
    }
    setView(next);
    // Let React paint the incoming view before moving the viewport.
    window.requestAnimationFrame(scrollTop);
  }

  // Resident whose flat isn't loaded yet. While the first sheet pull is still
  // running this is just a loading state — show progress, never a login bounce.
  if (!isAdmin && !ownerUnit) {
    const syncing = !bootSynced || state.sync === "syncing";
    return (
      <SyncGate
        syncing={syncing}
        connected={Boolean(state.sheetUrl)}
        notFound={!syncing}
        flatHint={session.mobile}
        onRetry={() => void retrySync()}
        onLogout={logout}
      />
    );
  }

  const openAdd = () => isAdmin && setModal({ mode: "add" });
  const openEdit = (record: MaintenanceRecord) => isAdmin && setModal({ mode: "edit", record });

  const h = (!isAdmin && OWNER_HEADERS[view]) || HEADERS[view];

  const mobileNav = isAdmin
    ? ([
        { id: "dashboard" as View, label: "Home", icon: LayoutDashboard },
        { id: "records" as View, label: "Expenses", icon: ClipboardList },
        { id: "collections" as View, label: "Dues", icon: HandCoins },
        { id: "settings" as View, label: "Settings", icon: Settings },
      ] as const)
    : ([
        { id: "dashboard" as View, label: "Home", icon: LayoutDashboard },
        { id: "records" as View, label: "Expenses", icon: ClipboardList },
        { id: "collections" as View, label: "My Dues", icon: HandCoins },
        { id: "profile" as View, label: "Profile", icon: CircleUser },
      ] as const);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-paper lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      <Sidebar
        view={view}
        onNavigate={navigate}
        onNew={openAdd}
        role={session.role}
        flatLabel={ownerUnit?.label}
        onLogout={logout}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col lg:h-auto">
        {/* app bar — fixed, content scrolls beneath it */}
        <div className="pine-texture safe-top relative z-50 flex shrink-0 items-center justify-between gap-2 px-4 py-3 lg:hidden">
          <Logo />
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && (
              <button onClick={openAdd} className="btn-primary rounded-xl! px-3! py-2! text-[13px]!">
                <Plus size={15} strokeWidth={2.6} /> New
              </button>
            )}
            <MobileAccountMenu role={session.role} flatLabel={ownerUnit?.label} onLogout={logout} />
          </div>
        </div>

        <main
          ref={scrollRef}
          className="h-full w-full flex-1 overflow-y-auto overscroll-contain px-4 pb-6 pt-5 sm:px-6 md:pt-8 lg:h-auto lg:overflow-visible lg:px-8 lg:pb-12 2xl:px-12"
        >
          <header
            key={`header-${view}`}
            className="animate-view mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 md:mb-8"
          >
            <div className="min-w-0">
              <h1 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink-950 sm:text-[32px] lg:text-[36px]">
                {h.title}
              </h1>
              <p className="mt-1.5 text-[12.5px] font-medium text-ink-500 sm:text-[13px]">{h.sub}</p>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {new Intl.DateTimeFormat("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }).format(new Date())}
              </span>
            </div>
          </header>

          <div key={`${session.role}-${view}`} className="animate-view min-h-[calc(100dvh-13rem)]">
            {view === "dashboard" && (
              <Dashboard
                onNew={openAdd}
                onSeeAll={() => navigate("records")}
                onCollections={() => navigate("collections")}
                readOnly={!isAdmin}
              />
            )}
            {view === "records" && <RecordsView onNew={openAdd} onEdit={openEdit} readOnly={!isAdmin} />}
            {view === "collections" && (
              <CollectionsView
                onManageFlats={() => navigate(isAdmin ? "settings" : "profile")}
                readOnly={!isAdmin}
                ownUnitId={isAdmin ? undefined : session.unitId}
              />
            )}
            {view === "settings" && isAdmin && <SettingsView onRelock={logout} />}
            {view === "profile" && !isAdmin && session.unitId && <ProfileView unitId={session.unitId} />}
            {/* Safety net: a role-restricted view must never render a blank screen */}
            {((view === "settings" && !isAdmin) || (view === "profile" && isAdmin)) && (
              <div className="card p-10 text-center">
                <p className="text-[14px] font-semibold text-ink-900">This page isn't available</p>
                <p className="mt-1 text-[12.5px] text-ink-500">Choose another section from the menu.</p>
              </div>
            )}
          </div>
        </main>

        {/* tab bar — sits in the layout like a native app, not an overlay */}
        <nav className="safe-bottom z-40 shrink-0 border-t border-line bg-card/95 px-2 backdrop-blur lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1 py-2">
            {mobileNav.map((item) => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={cn(
                  "flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[10.5px] font-semibold transition-all duration-200 active:scale-[0.96]",
                  view === item.id ? "bg-marigold-50 text-ink-950" : "text-ink-400"
                )}
              >
                <item.icon size={18} strokeWidth={2.2} className={view === item.id ? "text-marigold-600" : undefined} />
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {modal && isAdmin && (
        <RecordModal
          key={modal.mode === "edit" ? modal.record.id : "new"}
          initial={modal.mode === "edit" ? modal.record : null}
          onClose={() => setModal(null)}
        />
      )}

      <ToastHost />
    </div>
  );
}
