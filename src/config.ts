/**
 * Global application configuration.
 *
 * Paste the deployed Google Apps Script Web App URL below, then rebuild and
 * deploy the website once. Every phone, tablet and computer that opens that
 * deployment will automatically use the same Google Sheet backend.
 *
 * Required format:
 * https://script.google.com/macros/s/XXXXXXXXXXXX/exec
 */
export const APPS_SCRIPT_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbxcAmKPmcPte9jGG8zH14nXfyV2TQWkzjRBNXy2TIF9yVhzyKch0HbnOYbp5jIj6eCyyA/exec";

/** True only when a real deployed /exec URL has been configured. */
export const HAS_CONFIGURED_BACKEND =
  /^https:\/\/script\.google(?:usercontent)?\.com\/.*\/exec$/.test(APPS_SCRIPT_WEB_APP_URL.trim());