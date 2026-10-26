/**
 * Global application configuration.
 *
 * The Google Sheet backend URL comes from an environment variable so the same
 * codebase can be deployed against different spreadsheets.
 *
 * ── How to configure ────────────────────────────────────────────────────
 *  1. Copy `.env.example` to `.env`
 *  2. Set VITE_APPS_SCRIPT_URL to your deployed Apps Script Web App URL
 *     (it must end with /exec)
 *  3. Rebuild — every device that opens the deployment connects to the
 *     same Google Sheet automatically.
 *
 * For production hosting (Vercel, Netlify, etc.) add the same variable in
 * the project's environment settings — no `.env` file is needed there.
 */
export const APPS_SCRIPT_WEB_APP_URL = (import.meta.env.VITE_APPS_SCRIPT_URL ?? "").trim();

/** True only when a real deployed /exec URL has been configured. */
export const HAS_CONFIGURED_BACKEND =
  /^https:\/\/script\.google(?:usercontent)?\.com\/.*\/exec$/.test(APPS_SCRIPT_WEB_APP_URL);

/** Human-readable hint shown when the backend isn't configured. */
export const BACKEND_CONFIG_HINT = "Set VITE_APPS_SCRIPT_URL in your environment (or .env) and rebuild.";
