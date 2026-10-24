import type { AppMeta, MaintenanceRecord, Payment, Unit } from "../types";
import { normalizeMonthKey } from "./format";

/**
 * Talks to a Google Apps Script Web App that fronts a Google Sheet.
 * The web app must be deployed with access "Anyone" and URL ending in /exec.
 * v3 of the script syncs four tabs: expenses, flats, collections and settings
 * (letterhead + lock metadata). Older scripts silently ignore the extra data.
 */

export function validateSheetUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return "Paste your Apps Script Web App URL first.";
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(trimmed))
    return "That doesn't look like an Apps Script URL — it should start with https://script.google.com/";
  if (!/\/exec$/.test(trimmed))
    return "Use the Web App URL that ends with /exec (not /dev).";
  return null;
}

function sanitizeRecord(r: any): MaintenanceRecord | null {
  if (!r || !r.id) return null;
  return {
    id: String(r.id),
    date: String(r.date ?? "").slice(0, 10),
    category: String(r.category ?? "other"),
    categoryDetail: String(r.categoryDetail ?? ""),
    description: String(r.description ?? ""),
    vendor: String(r.vendor ?? ""),
    amount: Number(r.amount) || 0,
    status: r.status === "pending" ? "pending" : "paid",
    payment: (r.payment as MaintenanceRecord["payment"]) ?? "",
    notes: String(r.notes ?? ""),
    createdAt: Number(r.createdAt) || Date.now(),
  };
}

function sanitizeUnit(u: any): Unit | null {
  if (!u || !u.id || !u.label) return null;
  const label = String(u.label);
  const occ = u.occupancy === "tenant" || u.occupancy === "vacant" ? u.occupancy : "owner";
  const ownerName = String(u.ownerName ?? "");
  const tenantName = String(u.tenantName ?? "");
  const legacyResident = String(u.resident ?? "");
  // Rows written before the detailed registry only had a "resident" name
  const fallbackOwner = ownerName || (occ !== "tenant" ? legacyResident : "");
  const fallbackTenant = tenantName || (occ === "tenant" ? legacyResident : "");
  const resident = occ === "tenant" ? fallbackTenant : occ === "vacant" ? "" : fallbackOwner;
  return {
    id: String(u.id),
    label,
    wing: String(u.wing ?? label.split("-")[0] ?? ""),
    floor: Number(u.floor) || 0,
    flatNo: String(u.flatNo ?? label.split("-").slice(1).join("-") ?? ""),
    resident: resident || legacyResident,
    amount: Number(u.amount) || 0,
    occupancy: occ,
    members: Number(u.members) || 0,
    ownerName: fallbackOwner,
    ownerMobile: String(u.ownerMobile ?? ""),
    ownerEmail: String(u.ownerEmail ?? ""),
    ownerAddress: String(u.ownerAddress ?? ""),
    tenantName: fallbackTenant,
    tenantMobile: String(u.tenantMobile ?? ""),
    tenantEmail: String(u.tenantEmail ?? ""),
    tenantAddress: String(u.tenantAddress ?? ""),
    tenantFrom: String(u.tenantFrom ?? "").slice(0, 10),
    tenantAgreement: String(u.tenantAgreement ?? ""),
    tenantMembers: Number(u.tenantMembers) || 0,
    tenantFamilyMembers: String(u.tenantFamilyMembers ?? ""),
    tenantEmergencyName: String(u.tenantEmergencyName ?? ""),
    tenantEmergencyMobile: String(u.tenantEmergencyMobile ?? ""),
    emergencyName: String(u.emergencyName ?? ""),
    emergencyMobile: String(u.emergencyMobile ?? ""),
    vehicles: String(u.vehicles ?? ""),
    parkingSlot: String(u.parkingSlot ?? ""),
    notes: String(u.notes ?? ""),
    familyMembers: String(u.familyMembers ?? ""),
    passwordHash: String(u.passwordHash ?? ""),
  };
}

/** recover a yyyy-mm-dd from a sheet cell that may have become a Date */
function normalizeDateKey(v: unknown): string {
  if (v instanceof Date) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  const s = String(v ?? "").trim();
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
  if (m) return m[1];
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  return s.slice(0, 10);
}

function sanitizePayment(p: any): Payment | null {
  if (!p || !p.id) return null;
  return {
    id: String(p.id),
    unitId: String(p.unitId ?? ""),
    flat: String(p.flat ?? ""),
    month: normalizeMonthKey(p.month),
    amount: Number(p.amount) || 0,
    paidOn: normalizeDateKey(p.paidOn),
    mode: (p.mode as Payment["mode"]) ?? "",
    receipt: String(p.receipt ?? ""),
    notes: String(p.notes ?? ""),
    createdAt: Number(p.createdAt) || Date.now(),
  };
}

async function parseJson(res: Response) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "The web app didn't return JSON. Make sure the URL ends with /exec and access is set to “Anyone”."
    );
  }
}

function sanitizeMeta(raw: any): AppMeta {
  const m = (raw ?? {}) as Record<string, unknown>;
  return {
    name: String(m.name ?? ""),
    address: String(m.address ?? ""),
    phone: String(m.phone ?? ""),
    passwordHash: String(m.passwordHash ?? ""),
  };
}

export interface SheetData {
  version: number;
  records: MaintenanceRecord[];
  units: Unit[];
  payments: Payment[];
  meta: AppMeta;
}

/** GET everything from the sheet */
export async function pullAll(url: string): Promise<SheetData> {
  const res = await fetch(url, { method: "GET", redirect: "follow" });
  if (!res.ok) throw new Error(`Request failed (${res.status}). Check the deployment access settings.`);
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.error || "The script returned an error. Re-check the pasted code.");
  return {
    // v1 scripts don't report a version → treat as 1
    version: Number(json.version) || 1,
    records: ((json.records as any[]) ?? []).map(sanitizeRecord).filter(Boolean) as MaintenanceRecord[],
    units: ((json.units as any[]) ?? []).map(sanitizeUnit).filter(Boolean) as Unit[],
    payments: ((json.payments as any[]) ?? []).map(sanitizePayment).filter(Boolean) as Payment[],
    meta: sanitizeMeta(json.meta),
  };
}

/** POST the full local dataset (replaces sheet contents; v1 scripts just sync expenses) */
export async function pushAll(
  url: string,
  data: { records: MaintenanceRecord[]; units: Unit[]; payments: Payment[]; meta: AppMeta }
): Promise<{ version: number }> {
  const res = await fetch(url, {
    method: "POST",
    redirect: "follow",
    // text/plain keeps it a "simple request" → no CORS preflight against Apps Script
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "sync", ...data }),
  });
  if (!res.ok) throw new Error(`Sync failed (${res.status}).`);
  const json = await parseJson(res);
  if (!json.ok) throw new Error(json.error || "The script returned an error while saving.");
  return { version: Number(json.version) || 1 };
}
