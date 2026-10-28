/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL da API. Sem ela, o app usa o servidor do Render. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
