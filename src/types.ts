export type RecordStatus = "paid" | "pending";

export type PaymentMode = "UPI" | "Cash" | "Bank Transfer" | "Cheque" | "Card" | "";

export interface MaintenanceRecord {
  id: string;
  /** ISO date yyyy-mm-dd */
  date: string;
  category: string;
  /** free-text label shown when category is "other" (optional) */
  categoryDetail: string;
  description: string;
  vendor: string;
  amount: number;
  status: RecordStatus;
  payment: PaymentMode;
  notes: string;
  createdAt: number;
}

/** Who currently lives in the flat */
export type Occupancy = "owner" | "tenant" | "vacant";

/** A flat / unit in the building */
export interface Unit {
  id: string;
  /** e.g. "A-101" — built from wing + flat no. */
  label: string;
  /** optional wing / block, e.g. "A" */
  wing: string;
  /** floor number (0 = ground) */
  floor: number;
  /** flat number as entered, e.g. "101" */
  flatNo: string;
  /** current occupant name — derived from owner/tenant, kept for compatibility */
  resident: string;
  /** monthly maintenance for this flat; 0 → use the society default */
  amount: number;

  occupancy: Occupancy;
  /** total people living in the flat */
  members: number;

  ownerName: string;
  ownerMobile: string;
  ownerEmail: string;
  /** where the owner lives when the flat is rented out */
  ownerAddress: string;

  tenantName: string;
  tenantMobile: string;
  tenantEmail: string;
  /** tenant's permanent / native address */
  tenantAddress: string;
  /** yyyy-mm-dd */
  tenantFrom: string;
  /** agreement / police verification reference */
  tenantAgreement: string;
  /** how many people live in the rented flat */
  tenantMembers: number;
  /** family member names of the tenant household */
  tenantFamilyMembers: string;
  /** emergency contact for the tenant household */
  tenantEmergencyName: string;
  tenantEmergencyMobile: string;

  /** owner-side emergency contact */
  emergencyName: string;
  emergencyMobile: string;

  /** vehicle numbers */
  vehicles: string;
  /** parking slot allotment — admin only */
  parkingSlot: string;
  notes: string;

  /** names of family members living in the flat — owners may edit this */
  familyMembers: string;
  /** "salt$sha256" for the owner login; empty → first login uses the mobile no. */
  passwordHash: string;
}

export type Role = "admin" | "owner";

export interface Session {
  role: Role;
  /** set when role === "owner" */
  unitId?: string;
  /** mobile used to sign in — shown if the flat can't be found later */
  mobile?: string;
}

/** One flat paying maintenance for one month */
export interface Payment {
  id: string;
  unitId: string;
  /** flat label snapshot (kept for history even if the unit is removed) */
  flat: string;
  /** yyyy-mm */
  month: string;
  amount: number;
  /** yyyy-mm-dd */
  paidOn: string;
  mode: PaymentMode;
  receipt: string;
  notes: string;
  createdAt: number;
}

export type SyncStatus = "local" | "syncing" | "synced" | "error";

/** Society letterhead + app-lock metadata (synced to the sheet's Settings tab) */
export interface AppMeta {
  /** society / building name */
  name: string;
  address: string;
  phone: string;
  /** "salt$sha256hex" — empty string means no lock */
  passwordHash: string;
}

export interface AppState {
  records: MaintenanceRecord[];
  units: Unit[];
  payments: Payment[];
  /** society-wide default monthly maintenance (₹) */
  defaultAmount: number;
  meta: AppMeta;
  sheetUrl: string | null;
  sync: SyncStatus;
  lastSynced: number | null;
  lastError: string | null;
  /** Apps Script version reported by the sheet (null = unknown) */
  scriptVersion: number | null;
}
