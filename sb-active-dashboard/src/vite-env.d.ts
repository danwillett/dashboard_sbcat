/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SHOW_VOLUME_PAGE: string;
  readonly VITE_SBCAT_API_URL?: string;
  readonly VITE_SBCAT_FEATURES_URL?: string;
  /** When "true", Vite proxies /sbcat-api to the local Function App. */
  readonly VITE_USE_LOCAL_API?: string;
  /** Override local Function App base (default http://localhost:7071). */
  readonly VITE_LOCAL_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
