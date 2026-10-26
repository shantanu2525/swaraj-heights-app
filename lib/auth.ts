import type { Session } from "../types";

/**
 * Passwords are never stored — only a salted SHA-256 digest ("salt$hex"),
 * which is what gets synced to the Google Sheet.
 */

const SESSION_KEY = "khata.session.v2";

export function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session & { as?: string };
    // Invalidate sessions created by the removed tenant-login feature.
    if (parsed.as === "tenant") {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const s: Session = { role: parsed.role, unitId: parsed.unitId, mobile: parsed.mobile };
    return s && (s.role === "admin" || s.role === "owner") ? s : null;
  } catch {
    return null;
  }
}

export function writeSession(s: Session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

async function sha256Hex(text: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback for non-secure contexts (file://) — keeps the lock usable.
  const cyrb = (str: string, seed: number) => {
    let h1 = 0xdeadbeef ^ seed;
    let h2 = 0x41c6ce57 ^ seed;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  };
  return cyrb(text, 7) + cyrb(text, 1013904223);
}

function makeSalt(): string {
  const bytes = new Uint8Array(8);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < 8; i++) bytes[i] = Math.floor(Math.random() * 256);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** → "salt$hash" for storage */
export async function passwordRecord(password: string): Promise<string> {
  const salt = makeSalt();
  return `${salt}$${await sha256Hex(`${salt}::${password}`)}`;
}

/** check a typed password against a stored "salt$hash" record */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const i = stored.indexOf("$");
  if (i < 0) return false;
  const salt = stored.slice(0, i);
  const hash = stored.slice(i + 1);
  return (await sha256Hex(`${salt}::${password}`)) === hash;
}

/** keep only digits so "+91 98765 43210" matches "9876543210" */
export function normalizeMobile(v: string): string {
  const d = v.replace(/\D/g, "");
  return d.length > 10 ? d.slice(-10) : d;
}
