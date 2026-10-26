const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrExact = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** ₹1,25,000 style */
export function fmtINR(n: number): string {
  if (!isFinite(n)) return "₹0";
  return Number.isInteger(n) ? inr.format(n) : inrExact.format(n);
}

/** Compact: ₹1.2L / ₹45k / ₹900 */
export function fmtINRCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2).replace(/\.00$/, "")}Cr`;
  if (abs >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1).replace(/\.0$/, "")}L`;
  if (abs >= 1_000) return `₹${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return fmtINR(n);
}

const dtf = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return dtf.format(d);
}

export function fmtDateTime(ts: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ts));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  if (!Number.isFinite(y) || !Number.isFinite(m) || isNaN(d.getTime())) return key;
  return new Intl.DateTimeFormat("en-IN", { month: "short" }).format(d);
}

export function todayISO(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* ------------------------- month helpers ------------------------- */

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Normalise a month value into "yyyy-mm".
 *
 * Google Sheets auto-converts "2026-02" into a real Date cell, so a value
 * read back from the sheet can arrive as a JS date string like
 * "Sat Feb 01 2026 00:00:00 GMT+0530". Without this, a paid due silently
 * stops matching the selected month and shows as pending again.
 */
const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export function normalizeMonthKey(v: unknown): string {
  if (v instanceof Date) return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}`;
  const s = String(v ?? "").trim();
  if (!s) return "";
  // already "2026-02" / "2026-02-01"
  const iso = /^(\d{4})-(\d{1,2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}`;
  // "Sat Feb 01 2026 00:00:00 GMT+0530 ..." or "Feb 1, 2026" — read the month
  // name straight from the text; new Date() would shift it across a timezone
  // and report the previous month.
  const named = /([A-Za-z]{3})[\s-]+\d{1,2}[\s,]+\w*\s*(\d{4})/.exec(s) ?? /^([A-Za-z]{3})\s+(\d{4})$/.exec(s);
  if (named) {
    const m = MONTH_NAMES[named[1].toLowerCase()];
    if (m) return `${named[2]}-${String(m).padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return s.slice(0, 7);
}

/** shift a yyyy-mm key by ±n months */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** "February 2026" */
export function monthLongLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  if (!Number.isFinite(y) || !Number.isFinite(m) || isNaN(d.getTime())) return key;
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(d);
}

/** natural compare so A-101 sorts before A-1002 */
export function compareFlatLabels(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Receipt numbers look like RCP-202602-A101 — the month stamp plus the flat
 * number, so anyone can tell at a glance which flat the receipt belongs to.
 * Flat labels are unique and each flat gets at most one receipt per month,
 * so the number is always unique.
 */
export function formatReceiptNo(month: string, flatLabel: string): string {
  const flat = flatLabel.toUpperCase().replace(/[^A-Z0-9]/g, "") || "FLAT";
  return `RCP-${month.replace("-", "")}-${flat}`;
}

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
