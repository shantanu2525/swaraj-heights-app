import { useMemo, useState } from "react";
import { X, Check, Home, User, UserCheck, Phone, Mail, Siren, Car, SquareParking, IndianRupee, Users, DoorOpen } from "lucide-react";
import { useAppState, upsertUnit, buildLabel, labelTaken, blankUnit } from "../lib/store";
import { fmtINR } from "../lib/format";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import type { Occupancy, Unit } from "../types";
import TenantFields from "./TenantFields";
import Modal, { ModalBody } from "./Modal";

interface Props {
  /** null → add a new flat */
  initial?: Unit | null;
  onClose: () => void;
}

const OCCUPANCY: { id: Occupancy; label: string; hint: string; icon: typeof User }[] = [
  { id: "owner", label: "Owner occupied", hint: "Owner lives here", icon: User },
  { id: "tenant", label: "Rented out", hint: "Tenant lives here", icon: UserCheck },
  { id: "vacant", label: "Vacant", hint: "Nobody living here", icon: DoorOpen },
];

function Field({
  label,
  icon: Icon,
  optional,
  children,
  className,
}: {
  label: string;
  icon?: typeof User;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
        {Icon && <Icon size={11.5} />}
        {label}
        {optional && <span className="rounded bg-paper px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-ink-400">OPTIONAL</span>}
      </span>
      {children}
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper/50 p-4">
      <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{title}</p>
      {children}
    </div>
  );
}

const digits = (v: string) => v.replace(/[^\d+\-\s]/g, "").slice(0, 18);

export default function FlatForm({ initial, onClose }: Props) {
  const editing = Boolean(initial);
  const { defaultAmount } = useAppState();
  const [u, setU] = useState<Unit>(() => initial ?? blankUnit());

  const set = <K extends keyof Unit>(key: K, value: Unit[K]) => setU((prev) => ({ ...prev, [key]: value }));

  const label = useMemo(() => buildLabel(u.wing, u.flatNo), [u.wing, u.flatNo]);
  const duplicate = Boolean(u.flatNo.trim()) && labelTaken(label, initial?.id);
  const valid = Boolean(u.flatNo.trim()) && !duplicate;

  function save() {
    if (!valid) return;
    upsertUnit({ ...u, label });
    toast(editing ? `${label} updated` : `${label} added to the register`);
    onClose();
  }

  return (
    <Modal onClose={onClose} size="lg" layer={80}>
      <>
          {/* header */}
          <div className="pine-texture shrink-0 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-marigold-500">
                  {editing ? "Edit flat" : "Add flat"}
                </p>
                <h2 className="font-display mt-1 text-[22px] font-semibold tracking-tight text-white">
                  {label || "New flat"}
                </h2>
                <p className="mt-0.5 text-[12px] text-white/45">Resident register & monthly billing</p>
              </div>
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <ModalBody className="space-y-4">
            {/* identity */}
            <Group title="Flat identity">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Wing / Block" optional>
                  <input
                    value={u.wing}
                    onChange={(e) => set("wing", e.target.value.toUpperCase().slice(0, 4))}
                    placeholder="A"
                    className="field uppercase"
                  />
                </Field>
                <Field label="Flat no. *" icon={Home}>
                  <input
                    value={u.flatNo}
                    onChange={(e) => set("flatNo", e.target.value.toUpperCase().slice(0, 8))}
                    placeholder="101"
                    className={cn("field", duplicate && "border-clay-600! ring-4! ring-clay-600/10!")}
                  />
                </Field>
                <Field label="Floor">
                  <input
                    value={u.floor || ""}
                    onChange={(e) => set("floor", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                    inputMode="numeric"
                    placeholder="1"
                    className="field tnum"
                  />
                </Field>
                <Field label="Members" icon={Users}>
                  <input
                    value={u.members || ""}
                    onChange={(e) => set("members", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                    inputMode="numeric"
                    placeholder="4"
                    className="field tnum"
                  />
                </Field>
              </div>
              {duplicate ? (
                <p className="mt-2 text-[11.5px] font-semibold text-clay-600">Flat {label} already exists in the register.</p>
              ) : (
                label && <p className="mt-2 text-[11.5px] font-medium text-ink-400">Will be saved as <strong className="text-ink-700">{label}</strong></p>
              )}
            </Group>

            {/* occupancy */}
            <Group title="Occupancy">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {OCCUPANCY.map((o) => {
                  const active = u.occupancy === o.id;
                  return (
                    <button
                      key={o.id}
                      onClick={() => set("occupancy", o.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98]",
                        active ? "border-ink-900 bg-ink-900 text-white" : "border-line bg-white hover:border-line-strong"
                      )}
                    >
                      <o.icon size={15} className={active ? "text-marigold-500" : "text-ink-400"} />
                      <span className="leading-tight">
                        <span className={cn("block text-[12.5px] font-bold", active ? "text-white" : "text-ink-950")}>{o.label}</span>
                        <span className={cn("block text-[10.5px]", active ? "text-white/45" : "text-ink-400")}>{o.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Group>

            {/* owner */}
            <Group title="Owner details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Owner name" icon={User}>
                  <input value={u.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder="R. Sharma" className="field" />
                </Field>
                <Field label="Owner mobile — login ID" icon={Phone}>
                  <input value={u.ownerMobile} onChange={(e) => set("ownerMobile", digits(e.target.value))} inputMode="tel" placeholder="98765 43210" className="field tnum" />
                </Field>
                <Field label="Email" icon={Mail} optional>
                  <input value={u.ownerEmail} onChange={(e) => set("ownerEmail", e.target.value)} type="email" placeholder="owner@example.com" className="field" />
                </Field>
                <Field label={u.occupancy === "tenant" ? "Owner's current address" : "Alternate address"} optional>
                  <input value={u.ownerAddress} onChange={(e) => set("ownerAddress", e.target.value)} placeholder="Where the owner stays" className="field" />
                </Field>
                <Field label="Vehicle numbers" icon={Car} optional>
                  <input value={u.vehicles} onChange={(e) => set("vehicles", e.target.value)} placeholder="MH12 AB 1234" className="field" />
                </Field>
                <Field label="Parking slot — admin only" icon={SquareParking} optional>
                  <input value={u.parkingSlot} onChange={(e) => set("parkingSlot", e.target.value)} placeholder="P-14, Basement 2" className="field" />
                </Field>
                <Field label="Monthly maintenance" icon={IndianRupee} optional className="sm:col-span-2">
                  <input
                    value={u.amount || ""}
                    onChange={(e) => set("amount", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                    inputMode="numeric"
                    placeholder={`Default ${fmtINR(defaultAmount)}`}
                    className="field tnum"
                  />
                </Field>
              </div>
            </Group>

            {/* tenant — only when rented */}
            {u.occupancy === "tenant" && (
              <div className="animate-rise rounded-2xl border border-marigold-500/30 bg-marigold-50/70 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-marigold-600">
                  <UserCheck size={12} /> Tenant details
                </p>
                <TenantFields value={u} onChange={(k, v) => setU((prev) => ({ ...prev, [k]: v }))} />
              </div>
            )}

            {/* emergency + extras */}
            <Group title="Emergency contact & other details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Emergency contact name" icon={Siren} optional>
                  <input value={u.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Brother — Amit" className="field" />
                </Field>
                <Field label="Emergency mobile" icon={Phone} optional>
                  <input value={u.emergencyMobile} onChange={(e) => set("emergencyMobile", digits(e.target.value))} inputMode="tel" placeholder="98765 43210" className="field tnum" />
                </Field>
                <Field label="Family member names" icon={Users} optional className="sm:col-span-2">
                  <input
                    value={u.familyMembers}
                    onChange={(e) => set("familyMembers", e.target.value)}
                    placeholder="Rajesh Sharma, Sunita Sharma, Aarav Sharma"
                    className="field"
                  />
                </Field>
                <Field label="Notes" optional className="sm:col-span-2">
                  <input value={u.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Pet-friendly, senior citizen, society committee member…" className="field" />
                </Field>
              </div>
            </Group>
          </ModalBody>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/60 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-[11.5px] text-ink-400">{valid ? "Only flat number is required" : "Enter a unique flat number"}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">Cancel</button>
              <button onClick={save} disabled={!valid} className="btn-primary">
                <Check size={16} strokeWidth={2.6} /> {editing ? "Save changes" : "Add flat"}
              </button>
            </div>
          </div>
      </>
    </Modal>
  );
}
