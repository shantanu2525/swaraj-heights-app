import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  Phone,
  Home,
  UserCheck,
  User,
  DoorOpen,
  Check,
  X,
  Siren,
  Car,
  IndianRupee,
} from "lucide-react";
import { useAppState, removeUnit, setDefaultAmount, unitAmount, occupantName } from "../lib/store";
import { fmtINR, compareFlatLabels } from "../lib/format";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { Occupancy, Unit } from "../types";
import FlatForm from "./FlatForm";

const OCC_STYLE: Record<Occupancy, { label: string; cls: string; icon: typeof User }> = {
  owner: { label: "Owner", cls: "bg-leaf-100 text-leaf-700", icon: User },
  tenant: { label: "Rented", cls: "bg-marigold-100 text-marigold-600", icon: UserCheck },
  vacant: { label: "Vacant", cls: "bg-paper text-ink-400", icon: DoorOpen },
};

function FlatCard({ unit, onEdit }: { unit: Unit; onEdit: () => void }) {
  const { defaultAmount } = useAppState();
  const [confirming, setConfirming] = useState(false);
  const occ = OCC_STYLE[unit.occupancy];
  const name = occupantName(unit);
  const phone = unit.occupancy === "tenant" ? unit.tenantMobile : unit.ownerMobile;

  return (
    <div className="card card-hover p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="tnum text-[15px] font-bold tracking-tight text-ink-950">{unit.label}</span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold", occ.cls)}>
              <occ.icon size={10} /> {occ.label}
            </span>
          </div>
          <p className="mt-1 truncate text-[12.5px] font-semibold text-ink-700">{name || "— no resident —"}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          {confirming ? (
            <>
              <button
                onClick={() => {
                  removeUnit(unit.id);
                  toast(`${unit.label} removed from the register`, "info");
                }}
                className="grid size-7 place-items-center rounded-lg bg-clay-600 text-white"
                title="Confirm removal (also deletes its collections)"
              >
                <Check size={13} strokeWidth={3} />
              </button>
              <button onClick={() => setConfirming(false)} className="grid size-7 place-items-center rounded-lg border border-line text-ink-500">
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onEdit}
                className="grid size-7 place-items-center rounded-lg text-ink-400 transition hover:bg-paper hover:text-ink-950"
                title="Edit flat"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => {
                  setConfirming(true);
                  setTimeout(() => setConfirming(false), 3000);
                }}
                className="grid size-7 place-items-center rounded-lg text-ink-300 transition hover:bg-clay-100 hover:text-clay-600"
                title="Remove flat"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-dashed border-line pt-3 text-[11.5px]">
        {phone && (
          <div className="col-span-2 flex items-center gap-1.5 text-ink-600">
            <Phone size={11} className="shrink-0 text-ink-300" />
            <a href={`tel:${phone}`} className="tnum font-semibold text-ink-700 hover:text-marigold-600">
              {phone}
            </a>
          </div>
        )}
        {unit.members > 0 && (
          <div className="flex items-center gap-1.5 text-ink-500">
            <Users size={11} className="shrink-0 text-ink-300" />
            <span className="tnum">{unit.members} members</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-ink-500">
          <IndianRupee size={11} className="shrink-0 text-ink-300" />
          <span className="tnum">
            {fmtINR(unitAmount(unit, defaultAmount))}
            {unit.amount === 0 && <span className="text-ink-300"> (default)</span>}
          </span>
        </div>
        {unit.occupancy === "tenant" && unit.ownerName && (
          <div className="col-span-2 flex items-center gap-1.5 truncate text-ink-500">
            <Home size={11} className="shrink-0 text-ink-300" />
            <span className="truncate">
              Owner: {unit.ownerName}
              {unit.ownerMobile ? ` · ${unit.ownerMobile}` : ""}
            </span>
          </div>
        )}
        {unit.emergencyMobile && (
          <div className="col-span-2 flex items-center gap-1.5 truncate text-ink-500">
            <Siren size={11} className="shrink-0 text-clay-600/60" />
            <span className="truncate">
              {unit.emergencyName || "Emergency"} · {unit.emergencyMobile}
            </span>
          </div>
        )}
        {(unit.vehicles || unit.parkingSlot) && (
          <div className="col-span-2 flex items-center gap-1.5 truncate text-ink-500">
            <Car size={11} className="shrink-0 text-ink-300" />
            <span className="truncate">
              {[unit.vehicles, unit.parkingSlot && `Slot ${unit.parkingSlot}`].filter(Boolean).join(" · ")}
            </span>
          </div>
        )}
        {unit.occupancy === "tenant" && unit.tenantEmergencyMobile && (
          <div className="col-span-2 flex items-center gap-1.5 truncate text-ink-500">
            <Siren size={11} className="shrink-0 text-marigold-600/70" />
            <span className="truncate">
              Tenant emg: {unit.tenantEmergencyName || "—"} · {unit.tenantEmergencyMobile}
            </span>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function FlatsSection() {
  const { units, defaultAmount } = useAppState();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | Occupancy>("all");
  const [form, setForm] = useState<{ unit: Unit | null } | null>(null);

  const stats = useMemo(() => {
    let members = 0;
    let rented = 0;
    let vacant = 0;
    for (const u of units) {
      members += u.members;
      if (u.occupancy === "tenant") rented++;
      if (u.occupancy === "vacant") vacant++;
    }
    return { members, rented, vacant };
  }, [units]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...units]
      .sort((a, b) => compareFlatLabels(a.label, b.label))
      .filter((u) => (filter === "all" ? true : u.occupancy === filter))
      .filter((u) =>
        q
          ? `${u.label} ${u.ownerName} ${u.tenantName} ${u.ownerMobile} ${u.tenantMobile} ${u.vehicles} ${u.parkingSlot} ${u.notes}`
              .toLowerCase()
              .includes(q)
          : true
      );
  }, [units, query, filter]);

  return (
    <section className="card animate-rise rise-2 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight text-ink-950">Flats & residents</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-500">
            {units.length === 0
              ? "Add each flat one by one with owner, tenant and emergency contact details."
              : `${units.length} flats · ${stats.members} residents · ${stats.rented} rented · ${stats.vacant} vacant`}
          </p>
        </div>
        <button onClick={() => setForm({ unit: null })} className="btn-primary">
          <Plus size={15} strokeWidth={2.6} /> Add flat
        </button>
      </div>

      {/* default amount */}
      <label className="mt-5 block w-full max-w-[260px]">
        <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
          Default monthly maintenance (₹)
        </span>
        <input
          key={defaultAmount}
          defaultValue={defaultAmount}
          inputMode="numeric"
          onBlur={(e) => {
            const v = Number(e.target.value.replace(/[^\d]/g, ""));
            if (isFinite(v) && v >= 0 && v !== defaultAmount) {
              setDefaultAmount(v);
              toast(`Default set to ${fmtINR(v)} / month`);
            }
          }}
          className="field tnum"
        />
        <span className="mt-1.5 block text-[11px] text-ink-400">Used for any flat without its own amount.</span>
      </label>

      {units.length > 0 && (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <div className="relative w-full flex-1 sm:min-w-[200px] sm:w-auto">
              <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search flat, resident, mobile, vehicle…"
                className="field pl-9!"
              />
            </div>
            {(["all", "owner", "tenant", "vacant"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold capitalize transition active:scale-[0.96]",
                  filter === f ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white text-ink-500 hover:text-ink-950"
                )}
              >
                {f === "all" ? "All" : f === "tenant" ? "Rented" : f}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 text-center text-[12.5px] text-ink-400">No flats match this search.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((u) => (
                <FlatCard key={u.id} unit={u} onEdit={() => setForm({ unit: u })} />
              ))}
            </div>
          )}
        </>
      )}

      {units.length === 0 && (
        <div className="mt-5 rounded-2xl border-2 border-dashed border-line-strong px-6 py-10 text-center">
          <Home size={22} className="mx-auto text-ink-300" />
          <p className="mt-3 text-[13.5px] font-semibold text-ink-900">No flats registered yet</p>
          <p className="mt-1 text-[12px] text-ink-500">Add your first flat to start collecting maintenance.</p>
        </div>
      )}

      {form && <FlatForm initial={form.unit} onClose={() => setForm(null)} />}
    </section>
  );
}
