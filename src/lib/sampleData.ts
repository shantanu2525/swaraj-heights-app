import type { MaintenanceRecord, Payment, Unit } from "../types";
import { currentMonthKey, shiftMonth } from "./format";

function iso(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

let seed = Date.now();
const mk = (
  daysAgo: number,
  category: string,
  description: string,
  vendor: string,
  amount: number,
  status: "paid" | "pending",
  payment: MaintenanceRecord["payment"],
  notes = ""
): MaintenanceRecord => ({
  id: `demo-${seed -= 1}-${Math.random().toString(36).slice(2, 8)}`,
  date: iso(daysAgo),
  category,
  categoryDetail: "",
  description,
  vendor,
  amount,
  status,
  payment: status === "paid" ? payment : "",
  notes,
  createdAt: Date.now() - daysAgo * 86_400_000,
});

export function buildSampleRecords(): MaintenanceRecord[] {
  return [
    mk(2, "plumbing", "Pressure pump repair — Block B basement", "Sharma Plumbing Works", 4500, "paid", "UPI", "Impeller replaced, 6-month warranty"),
    mk(5, "housekeeping", "Monthly housekeeping material", "CleanPro Supplies", 3200, "paid", "Bank Transfer", "Phenyl, mops, garbage bags (Nov cycle)"),
    mk(9, "electrical", "DG set quarterly servicing", "Kirloskar Care AMC", 8500, "paid", "Bank Transfer", "Oil + filters changed"),
    mk(14, "lift", "Lift AMC — Tower A & B (quarterly)", "Otis Elevator Co.", 12000, "paid", "Cheque", "Cheque #0041, cleared 3rd day"),
    mk(18, "painting", "Staircase railings repaint — Block C", "Asian Paints Contractor", 6750, "pending", "", "Work done, awaiting committee approval"),
    mk(26, "security", "CCTV — added 2 cameras at rear gate", "SecureEyes Systems", 9400, "paid", "UPI", "DVR capacity upgraded to 16 ch"),
    mk(34, "civil", "Terrace waterproofing patch — Flat 7B above", "WaterSeal Solutions", 15500, "pending", "", "First coat applied; leak check after rain"),
    mk(41, "pest", "Quarterly pest control — common areas", "PestO India", 2800, "paid", "UPI"),
    mk(52, "garden", "Garden returfing + 40 new plants", "GreenNest Landscapes", 7200, "paid", "Cash", "Includes manure and drip line fix"),
    mk(61, "electrical", "Lobby LED panel replacement (14 nos.)", "City Electricals", 5600, "paid", "UPI"),
    mk(78, "lift", "Lift intercom repair — Tower A", "Otis Elevator Co.", 1800, "paid", "UPI"),
    mk(96, "plumbing", "Overhead tank cleaning (4 tanks)", "HydroClean Services", 6000, "paid", "Bank Transfer", "Half-yearly cleaning, photos on file"),
    mk(128, "civil", "Compound wall crack repair (north side)", "Raju & Sons Masons", 11200, "paid", "Cheque"),
    mk(141, "housekeeping", "Deep cleaning — gym + community hall", "CleanPro Supplies", 3900, "paid", "UPI"),
    mk(21, "water", "Water tankers — 6 trips during supply cut", "Jal Seva Tankers", 7800, "paid", "Cash"),
    mk(37, "staff", "Watchman salary — monthly", "Society Staff", 18000, "paid", "Bank Transfer"),
    mk(46, "fire", "Fire extinguisher refilling (12 nos.)", "SafeGuard Fire Services", 8400, "paid", "Bank Transfer"),
    mk(68, "events", "Ganesh Utsav decorations & pandal", "Shree Decorators", 14500, "paid", "Cash"),
    { ...mk(84, "other", "Borewell desilting & yield test", "AquaBore Services", 9600, "paid", "UPI"), categoryDetail: "Borewell maintenance" },
  ];
}

/* -------------------- sample flats & collections -------------------- */

const TENANTS = ["T. Rao", "P. Verma", "A. Das", "S. Banerjee", "M. Fernandes", "R. Yadav"];
const EMERGENCY = ["Brother — Amit", "Father", "Sister — Priya", "Neighbour A-102", "Son — Rohit", "Daughter — Neha"];

const RESIDENTS = [
  "R. Sharma", "Mehta Family", "S. Iyer", "D. Patel", "K. Reddy", "A. Khan",
  "N. Gupta", "P. Nair", "V. Singh", "S. Kulkarni", "J. Desai", "M. Chawla",
  "B. Joshi", "H. Malhotra", "F. D'Souza", "G. Menon",
  "A. Bhatt", "S. Pillai", "R. Saxena", "K. Bose",
  "M. Trivedi", "P. Mishra", "L. Hegde", "V. Chauhan",
];

/** tiny seeded PRNG so the demo data feels stable */
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildSampleUnits(defaultAmount = 3500): Unit[] {
  const rand = mulberry32(20260214);
  const units: Unit[] = [];
  for (const wing of ["A", "B"]) {
    for (let floor = 1; floor <= 5; floor++) {
      for (let n = 1; n <= 2; n++) {
        const flatNo = `${floor}${String(n).padStart(2, "0")}`;
        const label = `${wing}-${flatNo}`;
        const owner = RESIDENTS[Math.floor(rand() * RESIDENTS.length)];
        const roll = rand();
        const occupancy: Unit["occupancy"] = roll > 0.92 ? "vacant" : roll > 0.7 ? "tenant" : "owner";
        const tenantName = occupancy === "tenant" ? TENANTS[Math.floor(rand() * TENANTS.length)] : "";
        const mob = () => `9${String(Math.floor(rand() * 900000000) + 100000000)}`.slice(0, 10);
        const ownerMobile = mob();
        const tenantMobile = occupancy === "tenant" ? mob() : "";
        units.push({
          id: `demo-unit-${label}`,
          label,
          wing,
          floor,
          flatNo,
          resident: occupancy === "tenant" ? tenantName : occupancy === "vacant" ? "" : owner,
          amount: wing === "B" && floor === 5 ? defaultAmount + 1500 : 0,
          occupancy,
          members: occupancy === "vacant" ? 0 : 1 + Math.floor(rand() * 5),
          ownerName: owner,
          ownerMobile,
          ownerEmail: `${owner.split(" ").pop()!.toLowerCase()}@example.com`,
          ownerAddress: occupancy === "tenant" ? "Lives at Koregaon Park, Pune" : "",
          tenantName,
          tenantMobile,
          tenantEmail: occupancy === "tenant" ? `${tenantName.split(" ").pop()!.toLowerCase()}@example.com` : "",
          tenantAddress: occupancy === "tenant" ? "Native: Nashik, Maharashtra" : "",
          tenantFrom: occupancy === "tenant" ? "2025-06-01" : "",
          tenantAgreement: occupancy === "tenant" ? "11-month leave & licence" : "",
          tenantMembers: occupancy === "tenant" ? 1 + Math.floor(rand() * 4) : 0,
          tenantFamilyMembers: "",
          tenantEmergencyName: occupancy === "tenant" ? EMERGENCY[Math.floor(rand() * EMERGENCY.length)] : "",
          tenantEmergencyMobile: occupancy === "tenant" ? mob() : "",
          emergencyName: occupancy === "vacant" ? "" : EMERGENCY[Math.floor(rand() * EMERGENCY.length)],
          emergencyMobile: occupancy === "vacant" ? "" : mob(),
          parkingSlot: rand() > 0.3 ? `P-${1 + Math.floor(rand() * 40)}` : "",
          vehicles: rand() > 0.4 ? `MH12 ${String.fromCharCode(65 + Math.floor(rand() * 26))}${String.fromCharCode(65 + Math.floor(rand() * 26))} ${1000 + Math.floor(rand() * 8999)}` : "",
          notes: "",
          familyMembers: "",
          passwordHash: "",
        });
      }
    }
  }
  return units;
}

export function buildSamplePayments(units: Unit[], defaultAmount = 3500): Payment[] {
  const rand = mulberry32(987654321);
  const payments: Payment[] = [];
  const modes: Payment["mode"][] = ["UPI", "UPI", "UPI", "Bank Transfer", "Cash", "Cheque"];
  const today = new Date();

  for (let back = 2; back >= 0; back--) {
    const month = shiftMonth(currentMonthKey(), -back);
    const chance = back === 0 ? 0.55 : 0.9; // current month is still being collected
    for (const u of units) {
      if (rand() > chance) continue;
      const maxDay = back === 0 ? today.getDate() : 26;
      const day = 1 + Math.floor(rand() * maxDay);
      const paidOn = `${month}-${String(day).padStart(2, "0")}`;
      const amount = u.amount > 0 ? u.amount : defaultAmount;
      payments.push({
        id: `demo-pay-${u.label}-${month}`,
        unitId: u.id,
        flat: u.label,
        month,
        amount,
        paidOn,
        mode: modes[Math.floor(rand() * modes.length)],
        receipt: `RCP-${month.replace("-", "")}-${u.label.replace("-", "")}`,
        notes: "",
        createdAt: new Date(paidOn + "T12:00:00").getTime(),
      });
    }
  }
  return payments;
}
