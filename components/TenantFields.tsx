import { User, Phone, Mail, MapPin, Users, Siren, FileText, CalendarDays } from "lucide-react";
import type { Unit } from "../types";

type TenantKeys = Pick<
  Unit,
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
>;

interface Props {
  value: TenantKeys;
  onChange: <K extends keyof TenantKeys>(key: K, v: TenantKeys[K]) => void;
  /** agreement reference is admin-maintained paperwork */
  showAgreement?: boolean;
}

const digits = (v: string) => v.replace(/[^\d+\-\s]/g, "").slice(0, 18);

function L({
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
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-ink-500">
        {Icon && <Icon size={11.5} />}
        {label}
        {optional && (
          <span className="rounded bg-white/70 px-1.5 py-0.5 text-[9px] font-bold tracking-normal text-ink-400">
            OPTIONAL
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

/** Tenant detail fields — mirrors the owner section, shared by admin & owner forms */
export default function TenantFields({ value, onChange, showAgreement = true }: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <L label="Tenant name" icon={User}>
        <input
          value={value.tenantName}
          onChange={(e) => onChange("tenantName", e.target.value)}
          placeholder="T. Rao"
          className="field"
        />
      </L>
      <L label="Tenant mobile" icon={Phone}>
        <input
          value={value.tenantMobile}
          onChange={(e) => onChange("tenantMobile", digits(e.target.value))}
          inputMode="tel"
          placeholder="98765 43210"
          className="field tnum"
        />
      </L>
      <L label="Tenant email" icon={Mail} optional>
        <input
          value={value.tenantEmail}
          onChange={(e) => onChange("tenantEmail", e.target.value)}
          type="email"
          placeholder="tenant@example.com"
          className="field"
        />
      </L>
      <L label="Permanent address" icon={MapPin} optional>
        <input
          value={value.tenantAddress}
          onChange={(e) => onChange("tenantAddress", e.target.value)}
          placeholder="Native / permanent address"
          className="field"
        />
      </L>
      <L label="People living here" icon={Users} optional>
        <input
          value={value.tenantMembers || ""}
          onChange={(e) => onChange("tenantMembers", Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
          inputMode="numeric"
          placeholder="3"
          className="field tnum"
        />
      </L>
      <L label="Tenancy from" icon={CalendarDays} optional>
        <input
          value={value.tenantFrom}
          onChange={(e) => onChange("tenantFrom", e.target.value)}
          type="date"
          className="field tnum"
        />
      </L>
      <L label="Family member names" icon={Users} optional className="sm:col-span-2">
        <input
          value={value.tenantFamilyMembers}
          onChange={(e) => onChange("tenantFamilyMembers", e.target.value)}
          placeholder="Comma separated — e.g. T. Rao, Meena Rao, Aditi Rao"
          className="field"
        />
      </L>

      <div className="sm:col-span-2">
        <p className="mb-2 flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-clay-600">
          <Siren size={11} /> Tenant emergency contact
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <L label="Contact name" icon={User}>
            <input
              value={value.tenantEmergencyName}
              onChange={(e) => onChange("tenantEmergencyName", e.target.value)}
              placeholder="Brother — Amit"
              className="field"
            />
          </L>
          <L label="Contact mobile" icon={Phone}>
            <input
              value={value.tenantEmergencyMobile}
              onChange={(e) => onChange("tenantEmergencyMobile", digits(e.target.value))}
              inputMode="tel"
              placeholder="98765 43210"
              className="field tnum"
            />
          </L>
        </div>
      </div>

      {showAgreement && (
        <L label="Agreement / police verification" icon={FileText} optional className="sm:col-span-2">
          <input
            value={value.tenantAgreement}
            onChange={(e) => onChange("tenantAgreement", e.target.value)}
            placeholder="11-month leave & licence · verification ref."
            className="field"
          />
        </L>
      )}
    </div>
  );
}
