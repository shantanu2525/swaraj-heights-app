import { useMemo, useState } from "react";
import { Search, Plus, Download, Pencil, Trash2, Inbox, X, Check } from "lucide-react";
import { useAppState, deleteRecord } from "../lib/store";
import { fmtINR, fmtDate } from "../lib/format";
import { CATEGORIES, categoryById } from "../lib/categories";
import { StatusPill } from "./Dashboard";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { MaintenanceRecord } from "../types";

interface Props {
  onNew: () => void;
  onEdit: (r: MaintenanceRecord) => void;
  readOnly?: boolean;
}

function exportCsv(records: MaintenanceRecord[]) {
  const header = ["Date", "Category", "Description", "Vendor", "Amount (INR)", "Status", "Payment Mode", "Notes"];
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = records.map((r) =>
    [
      r.date,
      r.category === "other" && r.categoryDetail ? `Other — ${r.categoryDetail}` : categoryById(r.category).label,
      r.description,
      r.vendor,
      r.amount,
      r.status,
      r.payment,
      r.notes,
    ]
      .map(esc)
      .join(",")
  );
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\n"); // leading BOM keeps Excel / Google Sheets happy
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `maintenance-records-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast(`Exported ${records.length} record${records.length === 1 ? "" : "s"} to CSV`);
}

function RowActions({ record, onEdit }: { record: MaintenanceRecord; onEdit: (r: MaintenanceRecord) => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      {confirming ? (
        <>
          <span className="mr-1 text-[11px] font-semibold text-clay-600">Delete?</span>
          <button
            onClick={() => {
              deleteRecord(record.id);
              toast("Record deleted", "info");
            }}
            className="grid size-8 place-items-center rounded-lg bg-clay-100 text-clay-600 transition hover:bg-clay-600 hover:text-white"
            title="Confirm delete"
          >
            <Check size={14} strokeWidth={2.6} />
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="grid size-8 place-items-center rounded-lg border border-line bg-white text-ink-500 transition hover:bg-paper"
            title="Cancel"
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onEdit(record)}
            className="grid size-8 place-items-center rounded-lg border border-transparent text-ink-400 transition hover:border-line hover:bg-white hover:text-ink-950"
            title="Edit entry"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => {
              setConfirming(true);
              setTimeout(() => setConfirming(false), 3500);
            }}
            className="grid size-8 place-items-center rounded-lg border border-transparent text-ink-400 transition hover:border-clay-100 hover:bg-clay-100/50 hover:text-clay-600"
            title="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        </>
      )}
    </div>
  );
}

export default function RecordsView({ onNew, onEdit, readOnly }: Props) {
  const { records } = useAppState();
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState<"all" | "paid" | "pending">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (cat !== "all" && r.category !== cat) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        const hay = `${r.description} ${r.vendor} ${r.notes} ${r.categoryDetail} ${categoryById(r.category).label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, query, cat, status]);

  const filteredTotal = filtered.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="animate-rise space-y-4">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative w-full flex-1 sm:min-w-[220px] sm:w-auto">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search description, vendor, notes…"
            className="field pl-9.5!"
          />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="field w-auto cursor-pointer pr-8">
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-xl border border-line bg-white">
          {(["all", "paid", "pending"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3.5 py-2.5 text-[12.5px] font-semibold capitalize transition",
                status === s ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-marigold-50 hover:text-ink-950"
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportCsv(filtered)} disabled={filtered.length === 0} className="btn-ghost px-3.5!" title="Export filtered records as CSV">
            <Download size={15} /> <span className="hidden sm:inline">CSV</span>
          </button>
          {!readOnly && (
            <button onClick={onNew} className="btn-primary">
              <Plus size={16} strokeWidth={2.5} /> Add
            </button>
          )}
        </div>
      </div>

      {/* table card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <p className="text-[12.5px] font-semibold text-ink-700">
            <span className="tnum text-ink-950">{filtered.length}</span> record{filtered.length === 1 ? "" : "s"}
            {(query || cat !== "all" || status !== "all") && " · filtered"}
          </p>
          <p className="tnum text-[12.5px] font-bold text-ink-950">{fmtINR(filteredTotal)}</p>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-paper">
              <Inbox size={22} className="text-ink-400" />
            </div>
            <p className="mt-4 text-[14px] font-semibold text-ink-900">No records match</p>
            <p className="mt-1 text-[12.5px] text-ink-500">
              {records.length === 0
              ? readOnly
                ? "The society hasn't recorded any expenses yet."
                : "Add your first maintenance entry to get started."
              : "Try clearing the search or filters."}
            </p>
          </div>
        ) : (
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full min-w-[820px] text-left">
              <thead>
                <tr className="border-b border-line bg-paper/60 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-400">
                  <th className="px-5 py-3 font-bold">Date</th>
                  <th className="px-4 py-3 font-bold">Entry</th>
                  <th className="px-4 py-3 font-bold">Category</th>
                  <th className="px-4 py-3 font-bold">Vendor</th>
                  <th className="px-4 py-3 font-bold">Payment</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 text-right font-bold">Amount</th>
                  {!readOnly && <th className="w-[110px] px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.map((r) => {
                  const c = categoryById(r.category);
                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-marigold-50/50">
                      <td className="tnum whitespace-nowrap px-5 py-3.5 text-[12.5px] font-semibold text-ink-700">{fmtDate(r.date)}</td>
                      <td className="max-w-[260px] px-4 py-3.5">
                        <p className="truncate text-[13.5px] font-semibold text-ink-950">{r.description}</p>
                        {r.notes && <p className="mt-0.5 truncate text-[11.5px] text-ink-400">{r.notes}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex max-w-[170px] items-center gap-1.5 truncate rounded-full px-2.5 py-1 text-[11.5px] font-semibold"
                          style={{ background: c.soft, color: c.color }}
                          title={r.category === "other" && r.categoryDetail ? `Other — ${r.categoryDetail}` : c.label}
                        >
                          <c.icon size={12.5} strokeWidth={2.3} className="shrink-0" />
                          <span className="truncate">{r.category === "other" && r.categoryDetail ? r.categoryDetail : c.label}</span>
                        </span>
                      </td>
                      <td className="max-w-[150px] truncate px-4 py-3.5 text-[12.5px] font-medium text-ink-700">{r.vendor || "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-[12px] font-medium text-ink-500">{r.payment || "—"}</td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={r.status} />
                      </td>
                      <td className="tnum whitespace-nowrap px-4 py-3.5 text-right text-[13.5px] font-bold text-ink-950">{fmtINR(r.amount)}</td>
                      {!readOnly && (
                        <td className="px-4 py-3.5">
                          <RowActions record={r} onEdit={onEdit} />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* mobile / tablet card list */}
        {filtered.length > 0 && (
          <ul className="divide-y divide-line/60 lg:hidden">
            {filtered.map((r) => {
              const c = categoryById(r.category);
              return (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                  <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: c.soft }}>
                    <c.icon size={16} style={{ color: c.color }} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug text-ink-950">{r.description}</p>
                      <span className="tnum shrink-0 text-[13.5px] font-bold text-ink-950">{fmtINR(r.amount)}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11.5px] text-ink-500">
                      {fmtDate(r.date)}
                      {r.vendor ? ` · ${r.vendor}` : ""}
                      {` · ${r.category === "other" && r.categoryDetail ? r.categoryDetail : c.label}`}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <StatusPill status={r.status} />
                        {r.payment && <span className="text-[11px] font-medium text-ink-400">{r.payment}</span>}
                      </div>
                      {!readOnly && <RowActions record={r} onEdit={onEdit} />}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
