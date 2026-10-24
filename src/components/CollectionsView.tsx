import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  HandCoins,
  Hourglass,
  Percent,
  Search,
  Settings2,
  Sparkles,
  Building2,
  Check,
  Clock3,
  FileDown,
} from "lucide-react";
import { useAppState, loadSample, unitAmount, occupantName } from "../lib/store";
import { currentMonthKey, shiftMonth, monthLongLabel, fmtINR, fmtINRCompact, fmtDate, compareFlatLabels } from "../lib/format";
import { downloadReceiptPdf, downloadBulkReceiptsPdf } from "../lib/receipt";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { Payment, Unit } from "../types";
import CollectModal from "./CollectModal";

function wingOf(label: string): string {
  const head = label.split("-")[0]?.trim();
  return head || "—";
}

/* ------------------------------ flat card ------------------------------ */

function FlatCard({
  unit,
  onOpen,
  readOnly,
  payment,
}: {
  unit: Unit;
  onOpen: () => void;
  readOnly?: boolean;
  payment?: Payment;
}) {
  const { defaultAmount } = useAppState();
  const expected = unitAmount(unit, defaultAmount);
  const paid = Boolean(payment);

  return (
    <button
      onClick={readOnly ? undefined : onOpen}
      disabled={readOnly}
      className={cn(
        "group relative flex flex-col rounded-2xl border p-4 text-left transition-all duration-200",
        !readOnly && "active:scale-[0.98]",
        paid
          ? "border-leaf-600/25 bg-leaf-100/40 shadow-[0_1px_2px_rgba(34,101,63,0.08)] hover:border-leaf-600/45 hover:shadow-[0_8px_22px_-10px_rgba(34,101,63,0.3)]"
          : readOnly
            ? "border-dashed border-line-strong bg-card"
            : "border-dashed border-line-strong bg-card hover:-translate-y-0.5 hover:border-clay-600/40 hover:shadow-[0_10px_24px_-12px_rgba(179,67,43,0.28)]"
      )}
    >
      <span className="flex w-full items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="tnum block text-[17px] font-bold tracking-tight text-ink-950">{unit.label}</span>
          <span className="block truncate text-[11px] font-medium text-ink-500">{occupantName(unit) || "—"}</span>
        </span>
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full transition",
            paid ? "bg-leaf-600 text-white" : "bg-paper text-ink-300 group-hover:bg-clay-100 group-hover:text-clay-600"
          )}
        >
          {paid ? <Check size={13} strokeWidth={3} /> : <Clock3 size={13} />}
        </span>
      </span>

      <span
        className="mt-3 block w-full border-t border-dashed pb-1 pt-2.5"
        style={{ borderColor: paid ? "rgba(34,101,63,0.18)" : undefined }}
      >
        {paid && payment ? (
          <>
            <span className="tnum block text-[15px] font-bold text-leaf-700">{fmtINR(payment.amount)}</span>
            <span className="mt-1 block truncate text-[10.5px] font-medium text-ink-500">
              {fmtDate(payment.paidOn)} · {payment.mode || "Paid"}
            </span>
            {payment.receipt && (
              <span className="mt-1 block truncate font-mono text-[9.5px] font-semibold tracking-tight text-ink-400">
                {payment.receipt}
              </span>
            )}
          </>
        ) : (
          <>
            <span className="tnum block text-[15px] font-bold text-ink-400">{fmtINR(expected)}</span>
            <span className="mt-1 block text-[10.5px] font-semibold text-clay-600">
              {readOnly ? "Payment pending" : "Pending — tap to collect"}
            </span>
          </>
        )}
      </span>
    </button>
  );
}

/* ------------------------------ main view ------------------------------ */

interface Props {
  onManageFlats: () => void;
  readOnly?: boolean;
  /** when set, only this flat is shown (resident login) */
  ownUnitId?: string;
}

export default function CollectionsView({ onManageFlats, readOnly, ownUnitId }: Props) {
  const all = useAppState();
  const { defaultAmount } = all;
  const units = useMemo(
    () => (ownUnitId ? all.units.filter((u) => u.id === ownUnitId) : all.units),
    [all.units, ownUnitId]
  );
  const payments = useMemo(
    () => (ownUnitId ? all.payments.filter((p) => p.unitId === ownUnitId) : all.payments),
    [all.payments, ownUnitId]
  );
  const [month, setMonth] = useState(currentMonthKey());
  const [wing, setWing] = useState("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending">("all");
  const [activeUnit, setActiveUnit] = useState<Unit | null>(null);

  const wings = useMemo(() => [...new Set(units.map((u) => wingOf(u.label)))].sort(), [units]);

  // payments for the selected month, keyed by unit — derived ONLY from the
  // (possibly owner-scoped) payments list so the view always renders from
  // the same data it displays.
  const paidMap = useMemo(() => {
    const m = new Map<string, Payment>();
    for (const p of payments) if (p.month === month) m.set(p.unitId, p);
    return m;
  }, [payments, month]);

  const stats = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let paidCount = 0;
    for (const u of units) {
      expected += unitAmount(u, defaultAmount);
      const p = paidMap.get(u.id);
      if (p) {
        collected += p.amount;
        paidCount++;
      }
    }
    return { expected, collected, paidCount, pct: expected > 0 ? (collected / expected) * 100 : 0 };
  }, [units, paidMap, defaultAmount]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...units]
      .sort((a, b) => compareFlatLabels(a.label, b.label))
      .filter((u) => (wing === "all" ? true : wingOf(u.label) === wing))
      .filter((u) => (statusFilter === "all" ? true : Boolean(paidMap.get(u.id)) === (statusFilter === "paid")))
      .filter((u) => (q ? `${u.label} ${occupantName(u)} ${u.ownerName}`.toLowerCase().includes(q) : true));
  }, [units, wing, query, statusFilter, paidMap]);

  const unitsById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const receipts = useMemo(() => payments.slice(0, ownUnitId ? 24 : 8), [payments, ownUnitId]);

  const monthPayments = useMemo(
    () => units.map((u) => paidMap.get(u.id)).filter((p): p is Payment => Boolean(p)),
    [units, paidMap]
  );

  function downloadAllReceipts() {
    if (monthPayments.length === 0) return;
    downloadBulkReceiptsPdf(monthPayments, unitsById, month);
    toast(`Downloaded ${monthPayments.length} receipt${monthPayments.length === 1 ? "" : "s"} — one page per flat`);
  }

  /* -------- empty state -------- */
  if (units.length === 0) {
    if (readOnly) {
      return (
        <div className="card p-10 text-center">
          <HandCoins size={24} className="mx-auto text-ink-300" />
          <p className="mt-3 text-[14px] font-semibold text-ink-900">No dues recorded yet</p>
          <p className="mt-1 text-[12.5px] text-ink-500">Your collection history will appear here.</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-[68vh] items-center justify-center px-4">
        <div className="animate-pop w-full max-w-lg rounded-3xl border-2 border-dashed border-line-strong bg-card/70 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-leaf-100">
            <HandCoins size={26} className="text-leaf-700" />
          </div>
          <h2 className="font-display mt-5 text-[26px] font-semibold tracking-tight text-ink-950">Set up your flats first</h2>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-500">
            Add the flats in your building — wings, floors, residents — then collect monthly maintenance with one tap and
            see exactly who hasn't paid.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button onClick={onManageFlats} className="btn-primary">
              <Building2 size={16} /> Add flats in Settings
            </button>
            <button onClick={loadSample} className="btn-ghost">
              <Sparkles size={15} /> Load sample data
            </button>
          </div>
        </div>
        </div>
    );
  }

  return (
    <div className="animate-rise space-y-4">
      {/* controls */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex items-center overflow-hidden rounded-xl border border-line bg-white">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="grid size-10 place-items-center text-ink-500 transition hover:bg-marigold-50 hover:text-ink-950" title="Previous month">
            <ChevronLeft size={17} />
          </button>
          <div className="flex min-w-[150px] items-center justify-center gap-2 border-x border-line px-3 py-2.5">
            <CalendarDays size={14} className="text-marigold-600" />
            <span className="text-[13px] font-bold text-ink-950">{monthLongLabel(month)}</span>
          </div>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="grid size-10 place-items-center text-ink-500 transition hover:bg-marigold-50 hover:text-ink-950" title="Next month">
            <ChevronRight size={17} />
          </button>
        </div>
        {month !== currentMonthKey() && (
          <button onClick={() => setMonth(currentMonthKey())} className="btn-ghost px-3! py-2! text-[12px]!">
            This month
          </button>
        )}

        <div className="relative w-full flex-1 sm:min-w-[180px] sm:w-auto">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search flat or resident…" className="field pl-9!" />
        </div>

        <button
          onClick={downloadAllReceipts}
          disabled={monthPayments.length === 0}
          className="btn-ghost"
          title={`Download receipts for every paid flat in ${monthLongLabel(month)} — one page each`}
        >
          <FileDown size={15} /> {readOnly ? "My receipt" : `Receipts PDF${monthPayments.length > 0 ? ` (${monthPayments.length})` : ""}`}
        </button>
        {!readOnly && (
          <button onClick={onManageFlats} className="btn-ghost" title="Manage flats & residents in Settings">
            <Settings2 size={15} /> Manage flats
          </button>
        )}
      </div>

      {/* month summary */}
      <div key={`summary-${month}`} className="card animate-view p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Collected</p>
            <p className="tnum font-display mt-1 text-[26px] font-semibold leading-none text-leaf-700">{fmtINR(stats.collected)}</p>
            <p className="tnum mt-1.5 text-[11.5px] font-medium text-ink-500">of {fmtINR(stats.expected)} expected</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{ownUnitId ? "Status" : "Flats paid"}</p>
            <p className="tnum font-display mt-1 text-[26px] font-semibold leading-none text-ink-950">
              {stats.paidCount}
              <span className="text-[16px] text-ink-400"> / {units.length}</span>
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium text-ink-500">{units.length - stats.paidCount} yet to pay</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">Outstanding</p>
            <p className="tnum font-display mt-1 text-[26px] font-semibold leading-none text-clay-600">
              {fmtINR(Math.max(0, stats.expected - stats.collected))}
            </p>
            <p className="mt-1.5 text-[11.5px] font-medium text-ink-500">for {monthLongLabel(month)}</p>
          </div>

          <div className="flex w-full flex-col justify-center sm:ml-auto sm:w-auto sm:min-w-[220px] sm:flex-1 sm:max-w-xs">
            <div className="flex items-center justify-between text-[11.5px] font-bold">
              <span className="inline-flex items-center gap-1.5 text-ink-500">
                <Percent size={12} /> Collection rate
              </span>
              <span className={cn("tnum", stats.pct >= 80 ? "text-leaf-700" : stats.pct >= 50 ? "text-marigold-600" : "text-clay-600")}>
                {stats.pct.toFixed(0)}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-[#3d9e63] transition-all duration-700"
                style={{ width: `${Math.min(100, stats.pct)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* wing + status filters */}
      <div className={cn("flex flex-wrap items-center gap-2", ownUnitId && "hidden")}>
        {["all", ...wings].map((w) => (
          <button
            key={w}
            onClick={() => setWing(w)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.96]",
              wing === w ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-ink-500 hover:text-ink-950"
            )}
          >
            {w === "all" ? "All wings" : `Wing ${w}`}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        {(["all", "paid", "pending"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition active:scale-[0.96]",
              statusFilter === s
                ? s === "paid"
                  ? "border-leaf-600 bg-leaf-600 text-white"
                  : s === "pending"
                    ? "border-clay-600 bg-clay-600 text-white"
                    : "border-ink-900 bg-ink-900 text-white"
                : "border-line bg-white text-ink-500 hover:text-ink-950"
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* flats grid */}
      {visible.length === 0 ? (
        <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
          <Hourglass size={22} className="text-ink-300" />
          <p className="mt-3 text-[13.5px] font-semibold text-ink-900">No flats match these filters</p>
          <p className="mt-1 text-[12px] text-ink-500">Try a different wing, status or search.</p>
        </div>
      ) : (
        <div
          key={`flats-${month}`}
          className="animate-view grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
        >
          {visible.map((u) => (
            <FlatCard key={u.id} unit={u} onOpen={() => setActiveUnit(u)} readOnly={readOnly} payment={paidMap.get(u.id)} />
          ))}
        </div>
      )}

      {/* receipts ledger */}
      {receipts.length > 0 && (
        <div className="card animate-rise rise-2 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">{ownUnitId ? "My receipts" : "Latest receipts"}</h3>
            <span className="text-[11.5px] font-semibold text-ink-400">
              {payments.length} collection{payments.length === 1 ? "" : "s"} all time
            </span>
          </div>
          <ul className="divide-y divide-line/70">
            {receipts.map((p: Payment) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-marigold-50/40 sm:gap-4 sm:px-6">
                <span className="tnum grid h-9 w-14 shrink-0 place-items-center rounded-lg bg-leaf-100 text-[12px] font-bold text-leaf-700">
                  {p.flat}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink-950">{monthLongLabel(p.month)}</span>
                  <span className="block truncate text-[11px] text-ink-500">
                    {fmtDate(p.paidOn)} · {p.mode || "—"}
                    {p.receipt ? ` · ${p.receipt}` : ""}
                  </span>
                </span>
                <span className="tnum shrink-0 text-[13.5px] font-bold text-ink-950">{fmtINRCompact(p.amount)}</span>
                <button
                  onClick={() => {
                    downloadReceiptPdf(p, unitsById.get(p.unitId));
                    toast(`Receipt for ${p.flat} downloaded`);
                  }}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border border-transparent text-ink-400 transition hover:border-line hover:bg-white hover:text-leaf-700"
                  title={`Download receipt for ${p.flat}`}
                >
                  <FileDown size={14} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {activeUnit && !readOnly && <CollectModal unit={activeUnit} month={month} onClose={() => setActiveUnit(null)} />}
    </div>
  );
}
