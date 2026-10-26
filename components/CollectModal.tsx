import { useState } from "react";
import { X, Check, IndianRupee, Trash2, Receipt, FileDown, BadgeCheck } from "lucide-react";
import { PAYMENT_MODES } from "../lib/categories";
import { collectPayment, removePayment, paymentFor, unitAmount, occupantName } from "../lib/store";
import { monthLongLabel, todayISO, uid, fmtDate, formatReceiptNo } from "../lib/format";
import { downloadReceiptPdf } from "../lib/receipt";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import Modal, { ModalBody } from "./Modal";
import type { Payment, PaymentMode, Unit } from "../types";

interface Props {
  unit: Unit;
  month: string;
  onClose: () => void;
}

export default function CollectModal({ unit, month, onClose }: Props) {
  const initial = paymentFor(unit.id, month);

  const [paymentId] = useState(() => initial?.id ?? uid());
  const [saved, setSaved] = useState<Payment | null>(initial ?? null);
  const [createdAt] = useState(() => initial?.createdAt ?? Date.now());
  const [amount, setAmount] = useState(String(initial?.amount ?? unitAmount(unit)));
  const [paidOn, setPaidOn] = useState(initial?.paidOn ?? todayISO());
  const [mode, setMode] = useState<PaymentMode>(initial?.mode || "UPI");
  // Auto-issued once per entry (month + flat number) and never edited by hand
  const [receipt] = useState(() => initial?.receipt || formatReceiptNo(month, unit.label));
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [confirmUnpay, setConfirmUnpay] = useState(false);

  const amountNum = Number(amount.replace(/,/g, ""));
  const valid = isFinite(amountNum) && amountNum > 0 && Boolean(paidOn);

  function buildPayment(): Payment {
    return {
      id: paymentId,
      unitId: unit.id,
      flat: unit.label,
      month,
      amount: Math.round(amountNum),
      paidOn,
      mode,
      receipt,
      notes: notes.trim(),
      createdAt,
    };
  }

  function save() {
    if (!valid) return;
    const p = buildPayment();
    collectPayment(p);
    setSaved(p);
    setConfirmUnpay(false);
    toast(saved ? "Collection updated" : `${unit.label} marked paid — ${monthLongLabel(month)}`);
  }

  function download() {
    if (!valid) return;
    downloadReceiptPdf(buildPayment(), unit);
    toast("Receipt PDF downloaded");
  }

  function unpay() {
    removePayment(paymentId);
    setSaved(null);
    setConfirmUnpay(false);
    toast(`${unit.label} marked unpaid`, "info");
  }

  return (
    <Modal onClose={onClose} size="sm">
      <>
          {/* header */}
          <div className="pine-texture shrink-0 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-marigold-500">
                  {saved ? "Edit collection" : "Collect maintenance"}
                </p>
                <h2 className="font-display mt-1 text-[24px] font-semibold tracking-tight text-white">{unit.label}</h2>
                <p className="mt-0.5 text-[12px] text-white/45">
                  {occupantName(unit) || "No resident name"} · {monthLongLabel(month)}
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 focus-within:border-marigold-500/60">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-marigold-500/15 text-marigold-500">
                <IndianRupee size={16} strokeWidth={2.4} />
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                autoFocus
                className="tnum w-full bg-transparent font-display text-[24px] font-semibold tracking-tight text-white outline-none placeholder:text-white/20"
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">INR</span>
            </div>
          </div>

          <ModalBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Paid on</span>
                <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="field tnum" />
              </label>
              <div className="block">
                <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                  Receipt no.
                  <span className="rounded bg-paper px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal text-ink-400">AUTO</span>
                </span>
                <div className="relative" title="Receipt numbers are issued automatically and cannot be edited">
                  <Receipt size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <p className="tnum w-full cursor-default select-all truncate rounded-xl border border-line bg-paper/70 py-2.5 pl-9 pr-3 font-mono text-[12.5px] font-semibold text-ink-700">
                    {receipt}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Paid via</span>
              <div className="flex flex-wrap gap-1.5">
                {PAYMENT_MODES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.96]",
                      mode === m ? "border-marigold-500 bg-marigold-100 text-marigold-600" : "border-line bg-white text-ink-500 hover:text-ink-950"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Notes</span>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. includes July arrears"
                className="field"
              />
            </label>

            {saved && (
              <div className="flex items-center gap-2.5 rounded-xl border border-leaf-600/25 bg-leaf-100/50 px-3.5 py-2.5">
                <BadgeCheck size={15} className="shrink-0 text-leaf-700" />
                <p className="text-[12px] font-semibold text-leaf-700">
                  Collected on {fmtDate(paidOn)}
                  {receipt ? ` · ${receipt}` : ""} — receipt PDF ready below
                </p>
              </div>
            )}
          </ModalBody>

          {/* footer */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-4 py-3 sm:px-6 sm:py-4">
            {saved &&
              (confirmUnpay ? (
                <button onClick={unpay} className="btn-danger">
                  <Trash2 size={14} /> Confirm unpaid
                </button>
              ) : (
                <button
                  onClick={() => {
                    setConfirmUnpay(true);
                    setTimeout(() => setConfirmUnpay(false), 3500);
                  }}
                  className="btn-ghost text-clay-600! hover:bg-clay-100/60!"
                >
                  <Trash2 size={14} /> Mark unpaid
                </button>
              ))}

            <div className="ml-auto flex w-full flex-wrap justify-end gap-2 sm:w-auto">
              {saved && (
                <button onClick={download} disabled={!valid} className="btn-ghost" title="Download this collection as a PDF receipt">
                  <FileDown size={15} /> Receipt PDF
                </button>
              )}
              <button onClick={onClose} className="btn-ghost">
                {saved ? "Done" : "Cancel"}
              </button>
              <button onClick={save} disabled={!valid} className="btn-primary">
                <Check size={16} strokeWidth={2.6} /> {saved ? "Save changes" : "Mark collected"}
              </button>
            </div>
          </div>
      </>
    </Modal>
  );
}
