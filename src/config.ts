/**
 * Global application configuration.
 *
 * The Google Sheet backend URL comes from an environment variable so the same
 * codebase can be deployed against different spreadsheets.
 *
 * Production (Vercel): Project -> Settings -> Environment Variables -> add
 * VITE_APPS_SCRIPT_URL for Production, then redeploy.
 *
 * Local development: copy `.env.example` to `.env` and set the same value.
 */
export const APPS_SCRIPT_WEB_APP_URL = (import.meta.env.VITE_APPS_SCRIPT_URL ?? "").trim();

/** True only when a real deployed /exec URL has been configured. */
export const HAS_CONFIGURED_BACKEND =
  /^https:\/\/script\.google(?:usercontent)?\.com\/.*\/exec$/.test(APPS_SCRIPT_WEB_APP_URL);

/** Human-readable hint shown when the backend isn't configured. */
export const BACKEND_CONFIG_HINT =
  "Set VITE_APPS_SCRIPT_URL in Vercel Settings -> Environment Variables for Production, then redeploy.";
