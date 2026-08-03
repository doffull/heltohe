/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Client ID public PayPal (sandbox ou live). Fallback : "test". */
  readonly VITE_PAYPAL_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
