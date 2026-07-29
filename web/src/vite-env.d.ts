/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the CloudCertify API. Unset falls back to production, so the
   * app runs with no setup; set it to `http://localhost:8080` in `.env.local`
   * to develop against a local API (see `.env.example`).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
