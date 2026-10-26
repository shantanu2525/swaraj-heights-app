import { useState } from "react";
import {
  Home,
  Users,
  Phone,
  Mail,
  Siren,
  Car,
  SquareParking,
  IndianRupee,
  KeyRound,
  Check,
  Lock,
  UserCheck,
  User,
  Info,
} from "lucide-react";
import { useAppState, unitAmount, updateOwnProfile, setUnitPassword, occupantName } from "../lib/store";
import { fmtINR } from "../lib/format";
import { passwordRecord, verifyPassword } from "../lib/auth";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { Occupancy, Unit } from "../types";
import TenantFields from "./TenantFields";

function ReadOnly({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  icon?: typeof Home;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">
        {Icon && <Icon size={11.5} />} {label}
      </p>
      <p className="truncate rounded-xl border border-line bg-paper/70 px-3.5 py-2.5 text-[13px] font-semibold text-ink-700">
        {value || "—"}
      </p>
    </div>
  );
}

function PasswordCard({ unit }: { unit: Unit }) {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [cf, setCf] = useState("");
  const [busy, setBusy] = useState(false);

  const valid = nw.length >= 4 && nw === cf && Boolean(cur);

  async function change(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    if (!(await verifyPassword(cur, unit.passwordHash))) {
      setBusy(false);
      toast("Current password is incorrect", "error");
      return;
    }
    setUnitPassword(unit.id, await passwordRecord(nw));
    setBusy(false);
    setCur("");
    setNw("");
    setCf("");
    toast("Password updated");
  }

  return (
    <form onSubmit={change} className="card animate-rise rise-2 p-5 sm:p-6">
      <h3 className="font-display flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink-950">
        <KeyRound size={16} className="text-marigold-600" /> Change password
      </h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">Current</span>
          <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} className="field w-full" autoComplete="current-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">New password</span>
          <input type="password" value={nw} onChange={(e) => setNw(e.target.value)} className="field w-full" autoComplete="new-password" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10.5px] font-semibold text-ink-500">Confirm</span>
          <input type="password" value={cf} onChange={(e) => setCf(e.target.value)} className={cn("field w-40", cf && nw !== cf && "border-clay-600!")} autoComplete="new-password" />
        </label>
        <button type="submit" disabled={!valid || busy} className="btn-primary">
          <Check size={15} /> {busy ? "Saving…" : "Update"}
        </button>
      </div>
      {nw && nw.length < 4 && <p className="mt-2 text-[11.5px] font-medium text-clay-600">Use at least 4 characters.</p>}
    </form>
  );
}

export default function ProfileView({ unitId }: { unitId: string }) {
  const { units, defaultAmount } = useAppState();
  const unit = units.find((u) => u.id === unitId);

  const [family, setFamily] = useState(unit?.familyMembers ?? "");
  const [email, setEmail] = useState(unit?.ownerEmail ?? "");
  const [emName, setEmName] = useState(unit?.emergencyName ?? "");
  const [emMobile, setEmMobile] = useState(unit?.emergencyMobile ?? "");
  const [vehicles, setVehicles] = useState(unit?.vehicles ?? "");
  // tenancy block — the owner maintains this when the flat is rented out
  const [occupancy, setOccupancy] = useState<Occupancy>(unit?.occupancy ?? "owner");
  const [tenant, setTenant] = useState(() => ({
    tenantName: unit?.tenantName ?? "",
    tenantMobile: unit?.tenantMobile ?? "",
    tenantEmail: unit?.tenantEmail ?? "",
    tenantAddress: unit?.tenantAddress ?? "",
    tenantFrom: unit?.tenantFrom ?? "",
    tenantAgreement: unit?.tenantAgreement ?? "",
    tenantMembers: unit?.tenantMembers ?? 0,
    tenantFamilyMembers: unit?.tenantFamilyMembers ?? "",
    tenantEmergencyName: unit?.tenantEmergencyName ?? "",
    tenantEmergencyMobile: unit?.tenantEmergencyMobile ?? "",
  }));

  if (!unit) {
    return <p className="card p-6 text-[13px] text-ink-500">Your flat record could not be found. Please contact the admin.</p>;
  }

  const tenancyDirty =
    occupancy !== unit.occupancy ||
    (Object.keys(tenant) as (keyof typeof tenant)[]).some((k) => tenant[k] !== (unit as any)[k]);

  const dirty =
    family !== unit.familyMembers ||
    email !== unit.ownerEmail ||
    emName !== unit.emergencyName ||
    emMobile !== unit.emergencyMobile ||
    vehicles !== unit.vehicles ||
    tenancyDirty;

  function save() {
    updateOwnProfile(unit!.id, {
      familyMembers: family.trim(),
      ownerEmail: email.trim(),
      emergencyName: emName.trim(),
      emergencyMobile: emMobile.trim(),
      vehicles: vehicles.trim(),
      occupancy,
      ...(occupancy === "tenant"
        ? tenant
        : {
            // clearing tenancy wipes the tenant record
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
          }),
    });
    toast("Details updated");
  }

  return (
    <div className="w-full space-y-4">
      {/* flat summary — locked */}
      <section className="card animate-rise overflow-hidden">
        <div className="pine-texture flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-marigold-500">My flat</p>
            <h2 className="font-display mt-1 text-[24px] font-semibold tracking-tight text-white">{unit.label}</h2>
            <p className="mt-0.5 text-[12px] text-white/45">
              {occupantName(unit) || "—"} ·{" "}
              {unit.occupancy === "tenant" ? "Tenant occupied" : unit.occupancy === "vacant" ? "Vacant" : "Owner occupied"}
            </p>
          </div>
          <span className="grid size-10 place-items-center rounded-xl bg-white/[0.08]">
            {unit.occupancy === "tenant" ? <UserCheck size={19} className="text-marigold-500" /> : <User size={19} className="text-marigold-500" />}
          </span>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <p className="flex items-start gap-1.5 rounded-xl bg-paper px-3.5 py-2.5 text-[11.5px] leading-relaxed text-ink-500">
            <Lock size={13} className="mt-px shrink-0 text-ink-400" />
            Flat number, floor, registered member count, billing and parking allotment are managed by the society admin.
            Contact them for corrections.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReadOnly label="Flat" value={unit.label} icon={Home} />
            <ReadOnly label="Floor" value={unit.floor ? String(unit.floor) : "—"} />
            <ReadOnly label="Registered members" value={unit.members ? String(unit.members) : "—"} icon={Users} />
            <ReadOnly label="Owner name" value={unit.ownerName} icon={User} />
            <ReadOnly label="Owner mobile" value={unit.ownerMobile} icon={Phone} />
            <ReadOnly label="Monthly maintenance" value={fmtINR(unitAmount(unit, defaultAmount))} icon={IndianRupee} />
            <ReadOnly label="Parking slot" value={unit.parkingSlot} icon={SquareParking} className="sm:col-span-3" />
            {unit.occupancy === "tenant" && (
              <>
                <ReadOnly label="Tenant name" value={unit.tenantName} icon={UserCheck} />
                <ReadOnly label="Tenant mobile" value={unit.tenantMobile} icon={Phone} />
              </>
            )}
          </div>
        </div>
      </section>

      {/* parking */}
      <section className="card animate-rise rise-1 p-5 sm:p-6">
        <h3 className="font-display flex items-center gap-2 text-[17px] font-semibold tracking-tight text-ink-950">
          <SquareParking size={16} className="text-marigold-600" /> Parking
        </h3>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-marigold-500/25 bg-marigold-50/60 px-4 py-3.5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-marigold-600">
              <SquareParking size={11.5} /> Allotted slot
            </p>
            <p className="tnum mt-1.5 text-[18px] font-bold tracking-tight text-ink-950">
              {unit.parkingSlot || "Not allotted"}
            </p>
            {unit.parkingSlot && (
              <p className="mt-1 text-[11px] text-ink-500">Managed by the society admin</p>
            )}
          </div>

          <div>
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-400">
              <Car size={11.5} /> Registered vehicles
            </p>
            <p className="min-h-[46px] rounded-xl border border-line bg-paper/70 px-3.5 py-2.5 text-[13px] font-semibold text-ink-700">
              {unit.vehicles || "—"}
            </p>
            <p className="mt-1.5 text-[11px] text-ink-400">
              You can update your vehicles in the section below.
            </p>
          </div>
        </div>
      </section>

      {/* editable */}
      <section className="card animate-rise rise-1 p-5 sm:p-6">
        <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Details you can update</h3>
        <p className="mt-1 text-[12.5px] text-ink-500">Keep your family and emergency details current for the society register.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
              <Users size={11.5} /> Family member names
            </span>
            <textarea
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              rows={2}
              placeholder="e.g. Rajesh Sharma, Sunita Sharma, Aarav Sharma"
              className="field resize-none"
            />
            <span className="mt-1 flex items-center gap-1 text-[11px] text-ink-400">
              <Info size={11} /> Separate names with commas
            </span>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
                <Mail size={11.5} /> Email
              </span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
                <Car size={11.5} /> Vehicle numbers
              </span>
              <input value={vehicles} onChange={(e) => setVehicles(e.target.value)} placeholder="MH12 AB 1234" className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
                <Siren size={11.5} /> Emergency contact name
              </span>
              <input value={emName} onChange={(e) => setEmName(e.target.value)} placeholder="Brother — Amit" className="field" />
            </label>
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
                <Phone size={11.5} /> Emergency mobile
              </span>
              <input
                value={emMobile}
                onChange={(e) => setEmMobile(e.target.value.replace(/[^\d+\-\s]/g, "").slice(0, 18))}
                inputMode="tel"
                placeholder="98765 43210"
                className="field tnum"
              />
            </label>
          </div>

        </div>
      </section>

      {/* tenancy — the owner maintains this */}
      <section className="card animate-rise rise-2 p-5 sm:p-6">
        <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Tenancy</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
          Renting your flat out? Keep the tenant's details current — the society needs them for security and emergencies.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              { id: "owner", label: "I live here", hint: "Owner occupied", icon: User },
              { id: "tenant", label: "Rented out", hint: "Tenant lives here", icon: UserCheck },
              { id: "vacant", label: "Vacant", hint: "Nobody living here", icon: Home },
            ] as const
          ).map((o) => {
            const active = occupancy === o.id;
            return (
              <button
                key={o.id}
                onClick={() => setOccupancy(o.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                  active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-line-strong"
                )}
              >
                <o.icon size={15} className={active ? "text-marigold-500" : "text-ink-400"} />
                <span className="leading-tight">
                  <span className={cn("block text-[12.5px] font-bold", active ? "text-white" : "text-ink-950")}>
                    {o.label}
                  </span>
                  <span className={cn("block text-[10.5px]", active ? "text-white/45" : "text-ink-400")}>{o.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        {occupancy === "tenant" && (
          <div className="animate-rise mt-4 rounded-2xl border border-marigold-500/30 bg-marigold-50/70 p-4">
            <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-marigold-600">
              <UserCheck size={12} /> Tenant details
            </p>
            <TenantFields
              value={tenant}
              onChange={(k, v) => setTenant((prev) => ({ ...prev, [k]: v }))}
              showAgreement={false}
            />
            <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-500">
              <Info size={12} className="mt-px shrink-0 text-marigold-600" />
              Tenant details are visible to the society admin. Tenants cannot sign in to the app.
            </p>
          </div>
        )}

        <button onClick={save} disabled={!dirty} className="btn-primary mt-5">
          <Check size={15} strokeWidth={2.5} /> Save my details
        </button>
      </section>

      <PasswordCard unit={unit} />
    </div>
  );
}
