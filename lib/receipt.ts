import { jsPDF } from "jspdf";
import type { Payment, Unit } from "../types";
import { fmtDate, fmtDateTime, monthLongLabel, normalizeMonthKey, compareFlatLabels } from "./format";
import { getState, occupantName } from "./store";

/* ------------------------- helpers ------------------------- */

/** 12345678 → "1,23,45,678" (Indian digit grouping; core PDF fonts lack the ₹ glyph) */
function inrDigits(n: number): string {
  const s = String(Math.round(Math.abs(n)));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3;
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below100(n: number): string {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}
function below1000(n: number): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(ONES[h] + " Hundred");
  if (r) parts.push(below100(r));
  return parts.join(" ");
}

/** 3500 → "Rupees Three Thousand Five Hundred Only" */
export function amountInWords(amount: number): string {
  let n = Math.round(Math.abs(amount));
  if (n === 0) return "Rupees Zero Only";
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thou = Math.floor(n / 1e3);
  const rest = n % 1e3;
  const parts: string[] = [];
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh) parts.push(below1000(lakh) + " Lakh");
  if (thou) parts.push(below1000(thou) + " Thousand");
  if (rest) parts.push(below1000(rest));
  return "Rupees " + parts.join(" ") + " Only";
}

/* ------------------------- palette ------------------------- */

const PINE: [number, number, number] = [13, 31, 23];
const PINE_SOFT: [number, number, number] = [28, 56, 44];
const INK: [number, number, number] = [23, 48, 37];
const MUTED: [number, number, number] = [122, 131, 118];
const LINE: [number, number, number] = [212, 205, 180];
const PAPER: [number, number, number] = [247, 244, 234];
const GOLD: [number, number, number] = [217, 138, 18];
const LEAF: [number, number, number] = [34, 101, 63];
const LEAF_PALE: [number, number, number] = [222, 238, 228];
const WHITE: [number, number, number] = [255, 255, 255];
const BAND_TEXT: [number, number, number] = [203, 216, 204];

/* ------------------------- receipt drawing ------------------------- */

function drawReceipt(doc: jsPDF, p: Payment, unit: Unit | undefined) {
  const W = doc.internal.pageSize.getWidth(); // 210 (A5 landscape)
  const H = doc.internal.pageSize.getHeight(); // 148
  const M = 6;
  const meta = getState().meta;
  const societyName = meta.name.trim() || "Building Maintenance Account";

  /* card frame + header band */
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.roundedRect(M, M, W - 2 * M, H - 2 * M, 3, 3, "S");
  doc.setFillColor(...PINE);
  doc.rect(M, M, W - 2 * M, 21, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(M, M + 21, W - M, M + 21);

  /* band: society identity */
  doc.setTextColor(...WHITE);
  doc.setFont("times", "bold");
  doc.setFontSize(14);
  const nameLines = doc.splitTextToSize(societyName, 108) as string[];
  doc.text(nameLines[0], 13, M + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BAND_TEXT);
  const contact = [meta.address.trim(), meta.phone.trim()].filter(Boolean).join("  ·  ");
  if (contact) doc.text(doc.splitTextToSize(contact, 112)[0] as string, 13, M + 15.5);

  /* band: receipt title + number */
  doc.setTextColor(...GOLD);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.text("MAINTENANCE RECEIPT", W - 13, M + 8.5, { align: "right" });
  doc.setTextColor(...WHITE);
  doc.setFont("courier", "bold");
  doc.setFontSize(8.5);
  doc.text(p.receipt || "—", W - 13, M + 14.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BAND_TEXT);
  doc.text("RECEIPT NO.", W - 13, M + 18.2, { align: "right" });

  /* meta row: received from / date / month */
  let y = M + 31;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("RECEIVED FROM", 13, y);
  doc.text("DATE OF PAYMENT", W - 70, y);
  doc.text("FOR THE MONTH", W - 70, y + 9.5);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(doc.splitTextToSize((unit ? occupantName(unit).trim() : "") || "—", 105)[0] as string, 13, y + 5.2);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...PINE_SOFT);
  const occLine =
    unit && unit.occupancy === "tenant"
      ? `Flat No. ${p.flat}  ·  Tenant${unit.ownerName ? `  ·  Owner: ${unit.ownerName}` : ""}`
      : `Flat No. ${p.flat}${unit && unit.occupancy === "owner" ? "  ·  Owner" : ""}`;
  doc.text((doc.splitTextToSize(occLine, 105) as string[])[0], 13, y + 10.6);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(fmtDate(p.paidOn), W - 70, y + 5.2);
  doc.text(monthLongLabel(normalizeMonthKey(p.month)), W - 70, y + 14.7);

  /* particulars box */
  const boxY = y + 17;
  const boxH = 30;
  doc.setFillColor(...PAPER);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.4);
  doc.roundedRect(12, boxY, W - 24, boxH, 2, 2, "FD");

  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("PARTICULARS", 17, boxY + 6);
  doc.text("AMOUNT", W - 17, boxY + 6, { align: "right" });
  doc.setDrawColor(...LINE);
  doc.line(14, boxY + 8.5, W - 14, boxY + 8.5);

  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.text(`Society maintenance charges — ${monthLongLabel(normalizeMonthKey(p.month))}`, 17, boxY + 15.5);
  doc.text(`Rs. ${inrDigits(p.amount)}/-`, W - 17, boxY + 15.5, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...PINE_SOFT);
  const modeLine = `Paid via ${p.mode || "—"}${p.notes ? `   ·   ${p.notes}` : ""}`;
  doc.text((doc.splitTextToSize(modeLine, 118) as string[])[0], 17, boxY + 21.5);

  /* total strip */
  doc.setDrawColor(...LINE);
  doc.line(14, boxY + 24.5, W - 14, boxY + 24.5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("TOTAL", 17, boxY + boxH - 2.2);
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  doc.text(`Rs. ${inrDigits(p.amount)}/-`, W - 17, boxY + boxH - 2.2, { align: "right" });

  /* amount in words */
  const wordsY = boxY + boxH + 8;
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("AMOUNT IN WORDS", 13, wordsY);
  doc.setFont("times", "italic");
  doc.setFontSize(9.5);
  doc.setTextColor(...INK);
  const words = doc.splitTextToSize(amountInWords(p.amount), 84) as string[];
  doc.text(words.slice(0, 2), 13, wordsY + 5);

  /* PAID stamp */
  const sx = 104;
  const sy = wordsY - 4;
  doc.setFillColor(...LEAF_PALE);
  doc.setDrawColor(...LEAF);
  doc.setLineWidth(0.7);
  doc.roundedRect(sx, sy, 32, 11, 2, 2, "FD");
  doc.setTextColor(...LEAF);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("PAID", sx + 16, sy + 7.3, { align: "center" });

  /* total figure beside stamp */
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text("TOTAL RECEIVED", W - 13, sy + 2, { align: "right" });
  doc.setTextColor(...LEAF);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(`Rs. ${inrDigits(p.amount)}/-`, W - 13, sy + 9.5, { align: "right" });

  /* footer */
  const footY = H - 17;
  doc.setDrawColor(...LINE);
  doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(M + 2, footY, W - M - 2, footY);
  doc.setLineDashPattern([], 0);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("This is a computer-generated receipt and is valid without a physical signature.", 13, footY + 5);
  doc.setFont("helvetica", "normal");
  doc.text(`Generated on ${fmtDateTime(Date.now())} · Maintenance Khata`, 13, footY + 9.5);

  doc.setDrawColor(...PINE_SOFT);
  doc.setLineWidth(0.4);
  doc.line(W - 62, footY + 5, W - 14, footY + 5);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK);
  doc.text("Authorised Signatory / Treasurer", W - 38, footY + 9.5, { align: "center" });
}

function safeFilename(s: string): string {
  return s.replace(/[^A-Za-z0-9-_]/g, "-").replace(/-+/g, "-");
}

/* ------------------------- public API ------------------------- */

/** Download a single A5-lanscape receipt PDF */
export function downloadReceiptPdf(payment: Payment, unit?: Unit) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5", compress: true });
  drawReceipt(doc, payment, unit);
  const name = payment.receipt
    ? safeFilename(`${payment.receipt}-${payment.flat}-${payment.month}`)
    : safeFilename(`receipt-${payment.flat}-${payment.month}`);
  doc.save(`${name}.pdf`);
}

/** One PDF, one page per collected flat — sorted by flat label */
export function downloadBulkReceiptsPdf(payments: Payment[], unitsById: Map<string, Unit>, month: string) {
  if (payments.length === 0) return;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a5", compress: true });
  const sorted = [...payments].sort((a, b) => compareFlatLabels(a.flat, b.flat));
  sorted.forEach((p, i) => {
    if (i > 0) doc.addPage("a5", "landscape");
    drawReceipt(doc, p, unitsById.get(p.unitId));
  });
  doc.save(`maintenance-receipts-${normalizeMonthKey(month)}.pdf`);
}
