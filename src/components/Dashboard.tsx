import { useMemo, useState } from "react";
import {
  IndianRupee,
  CalendarClock,
  Hourglass,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Sparkles,
  HandCoins,
  Wallet,
  Scale,
} from "lucide-react";
import { useAppState, loadSample, unitAmount } from "../lib/store";
import {
  fmtINR,
  fmtINRCompact,
  fmtDate,
  monthKey,
  monthLabel,
  monthLongLabel,
  currentMonthKey,
  shiftMonth,
} from "../lib/format";
import { categoryById } from "../lib/categories";
import { cn } from "../utils/cn";

interface Props {
  onNew: () => void;
  onSeeAll: () => void;
  onCollections: () => void;
  readOnly?: boolean;
}

/* ------------------------------ period filter ------------------------------ */

export type PeriodId = "this" | "prev" | "3m" | "6m" | "year" | "all";

const PERIODS: { id: PeriodId; label: string; short: string }[] = [
  { id: "this", label: "This month", short: "This month" },
  { id: "prev", label: "Previous month", short: "Last month" },
  { id: "3m", label: "Last 3 months", short: "3 months" },
  { id: "6m", label: "Last 6 months", short: "6 months" },
  { id: "year", label: "This year", short: "This year" },
  { id: "all", label: "Till date", short: "All time" },
];

/** inclusive month-key range for a period; null start = unbounded */
function periodRange(id: PeriodId): { from: string | null; to: string | null; label: string } {
  const now = currentMonthKey();
  switch (id) {
    case "this":
      return { from: now, to: now, label: monthLongLabel(now) };
    case "prev": {
      const p = shiftMonth(now, -1);
      return { from: p, to: p, label: monthLongLabel(p) };
    }
    case "3m":
      return { from: shiftMonth(now, -2), to: now, label: "Last 3 months" };
    case "6m":
      return { from: shiftMonth(now, -5), to: now, label: "Last 6 months" };
    case "year":
      return { from: `${new Date().getFullYear()}-01`, to: now, label: `Year ${new Date().getFullYear()}` };
    case "all":
    default:
      return { from: null, to: null, label: "All time" };
  }
}

const inRange = (key: string, from: string | null, to: string | null) =>
  (!from || key >= from) && (!to || key <= to);

/* ------------------------------ derived data ------------------------------ */

function useAnalytics(period: PeriodId) {
  const { records, units, payments, defaultAmount } = useAppState();

  return useMemo(() => {
    const { from, to, label } = periodRange(period);
    const thisKey = currentMonthKey();
    const prevKey = shiftMonth(thisKey, -1);

    /* ---- expenses within the period ---- */
    const scoped = records.filter((r) => inRange(monthKey(r.date), from, to));

    let totalSpent = 0;
    let pendingAmt = 0;
    let pendingCount = 0;
    for (const r of scoped) {
      if (r.status === "paid") totalSpent += r.amount;
      else {
        pendingAmt += r.amount;
        pendingCount++;
      }
    }

    // month-on-month comparison (always current vs previous, independent of filter)
    let thisMonth = 0;
    let prevMonth = 0;
    for (const r of records) {
      if (r.status !== "paid") continue;
      const k = monthKey(r.date);
      if (k === thisKey) thisMonth += r.amount;
      else if (k === prevKey) prevMonth += r.amount;
    }

    /* ---- 6-month trend (chart is always a 6-month window) ---- */
    const months: { key: string; label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const k = shiftMonth(thisKey, -i);
      months.push({ key: k, label: monthLabel(k), total: 0 });
    }
    const monthIdx = new Map(months.map((m, i) => [m.key, i]));
    for (const r of records) {
      const mi = monthIdx.get(monthKey(r.date));
      if (mi !== undefined) months[mi].total += r.amount;
    }

    /* ---- categories within the period ---- */
    const catTotals = new Map<string, number>();
    for (const r of scoped) catTotals.set(r.category, (catTotals.get(r.category) ?? 0) + r.amount);

    const allCats = [...catTotals.entries()]
      .map(([id, total]) => ({ cat: categoryById(id), total }))
      .sort((a, b) => b.total - a.total);

    // keep the donut readable: top 6 + "Others"
    const catBreakdown = allCats.slice(0, 6);
    const restTotal = allCats.slice(6).reduce((s, c) => s + c.total, 0);
    if (restTotal > 0) {
      catBreakdown.push({
        cat: { id: "__rest", label: `Other (${allCats.length - 6})`, icon: categoryById("other").icon, color: "#9aa08a", soft: "#e8e9e0" },
        total: restTotal,
      });
    }
    const grand = catBreakdown.reduce((s, c) => s + c.total, 0);

    /* ---- collections within the period ---- */
    const monthsInPeriod: string[] = [];
    if (from && to) {
      let k = from;
      while (k <= to) {
        monthsInPeriod.push(k);
        k = shiftMonth(k, 1);
      }
    }
    const scopedPayments = payments.filter((p) => inRange(p.month, from, to));
    const collected = scopedPayments.reduce((s, p) => s + p.amount, 0);

    // expected = per-flat amount × months covered
    const perMonthExpected = units.reduce((s, u) => s + unitAmount(u, defaultAmount), 0);
    const monthsCount = monthsInPeriod.length || new Set(payments.map((p) => p.month)).size || 1;
    const expected = perMonthExpected * monthsCount;
    const outstanding = Math.max(0, expected - collected);

    // current-month flat status (for the strip)
    const paidThisMonth = new Set(payments.filter((p) => p.month === thisKey).map((p) => p.unitId));

    return {
      label,
      records,
      scoped,
      totalSpent,
      pendingAmt,
      pendingCount,
      thisMonth,
      prevMonth,
      months,
      catBreakdown,
      grand,
      maxMonth: Math.max(1, ...months.map((m) => m.total)),
      recent: scoped.slice(0, 5),
      // collections
      collected,
      expected,
      outstanding,
      collectionPct: expected > 0 ? (collected / expected) * 100 : 0,
      unitCount: units.length,
      paidCount: paidThisMonth.size,
      balance: collected - totalSpent,
    };
  }, [records, units, payments, defaultAmount, period]);
}

/* ------------------------------ components ------------------------------ */

function PeriodFilter({ value, onChange }: { value: PeriodId; onChange: (p: PeriodId) => void }) {
  return (
    <div className="animate-rise -mx-1 flex snap-x items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
      {PERIODS.map((p) => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={cn(
            "shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.96]",
            value === p.id
              ? "border-ink-900 bg-ink-900 text-white shadow-sm"
              : "border-line bg-white text-ink-500 hover:border-line-strong hover:text-ink-950"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  delay,
}: {
  icon: typeof IndianRupee;
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone: "leaf" | "marigold" | "clay" | "ink";
  delay: string;
}) {
  const tones = {
    leaf: "bg-leaf-100 text-leaf-700",
    marigold: "bg-marigold-100 text-marigold-600",
    clay: "bg-clay-100 text-clay-600",
    ink: "bg-[#e4e9e4] text-ink-700",
  };
  return (
    <div className={cn("card card-hover animate-rise p-5", delay)}>
      <div className="flex items-center justify-between">
        <span className={cn("grid size-9 place-items-center rounded-lg", tones[tone])}>
          <Icon size={17} strokeWidth={2.2} />
        </span>
      </div>
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">{label}</p>
      <p className="tnum font-display mt-1 text-[26px] font-semibold leading-none tracking-tight text-ink-950">{value}</p>
      {sub && <div className="mt-2.5 text-[11.5px] font-medium text-ink-500">{sub}</div>}
    </div>
  );
}

function MonthlyChart({ months, maxMonth }: { months: ReturnType<typeof useAnalytics>["months"]; maxMonth: number }) {
  return (
    <div className="card animate-rise rise-2 p-6">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Monthly spend</h3>
          <p className="mt-0.5 text-[12px] text-ink-500">Last six months · all entries</p>
        </div>
      </div>
      <div className="mt-6 flex h-[168px] items-end gap-3 sm:gap-5">
        {months.map((m, i) => {
          const pct = (m.total / maxMonth) * 100;
          const isLast = i === months.length - 1;
          return (
            <div key={m.key} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
              <span className="tnum text-[11px] font-bold text-ink-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                {fmtINRCompact(m.total)}
              </span>
              <div className="flex w-full flex-1 items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[46px] rounded-t-lg transition-all duration-500 group-hover:brightness-110",
                    isLast
                      ? "bg-marigold-500 shadow-[0_0_0_4px_rgba(217,138,18,0.14)]"
                      : "bg-ink-900/80 group-hover:bg-ink-900"
                  )}
                  style={{ height: `${Math.max(m.total > 0 ? 6 : 2, pct)}%` }}
                />
              </div>
              <span className={cn("text-[11px] font-semibold", isLast ? "text-marigold-600" : "text-ink-400")}>
                {m.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Donut with hover highlighting — segment grows, others dim, centre shows detail */
function CategoryDonut({
  breakdown,
  grand,
  periodLabel,
}: {
  breakdown: ReturnType<typeof useAnalytics>["catBreakdown"];
  grand: number;
  periodLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const R = 15.9155;

  let offset = 25;
  const segments = breakdown.map(({ cat, total }) => {
    const pct = grand > 0 ? (total / grand) * 100 : 0;
    const seg = { cat, total, pct, offset };
    offset -= pct;
    return seg;
  });

  const hovered = segments.find((s) => s.cat.id === active);

  return (
    <div className="card animate-rise rise-3 flex flex-col p-6">
      <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">By category</h3>
      <p className="mt-0.5 text-[12px] text-ink-500">{periodLabel} · hover to inspect</p>

      {grand === 0 ? (
        <div className="flex flex-1 items-center justify-center py-8 text-[12.5px] text-ink-400">
          No expenses in this period
        </div>
      ) : (
        <>
          <div className="relative mx-auto mt-5 w-full max-w-[176px]" onMouseLeave={() => setActive(null)}>
            <svg viewBox="0 0 42 42" className="w-full overflow-visible">
              <circle cx="21" cy="21" r={R} fill="none" stroke="#ece7d7" strokeWidth="6" />
              {segments.map(({ cat, pct, offset }) => {
                const isActive = active === cat.id;
                const dim = active !== null && !isActive;
                return (
                  <circle
                    key={cat.id}
                    cx="21"
                    cy="21"
                    r={R}
                    fill="none"
                    stroke={cat.color}
                    strokeWidth={isActive ? 8.4 : 6}
                    strokeDasharray={`${Math.max(pct - 0.8, 0.4)} ${100 - Math.max(pct - 0.8, 0.4)}`}
                    strokeDashoffset={offset}
                    strokeLinecap="butt"
                    opacity={dim ? 0.28 : 1}
                    onMouseEnter={() => setActive(cat.id)}
                    className="cursor-pointer transition-all duration-200"
                    style={{ filter: isActive ? "saturate(1.15)" : undefined }}
                  />
                );
              })}
            </svg>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div className="px-5">
                {hovered ? (
                  <>
                    <p
                      className="tnum font-display text-[18px] font-semibold leading-none"
                      style={{ color: hovered.cat.color }}
                    >
                      {fmtINRCompact(hovered.total)}
                    </p>
                    <p className="mt-1 truncate text-[9.5px] font-bold uppercase tracking-[0.08em] text-ink-500">
                      {hovered.cat.label}
                    </p>
                    <p className="tnum mt-0.5 text-[10px] font-semibold text-ink-400">{hovered.pct.toFixed(1)}%</p>
                  </>
                ) : (
                  <>
                    <p className="tnum font-display text-[19px] font-semibold leading-none text-ink-950">
                      {fmtINRCompact(grand)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-400">total</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-1">
            {segments.map(({ cat, total, pct }) => {
              const isActive = active === cat.id;
              return (
                <li
                  key={cat.id}
                  onMouseEnter={() => setActive(cat.id)}
                  onMouseLeave={() => setActive(null)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[12.5px] transition-colors",
                    isActive ? "bg-paper" : "hover:bg-paper/60",
                    active !== null && !isActive && "opacity-45"
                  )}
                >
                  <span
                    className={cn("shrink-0 rounded-[4px] transition-all", isActive ? "size-3" : "size-2.5")}
                    style={{ background: cat.color }}
                  />
                  <span className={cn("flex-1 truncate font-medium text-ink-700", isActive && "font-bold text-ink-950")}>
                    {cat.label}
                  </span>
                  <span className="tnum font-semibold text-ink-950">{fmtINRCompact(total)}</span>
                  <span className="tnum w-10 text-right text-[11px] font-medium text-ink-400">{pct.toFixed(0)}%</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function CollectionsStrip({ onOpen, readOnly }: { onOpen: () => void; readOnly?: boolean }) {
  const { units, payments, defaultAmount } = useAppState();
  const summary = useMemo(() => {
    const month = currentMonthKey();
    let expected = 0;
    let collected = 0;
    let paid = 0;
    for (const u of units) {
      expected += unitAmount(u, defaultAmount);
      const p = payments.find((x) => x.unitId === u.id && x.month === month);
      if (p) {
        collected += p.amount;
        paid++;
      }
    }
    return {
      month,
      expected,
      collected,
      paid,
      total: units.length,
      pct: expected > 0 ? (collected / expected) * 100 : 0,
    };
  }, [units, payments, defaultAmount]);

  if (units.length === 0) {
    if (readOnly) return null;
    return (
      <button
        onClick={onOpen}
        className="card card-hover animate-rise rise-2 flex w-full flex-wrap items-center gap-4 border-dashed! p-5 text-left"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100">
          <HandCoins size={19} className="text-leaf-700" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-bold text-ink-950">Start collecting monthly maintenance</span>
          <span className="block text-[12px] text-ink-500">Add your flats and track who has paid each month.</span>
        </span>
        <ArrowRight size={17} className="shrink-0 text-ink-300" />
      </button>
    );
  }

  return (
    <div className="card animate-rise rise-2 flex flex-wrap items-center gap-x-6 gap-y-4 p-5 sm:px-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-leaf-100">
        <HandCoins size={19} className="text-leaf-700" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
          Collections · {monthLongLabel(summary.month)}
        </p>
        <p className="mt-0.5 text-[13.5px] font-bold text-ink-950">
          <span className="tnum text-leaf-700">{fmtINR(summary.collected)}</span>
          <span className="tnum text-ink-400"> of {fmtINR(summary.expected)}</span>
          <span className="ml-2 text-[11.5px] font-semibold text-ink-500">
            {summary.paid}/{summary.total} flats paid
          </span>
        </p>
      </div>
      <div className="w-full flex-1 sm:min-w-[180px] sm:w-auto">
        <div className="h-2.5 overflow-hidden rounded-full bg-paper">
          <div
            className="h-full rounded-full bg-gradient-to-r from-leaf-600 to-[#3d9e63] transition-all duration-700"
            style={{ width: `${Math.min(100, summary.pct)}%` }}
          />
        </div>
      </div>
      <button
        onClick={onOpen}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-leaf-700 transition hover:bg-leaf-100/60"
      >
        {readOnly ? "View my dues" : "Open collections"} <ArrowRight size={14} />
      </button>
    </div>
  );
}

/* ------------------------------ main view ------------------------------ */

export default function Dashboard({ onNew, onSeeAll, onCollections, readOnly }: Props) {
  const [period, setPeriod] = useState<PeriodId>("all");
  const a = useAnalytics(period);

  const delta = a.prevMonth > 0 ? ((a.thisMonth - a.prevMonth) / a.prevMonth) * 100 : null;

  if (a.records.length === 0 && a.unitCount === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="animate-pop w-full max-w-lg rounded-3xl border-2 border-dashed border-line-strong bg-card/70 p-10 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-marigold-100">
            <IndianRupee size={26} className="text-marigold-600" />
          </div>
          <h2 className="font-display mt-5 text-[26px] font-semibold tracking-tight text-ink-950">
            Your building khata is empty
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-ink-500">
            Record every repair, AMC, and society expense in rupees — and sync it all to a Google Sheet when ready.
          </p>
          {!readOnly && (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <button onClick={onNew} className="btn-primary">
                <Plus size={16} strokeWidth={2.5} /> Add first record
              </button>
              <button onClick={loadSample} className="btn-ghost">
                <Sparkles size={15} /> Load sample data
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PeriodFilter value={period} onChange={setPeriod} />

      <div key={period} className="animate-view space-y-5">
        {/* money in / out */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Collected"
          value={fmtINRCompact(a.collected)}
          tone="leaf"
          delay="rise-1"
          sub={
            <span className="tnum">
              {a.expected > 0 ? `${a.collectionPct.toFixed(0)}% of ${fmtINRCompact(a.expected)} due` : "No dues set"}
            </span>
          }
        />
        <StatCard
          icon={Hourglass}
          label="Pending collection"
          value={fmtINRCompact(a.outstanding)}
          tone="clay"
          delay="rise-2"
          sub={
            <span className="tnum">
              {a.unitCount > 0 ? `${a.unitCount - a.paidCount} of ${a.unitCount} flats unpaid this month` : "No flats yet"}
            </span>
          }
        />
        <StatCard
          icon={IndianRupee}
          label="Total spent"
          value={fmtINRCompact(a.totalSpent)}
          tone="marigold"
          delay="rise-3"
          sub={
            delta === null ? (
              <span className="tnum">{a.scoped.length} entries · {a.label}</span>
            ) : (
              <span className={cn("inline-flex items-center gap-1", delta >= 0 ? "text-clay-600" : "text-leaf-700")}>
                {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {Math.abs(delta).toFixed(0)}% vs last month
              </span>
            )
          }
        />
        <StatCard
          icon={Scale}
          label="Net balance"
          value={fmtINRCompact(a.balance)}
          tone={a.balance >= 0 ? "leaf" : "clay"}
          delay="rise-4"
          sub={
            <span className="tnum">
              {a.balance >= 0 ? "Surplus" : "Deficit"} · {a.label}
            </span>
          }
        />
        </div>

        {/* unpaid bills callout */}
        {a.pendingCount > 0 && (
        <div className="card animate-rise rise-2 flex flex-wrap items-center gap-x-5 gap-y-3 border-clay-600/25! bg-clay-100/30! p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-clay-100">
            <CalendarClock size={19} className="text-clay-600" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-clay-600">Unpaid bills</p>
            <p className="mt-0.5 text-[13.5px] font-bold text-ink-950">
              <span className="tnum">{fmtINR(a.pendingAmt)}</span>
              <span className="ml-2 text-[11.5px] font-semibold text-ink-500">
                across {a.pendingCount} vendor {a.pendingCount === 1 ? "bill" : "bills"} awaiting payment
              </span>
            </p>
          </div>
          <button
            onClick={onSeeAll}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-clay-600 transition hover:bg-clay-100"
          >
            Review <ArrowRight size={14} />
          </button>
        </div>
        )}

        <CollectionsStrip onOpen={onCollections} readOnly={readOnly} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <MonthlyChart months={a.months} maxMonth={a.maxMonth} />
        </div>
        <CategoryDonut breakdown={a.catBreakdown} grand={a.grand} periodLabel={a.label} />
        </div>

        <div className="card animate-rise rise-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4 sm:px-6">
          <div>
            <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Recent entries</h3>
            <p className="mt-0.5 text-[12px] text-ink-500">{a.label}</p>
          </div>
          <button
            onClick={onSeeAll}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold text-marigold-600 transition hover:bg-marigold-50"
          >
            View all <ArrowRight size={14} />
          </button>
        </div>
        {a.recent.length === 0 ? (
          <p className="px-6 py-10 text-center text-[12.5px] text-ink-400">No expenses recorded in this period.</p>
        ) : (
          <ul className="divide-y divide-line/70">
            {a.recent.map((r) => {
              const cat = categoryById(r.category);
              return (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-marigold-50/40 sm:gap-4 sm:px-6">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: cat.soft }}>
                    <cat.icon size={16} style={{ color: cat.color }} strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink-950">{r.description}</span>
                    <span className="block text-[11.5px] text-ink-500">
                      {fmtDate(r.date)} ·{" "}
                      {r.vendor || (r.category === "other" && r.categoryDetail ? r.categoryDetail : cat.label)}
                    </span>
                  </span>
                  <StatusPill status={r.status} />
                  <span className="tnum w-24 text-right text-[13.5px] font-bold text-ink-950">{fmtINR(r.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
        </div>
      </div>
    </div>
  );
}

export function StatusPill({ status }: { status: "paid" | "pending" }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.06em]",
        status === "paid" ? "bg-leaf-100 text-leaf-700" : "bg-clay-100 text-clay-600"
      )}
    >
      <span className={cn("size-1.5 rounded-full", status === "paid" ? "bg-leaf-600" : "bg-clay-600")} />
      {status}
    </span>
  );
}
