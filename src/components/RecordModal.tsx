import { useMemo, useState } from "react";
import { X, Check, IndianRupee } from "lucide-react";
import { CATEGORIES, PAYMENT_MODES } from "../lib/categories";
import { addRecord, updateRecord } from "../lib/store";
import { todayISO, uid } from "../lib/format";
import { toast } from "../lib/toaster";
import { cn } from "../utils/cn";
import Modal, { ModalBody } from "./Modal";
import type { MaintenanceRecord, PaymentMode } from "../types";

interface Props {
  initial?: MaintenanceRecord | null;
  onClose: () => void;
}

export default function RecordModal({ initial, onClose }: Props) {
  const editing = Boolean(initial);
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [category, setCategory] = useState(initial?.category ?? "plumbing");
  const [categoryDetail, setCategoryDetail] = useState(initial?.categoryDetail ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [vendor, setVendor] = useState(initial?.vendor ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [status, setStatus] = useState<"paid" | "pending">(initial?.status ?? "paid");
  const [payment, setPayment] = useState<PaymentMode>(initial?.payment ?? "UPI");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const amountNum = useMemo(() => Number(amount.replace(/,/g, "")), [amount]);
  const valid = description.trim().length > 1 && isFinite(amountNum) && amountNum > 0 && Boolean(date);

  function save() {
    if (!valid) return;
    if (editing && initial) {
      updateRecord(initial.id, {
        date,
        category,
        categoryDetail: category === "other" ? categoryDetail.trim() : "",
        description: description.trim(),
        vendor: vendor.trim(),
        amount: amountNum,
        status,
        payment: status === "paid" ? payment : "",
        notes: notes.trim(),
      });
      toast("Record updated");
    } else {
      addRecord({
        id: uid(),
        date,
        category,
        categoryDetail: category === "other" ? categoryDetail.trim() : "",
        description: description.trim(),
        vendor: vendor.trim(),
        amount: amountNum,
        status,
        payment: status === "paid" ? payment : "",
        notes: notes.trim(),
        createdAt: Date.now(),
      });
      toast("Record added");
    }
    onClose();
  }

  return (
    <Modal onClose={onClose} size="md">
      <>
          {/* header */}
          <div className="pine-texture relative shrink-0 px-5 py-4 sm:px-6 sm:py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[20px] font-semibold tracking-tight text-white">
                  {editing ? "Edit entry" : "New maintenance entry"}
                </h2>
                <p className="mt-0.5 text-[12px] text-white/45">
                  {editing ? "Update the details below" : "Log a repair, AMC or society expense"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl border border-white/10 bg-white/[0.06] text-white/60 transition hover:bg-white/[0.12] hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* amount input */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 focus-within:border-marigold-500/60">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-marigold-500/15 text-marigold-500">
                <IndianRupee size={16} strokeWidth={2.4} />
              </span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                placeholder="0"
                autoFocus
                className="tnum w-full bg-transparent font-display text-[26px] font-semibold tracking-tight text-white outline-none placeholder:text-white/20"
              />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/30">INR</span>
            </div>
          </div>

          <ModalBody className="space-y-5">
            {/* description + date */}
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Work done *</span>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Lift AMC — quarterly service"
                  className="field"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Date *</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field tnum" />
              </label>
            </div>

            {/* category chips */}
            <div>
              <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Category</span>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((c) => {
                  const active = category === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition active:scale-[0.96]",
                        active
                          ? "border-ink-900 bg-ink-900 text-white shadow-sm"
                          : "border-line bg-white text-ink-500 hover:border-line-strong hover:text-ink-950"
                      )}
                    >
                      <c.icon size={13} strokeWidth={2.3} style={{ color: active ? "#f5d9a8" : c.color }} />
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {category === "other" && (
                <label className="animate-rise mt-3 block">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">
                    Specify category
                    <span className="rounded bg-paper px-1.5 py-0.5 text-[9.5px] font-bold tracking-normal text-ink-400">
                      OPTIONAL
                    </span>
                  </span>
                  <input
                    value={categoryDetail}
                    onChange={(e) => setCategoryDetail(e.target.value)}
                    placeholder="e.g. Borewell desilting, Society audit fee…"
                    className="field"
                  />
                </label>
              )}
            </div>

            {/* vendor + status */}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Vendor / contractor</span>
                <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="e.g. Otis Elevator Co." className="field" />
              </label>
              <div>
                <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Payment status</span>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-line bg-white">
                  {(["paid", "pending"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold capitalize transition",
                        status === s
                          ? s === "paid"
                            ? "bg-leaf-600 text-white"
                            : "bg-clay-600 text-white"
                          : "text-ink-500 hover:bg-paper"
                      )}
                    >
                      {status === s && <Check size={14} strokeWidth={3} />}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* payment mode + notes */}
            {status === "paid" && (
              <div className="grid gap-2">
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Paid via</span>
                <div className="flex flex-wrap gap-1.5">
                  {PAYMENT_MODES.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayment(m)}
                      className={cn(
                        "rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition active:scale-[0.96]",
                        payment === m ? "border-marigold-500 bg-marigold-100 text-marigold-600" : "border-line bg-white text-ink-500 hover:text-ink-950"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-500">Notes</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Warranty, cheque number, flat reference…"
                className="field resize-none"
              />
            </label>
          </ModalBody>

          {/* footer */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-line bg-paper/60 px-4 py-3 sm:px-6 sm:py-4">
            <p className="text-[11.5px] text-ink-400">{valid ? "Ready to save" : "Description and amount required"}</p>
            <div className="flex gap-2">
              <button onClick={onClose} className="btn-ghost">
                Cancel
              </button>
              <button onClick={save} disabled={!valid} className="btn-primary">
                <Check size={16} strokeWidth={2.6} /> {editing ? "Save changes" : "Add record"}
              </button>
            </div>
          </div>
      </>
    </Modal>
  );
}
