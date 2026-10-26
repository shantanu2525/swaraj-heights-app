/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Apps Script Web App URL (from .env → VITE_APPS_SCRIPT_URL) */
  readonly VITE_APPS_SCRIPT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
