import { useSyncExternalStore } from "react";
import type { AppMeta, AppState, MaintenanceRecord, Payment, SyncStatus, Unit } from "../types";
import { pullAll, pushAll, validateSheetUrl } from "./sheets";
import { buildSamplePayments, buildSampleRecords, buildSampleUnits } from "./sampleData";
import { compareFlatLabels, currentMonthKey, uid } from "./format";
import { normalizeMobile } from "./auth";
import { toast } from "./toaster";
import { APPS_SCRIPT_WEB_APP_URL, HAS_CONFIGURED_BACKEND } from "../config";

const LS_RECORDS = "khata.records.v1";
const LS_UNITS = "khata.units.v1";
const LS_PAYMENTS = "khata.payments.v1";
const LS_DEFAULT_AMOUNT = "khata.defaultAmount.v2";
const LS_META = "khata.meta.v1";
const LS_META_LEGACY = "khata.society.v1"; // pre-sync letterhead
const LS_URL = "khata.sheetUrl.v1";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const EMPTY_META: AppMeta = { name: "", address: "", phone: "", passwordHash: "" };

function loadMeta(): AppMeta {
  const stored = readJSON<Partial<AppMeta> | null>(LS_META, null);
  if (stored) return { ...EMPTY_META, ...stored };
  // one-time migration of the old on-device letterhead
  const legacy = readJSON<Partial<AppMeta> | null>(LS_META_LEGACY, null);
  if (legacy) return { ...EMPTY_META, name: legacy.name ?? "", address: legacy.address ?? "", phone: legacy.phone ?? "" };
  return EMPTY_META;
}

/** Drop credentials left by the retired tenant-login feature from local data. */
function loadUnits(): Unit[] {
  return readJSON<(Unit & { tenantPasswordHash?: string })[]>(LS_UNITS, []).map((raw) => {
    const { tenantPasswordHash: _removed, ...unit } = raw;
    return unit as Unit;
  });
}

// Code-level configuration wins on every device. The local value remains as
// a backwards-compatible fallback for existing installations.
const storedUrl = HAS_CONFIGURED_BACKEND
  ? APPS_SCRIPT_WEB_APP_URL.trim()
  : localStorage.getItem(LS_URL);

let state: AppState = {
  records: readJSON<MaintenanceRecord[]>(LS_RECORDS, []),
  units: loadUnits(),
  payments: readJSON<Payment[]>(LS_PAYMENTS, []),
  defaultAmount: readJSON<number>(LS_DEFAULT_AMOUNT, 3000),
  meta: loadMeta(),
  sheetUrl: storedUrl,
  sync: storedUrl ? "synced" : "local",
  lastSynced: null,
  lastError: null,
  scriptVersion: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  try {
    localStorage.setItem(LS_RECORDS, JSON.stringify(state.records));
    localStorage.setItem(LS_UNITS, JSON.stringify(state.units));
    localStorage.setItem(LS_PAYMENTS, JSON.stringify(state.payments));
    localStorage.setItem(LS_DEFAULT_AMOUNT, JSON.stringify(state.defaultAmount));
    localStorage.setItem(LS_META, JSON.stringify(state.meta));
    if (state.sheetUrl) localStorage.setItem(LS_URL, state.sheetUrl);
    else localStorage.removeItem(LS_URL);
  } catch {
    /* storage full — ignore */
  }
}

function setState(patch: Partial<AppState>) {
  state = { ...state, ...patch };
  persist();
  emit();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export const getState = () => state;

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

/* ------------------------------ ordering ------------------------------ */

function sortRecords(list: MaintenanceRecord[]): MaintenanceRecord[] {
  return [...list].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));
}

function sortUnits(list: Unit[]): Unit[] {
  return [...list].sort((a, b) => compareFlatLabels(a.label, b.label));
}

function sortPayments(list: Payment[]): Payment[] {
  return [...list].sort((a, b) =>
    a.paidOn === b.paidOn ? b.createdAt - a.createdAt : a.paidOn < b.paidOn ? 1 : -1
  );
}

/* ------------------------------ sync engine ------------------------------ */

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush() {
  if (!state.sheetUrl) return;
  setState({ sync: "syncing" });
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushNow();
  }, 900);
}

export async function pushNow(): Promise<boolean> {
  if (!state.sheetUrl) return false;
  setState({ sync: "syncing", lastError: null });
  try {
    const { version } = await pushAll(state.sheetUrl, {
      records: state.records,
      units: state.units,
      payments: state.payments,
      meta: state.meta,
    });
    setState({ sync: "synced", lastSynced: Date.now(), scriptVersion: version });
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sync failed.";
    setState({ sync: "error", lastError: msg });
    return false;
  }
}

function applyRemote(records: MaintenanceRecord[], units: Unit[], payments: Payment[], meta: AppMeta, version: number) {
  // Meta merge: scripts older than v3 don't return meta at all — keep local
  // values rather than wiping them. On v3+, prefer sheet values but fall back
  // to local for any key left blank remotely (avoids accidental loss).
  const mergedMeta = { ...EMPTY_META };
  if (version >= 3) {
    for (const k of Object.keys(EMPTY_META) as (keyof AppMeta)[]) {
      mergedMeta[k] = meta[k] || state.meta[k];
    }
  } else {
    Object.assign(mergedMeta, state.meta);
  }
  setState({
    records: sortRecords(records),
    units: sortUnits(units),
    payments: sortPayments(payments),
    meta: mergedMeta,
    sync: "synced",
    lastSynced: Date.now(),
    scriptVersion: version,
  });
}

export async function pullNow(opts?: { quiet?: boolean }): Promise<boolean> {
  if (!state.sheetUrl) return false;
  setState({ sync: "syncing", lastError: null });
  try {
    const remote = await pullAll(state.sheetUrl);
    applyRemote(remote.records, remote.units, remote.payments, remote.meta, remote.version);
    if (!opts?.quiet) toast("Pulled the latest data from your sheet");
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not read the sheet.";
    setState({ sync: "error", lastError: msg });
    if (!opts?.quiet) toast(msg, "error");
    return false;
  }
}

/** Save a web-app URL and connect: pull if the sheet has data, else push local data up. */
export async function connectSheet(url: string): Promise<boolean> {
  const errMsg = validateSheetUrl(url);
  if (errMsg) {
    toast(errMsg, "error");
    return false;
  }
  const clean = url.trim();
  setState({ sheetUrl: clean, sync: "syncing", lastError: null });
  try {
    const remote = await pullAll(clean);
    const remoteCount =
      remote.records.length +
      remote.units.length +
      remote.payments.length +
      Object.values(remote.meta).filter(Boolean).length;
    if (remoteCount > 0) {
      applyRemote(remote.records, remote.units, remote.payments, remote.meta, remote.version);
      toast(`Connected — imported ${remoteCount} row${remoteCount === 1 ? "" : "s"} from the sheet`);
    } else if (state.records.length + state.units.length + state.payments.length > 0) {
      const ok = await pushNow();
      if (ok) toast("Connected — pushed your local data to the sheet");
    } else {
      setState({ sync: "synced", lastSynced: Date.now(), scriptVersion: remote.version });
      toast("Connected to Google Sheet");
    }
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Connection failed.";
    setState({ sync: "error", lastError: msg });
    toast(msg, "error");
    return false;
  }
}

export function disconnectSheet() {
  setState({ sheetUrl: null, sync: "local", lastError: null, scriptVersion: null });
  toast("Disconnected — data now kept only in this browser", "info");
}

/* ------------------------------ meta (letterhead & lock) ------------------------------ */

export function setMeta(patch: Partial<AppMeta>) {
  setState({ meta: { ...state.meta, ...patch } });
  schedulePush();
}

/* ------------------------------ expenses ------------------------------ */

export function addRecord(r: MaintenanceRecord) {
  setState({ records: sortRecords([r, ...state.records]) });
  schedulePush();
}

export function updateRecord(id: string, patch: Partial<MaintenanceRecord>) {
  setState({
    records: sortRecords(state.records.map((r) => (r.id === id ? { ...r, ...patch } : r))),
  });
  schedulePush();
}

export function deleteRecord(id: string) {
  setState({ records: state.records.filter((r) => r.id !== id) });
  schedulePush();
}

/* ------------------------------ flats ------------------------------ */

export const unitAmount = (u: Unit, fallback = state.defaultAmount): number =>
  u.amount > 0 ? u.amount : fallback;

/** an empty flat record, ready for the add-flat form */
export function blankUnit(): Unit {
  return {
    id: uid(),
    label: "",
    wing: "",
    floor: 0,
    flatNo: "",
    resident: "",
    amount: 0,
    occupancy: "owner",
    members: 0,
    ownerName: "",
    ownerMobile: "",
    ownerEmail: "",
    ownerAddress: "",
    tenantName: "",
    tenantMobile: "",
    tenantEmail: "",
    tenantAddress: "",
    tenantFrom: "",
    tenantAgreement: "",
    tenantMembers: 0,
    tenantFamilyMembers: "",
    tenantEmergencyName: "",
    tenantEmergencyMobile: "",
    emergencyName: "",
    emergencyMobile: "",
    vehicles: "",
    parkingSlot: "",
    notes: "",
    familyMembers: "",
    passwordHash: "",
  };
}

/** "A" + "101" → "A-101" (wing optional) */
export function buildLabel(wing: string, flatNo: string): string {
  const w = wing.trim().toUpperCase();
  const f = flatNo.trim().toUpperCase();
  return w ? `${w}-${f}` : f;
}

/** name of whoever currently lives there */
export function occupantName(u: Unit): string {
  if (u.occupancy === "vacant") return "";
  const name = u.occupancy === "tenant" ? u.tenantName : u.ownerName;
  return name || u.resident || "";
}

/** phone to call for this flat */
export function occupantMobile(u: Unit): string {
  return (u.occupancy === "tenant" ? u.tenantMobile : u.ownerMobile) || u.ownerMobile || "";
}

export function upsertUnit(input: Unit) {
  // keep derived fields consistent
  const u: Unit = {
    ...input,
    label: input.label || buildLabel(input.wing, input.flatNo),
    resident: occupantName(input),
  };
  const exists = state.units.some((x) => x.id === u.id);
  const units = exists ? state.units.map((x) => (x.id === u.id ? u : x)) : [...state.units, u];
  setState({ units: sortUnits(units) });
  // keep collection history labels in step with a renamed flat
  const renamed = state.payments.some((p) => p.unitId === u.id && p.flat !== u.label);
  if (renamed) {
    setState({ payments: state.payments.map((p) => (p.unitId === u.id ? { ...p, flat: u.label } : p)) });
  }
  schedulePush();
}

/** Find a flat by its registered owner mobile. Tenants cannot sign in. */
export function findUnitByMobile(mobile: string): Unit | undefined {
  const m = normalizeMobile(mobile);
  if (m.length < 6) return undefined;
  return state.units.find((u) => normalizeMobile(u.ownerMobile) === m);
}

export function unitById(id: string): Unit | undefined {
  return state.units.find((u) => u.id === id);
}

/** store a new owner password hash (first login / change password) */
export function setUnitPassword(unitId: string, hash: string) {
  setState({ units: state.units.map((u) => (u.id === unitId ? { ...u, passwordHash: hash } : u)) });
  schedulePush();
}

/** fields a flat owner is allowed to change on their own flat */
export type OwnerEditable = Partial<
  Pick<
    Unit,
    | "familyMembers"
    | "ownerEmail"
    | "emergencyName"
    | "emergencyMobile"
    | "vehicles"
    // when the flat is rented out, the owner maintains the tenant record
    | "occupancy"
    | "tenantName"
    | "tenantMobile"
    | "tenantEmail"
    | "tenantAddress"
    | "tenantFrom"
    | "tenantAgreement"
    | "tenantMembers"
    | "tenantFamilyMembers"
    | "tenantEmergencyName"
    | "tenantEmergencyMobile"
  >
>;

/** owners may only change the whitelisted fields above — never flat no., floor,
 *  members, billing amount or parking allotment (admin-controlled). */
export function updateOwnProfile(unitId: string, patch: OwnerEditable) {
  setState({
    units: state.units.map((u) => {
      if (u.id !== unitId) return u;
      const next = { ...u, ...patch };
      // keep the derived occupant name in step
      return { ...next, resident: occupantName(next) };
    }),
  });
  schedulePush();
}

/** true when another flat already uses this label */
export function labelTaken(label: string, exceptId?: string): boolean {
  const l = label.trim().toUpperCase();
  return state.units.some((u) => u.id !== exceptId && u.label.toUpperCase() === l);
}

export function removeUnit(id: string) {
  setState({
    units: state.units.filter((u) => u.id !== id),
    payments: state.payments.filter((p) => p.unitId !== id),
  });
  schedulePush();
}

export function setDefaultAmount(amount: number) {
  setState({ defaultAmount: Math.max(0, Math.round(amount)) });
  schedulePush();
}

/* ------------------------------ collections ------------------------------ */

export function paymentFor(unitId: string, month: string): Payment | undefined {
  return state.payments.find((p) => p.unitId === unitId && p.month === month);
}

/** record (or overwrite) one flat's payment for one month */
export function collectPayment(p: Payment) {
  const rest = state.payments.filter((x) => !(x.unitId === p.unitId && x.month === p.month));
  setState({ payments: sortPayments([p, ...rest]) });
  schedulePush();
}

export function removePayment(id: string) {
  setState({ payments: state.payments.filter((p) => p.id !== id) });
  schedulePush();
}

/* ------------------------------ bulk ------------------------------ */

export function loadSample() {
  const units = buildSampleUnits(state.defaultAmount);
  setState({
    records: sortRecords(buildSampleRecords()),
    units,
    payments: sortPayments(buildSamplePayments(units, state.defaultAmount)),
  });
  schedulePush();
  toast("Sample data loaded — expenses, flats & collections");
}

export function clearAll() {
  setState({ records: [], units: [], payments: [] });
  schedulePush();
  toast("Everything cleared", "info");
}

export function setSyncStatus(s: SyncStatus) {
  setState({ sync: s });
}

export { currentMonthKey };
